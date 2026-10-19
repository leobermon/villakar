import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentLinkStatus,
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { SettingsService } from '../settings/settings.service';
import { PaypalService } from './paypal.service';

/** Stripe exige al menos 30 minutos de vida para una sesión de Checkout. */
const SESSION_TTL_SECONDS = 30 * 60;

/** Lo que ve el cliente en la página /pay/<token> (sin correo ni teléfono). */
export interface PublicPaymentLink {
  token: string;
  description: string;
  amount: number;
  currency: 'USD';
  customerName: string;
  /** Código de la reserva a la que abona, si el link es de una orden. */
  reservationCode: string | null;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  paidAt: string | null;
  methods: { card: boolean; paypal: boolean };
}

export interface PaymentLinkResult {
  token: string;
  paid: boolean;
  message?: string;
}

/**
 * Cobro de los links de pago que genera el equipo desde el panel. El cliente abre
 * /pay/<token> y paga con tarjeta (Stripe Checkout) o PayPal; al confirmarse el cobro el
 * link queda PAGADO y, si era de una orden, se registra el pago en esa orden.
 */
@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);
  private readonly stripeClient: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly paypal: PaypalService,
    private readonly emails: ReservationEmailsService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripeClient = secretKey ? new Stripe(secretKey) : null;
  }

  // ---------------- Consulta pública ----------------

  async get(token: string): Promise<PublicPaymentLink> {
    const link = await this.find(token);
    const enabled = await this.settings.get('payments');
    return {
      token: link.token,
      description: link.description,
      amount: link.amount.toNumber(),
      currency: 'USD',
      customerName: link.customerName,
      reservationCode: link.reservation?.code ?? null,
      status: effectiveStatus(link),
      expiresAt: link.expiresAt.toISOString(),
      paidAt: link.paidAt ? link.paidAt.toISOString() : null,
      methods: {
        card: enabled.cardEnabled && this.stripeClient !== null,
        paypal: enabled.paypalEnabled && this.paypal.isConfigured,
      },
    };
  }

  // ---------------- Stripe ----------------

  async startStripe(token: string): Promise<{ url: string }> {
    if (!this.stripeClient) throw new ServiceUnavailableException('Card payments are not available right now.');
    const link = await this.findPayable(token, 'card');
    const site = this.siteUrl();

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripeClient.checkout.sessions.create({
        mode: 'payment',
        customer_email: link.customerEmail ?? undefined,
        client_reference_id: link.token,
        metadata: { paymentLinkToken: link.token },
        payment_intent_data: {
          description: link.description.slice(0, 250),
          metadata: { paymentLinkToken: link.token },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: link.amount.mul(100).toDecimalPlaces(0).toNumber(),
              product_data: { name: link.description.slice(0, 120) },
            },
          },
        ],
        success_url: `${site}/pay/${link.token}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/pay/${link.token}?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      });
    } catch (error) {
      this.logger.error(`Stripe checkout session failed for payment link ${link.token}: ${String(error)}`);
      throw new ServiceUnavailableException('Card payments are temporarily unavailable. Please try again or use PayPal.');
    }

    await this.prisma.paymentLink.update({
      where: { id: link.id },
      data: { provider: PaymentProvider.STRIPE, providerPaymentId: session.id },
    });
    return { url: session.url! };
  }

  /** Al volver de Stripe: se consulta la sesión directamente (no depende del webhook). */
  async confirmStripe(sessionId: string): Promise<PaymentLinkResult> {
    if (!this.stripeClient) throw new ServiceUnavailableException('Card payments are not available right now.');
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripeClient.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError) throw new BadRequestException('Unknown payment session');
      this.logger.error(`Stripe session retrieve failed: ${String(error)}`);
      throw new ServiceUnavailableException('We could not verify your payment yet. Please refresh in a moment.');
    }
    return this.settleStripeSession(session);
  }

  /** Lo usan el regreso del cliente y el webhook de Stripe (ver StripeService). */
  async settleStripeSession(session: Stripe.Checkout.Session): Promise<PaymentLinkResult> {
    const token = session.metadata?.paymentLinkToken ?? session.client_reference_id ?? '';
    if (!token) throw new BadRequestException('Unknown payment session');
    if (session.payment_status !== 'paid') return { token, paid: false };

    await this.settle(token, PaymentProvider.STRIPE, session.id, {
      amount: new Prisma.Decimal(session.amount_total ?? 0).div(100),
      currency: session.currency ?? 'usd',
      payload: {
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      },
    });
    return { token, paid: true };
  }

  // ---------------- PayPal ----------------

  async startPaypal(token: string): Promise<{ approveUrl: string }> {
    const link = await this.findPayable(token, 'paypal');
    const site = this.siteUrl();
    const order = await this.paypal.createOrderFor({
      referenceId: link.token,
      description: link.description,
      amount: link.amount,
      returnUrl: `${site}/pay/${link.token}?paypal=return`,
      cancelUrl: `${site}/pay/${link.token}?payment=cancelled`,
    });
    await this.prisma.paymentLink.update({
      where: { id: link.id },
      data: { provider: PaymentProvider.PAYPAL, providerPaymentId: order.orderId },
    });
    return { approveUrl: order.approveUrl };
  }

  async capturePaypal(orderId: string): Promise<PaymentLinkResult> {
    const result = await this.paypal.captureFor(orderId);
    const token = result.referenceId;
    if (result.status === 'paid' && result.amount && result.currency) {
      await this.settle(token, PaymentProvider.PAYPAL, orderId, {
        amount: result.amount,
        currency: result.currency,
        payload: { orderId, captureId: result.captureId ?? null },
      });
      return { token, paid: true };
    }
    return { token, paid: false, message: result.message };
  }

  // ---------------- Registro del cobro ----------------

  /**
   * Deja el link como PAGADO (idempotente) y, si era de una orden, registra el pago en ella.
   * Si con este pago la orden queda pagada completa, se confirma y se envía el correo.
   */
  private async settle(
    token: string,
    provider: PaymentProvider,
    providerPaymentId: string,
    charge: { amount: Prisma.Decimal; currency: string; payload: Prisma.InputJsonObject },
  ): Promise<void> {
    const confirmedReservation = await this.prisma.$transaction(async (tx) => {
      const link = await tx.paymentLink.findUnique({ where: { token } });
      if (!link) throw new NotFoundException('Payment link not found');

      // Reclamo atómico: el webhook y el regreso del cliente pueden llegar a la vez.
      const claimed = await tx.paymentLink.updateMany({
        where: { id: link.id, status: { not: PaymentLinkStatus.PAID } },
        data: { status: PaymentLinkStatus.PAID, paidAt: new Date(), provider, providerPaymentId },
      });
      if (claimed.count === 0) return null;

      if (!charge.amount.equals(link.amount) || charge.currency.toUpperCase() !== link.currency) {
        this.logger.error(
          `Payment link ${token}: ${provider} charged ${charge.amount.toString()} ${charge.currency}, expected ${link.amount.toString()} ${link.currency}`,
        );
      }
      if (link.status === PaymentLinkStatus.CANCELLED) {
        this.logger.warn(`Payment link ${token} was cancelled but received a ${provider} payment: review.`);
      }
      if (link.reservationId === null) return null;

      await tx.payment.create({
        data: {
          reservationId: link.reservationId,
          provider,
          providerPaymentId,
          type: PaymentType.CHARGE,
          amount: charge.amount,
          currency: link.currency,
          status: PaymentRecordStatus.SUCCEEDED,
          paidAt: new Date(),
          note: 'Payment link',
          providerPayload: charge.payload,
        },
      });

      const reservation = await tx.reservation.findUniqueOrThrow({ where: { id: link.reservationId } });
      const totals = await tx.payment.groupBy({
        by: ['type'],
        where: { reservationId: reservation.id, status: PaymentRecordStatus.SUCCEEDED },
        _sum: { amount: true },
      });
      const sum = (type: PaymentType) => totals.find((row) => row.type === type)?._sum.amount ?? new Prisma.Decimal(0);
      const paid = sum(PaymentType.CHARGE).minus(sum(PaymentType.REFUND));
      if (paid.lessThan(reservation.total)) return null;

      const confirm = reservation.status === ReservationStatus.PENDING;
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          ...(confirm ? { status: ReservationStatus.CONFIRMED, expiresAt: null } : {}),
        },
      });
      if (confirm) {
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: reservation.id,
            fromStatus: ReservationStatus.PENDING,
            toStatus: ReservationStatus.CONFIRMED,
            comment: `Paid with payment link (${provider})`,
          },
        });
        return reservation.id;
      }
      return null;
    });

    // Fuera de la transacción: el correo solo sale si la confirmación ya quedó guardada.
    if (confirmedReservation !== null) await this.emails.sendConfirmation(confirmedReservation);
  }

  // ---------------- Internos ----------------

  private async find(token: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { token }, include: { reservation: { select: { code: true } } } });
    if (!link) throw new NotFoundException('Payment link not found');
    return link;
  }

  /** El link debe seguir vigente y el método de pago debe estar activo. */
  private async findPayable(token: string, method: 'card' | 'paypal') {
    const link = await this.find(token);
    const status = effectiveStatus(link);
    if (status === 'PAID') throw new BadRequestException('This payment link has already been paid.');
    if (status === 'EXPIRED') throw new BadRequestException('This payment link has expired. Please ask us for a new one.');
    if (status === 'CANCELLED') throw new BadRequestException('This payment link is no longer valid. Please ask us for a new one.');

    const enabled = await this.settings.get('payments');
    const available = method === 'card' ? enabled.cardEnabled : enabled.paypalEnabled;
    if (!available) throw new ServiceUnavailableException('This payment method is not available.');
    return link;
  }

  private siteUrl(): string {
    return this.config.getOrThrow<string>('PUBLIC_SITE_URL').replace(/\/+$/, '');
  }
}

function effectiveStatus(link: { status: PaymentLinkStatus; expiresAt: Date }): PublicPaymentLink['status'] {
  if (link.status === PaymentLinkStatus.PAID) return 'PAID';
  if (link.status === PaymentLinkStatus.CANCELLED) return 'CANCELLED';
  return link.expiresAt.getTime() <= Date.now() ? 'EXPIRED' : 'ACTIVE';
}

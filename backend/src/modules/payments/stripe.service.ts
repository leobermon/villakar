import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentRecordStatus, Prisma, TripType, WebhookProvider } from '@prisma/client';
import Stripe from 'stripe';
import { ReservationAccessDto } from '../reservations/dto/lookup-reservation.dto';
import { ReservationsService } from '../reservations/reservations.service';
import { PaymentLedgerService } from './payment-ledger.service';

/** Stripe exige al menos 30 minutos de vida para una sesión de Checkout. */
const SESSION_TTL_SECONDS = 30 * 60;

/**
 * Pago con tarjeta mediante Stripe Checkout (página alojada por Stripe): los
 * datos de la tarjeta nunca pasan por nuestro servidor.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly reservations: ReservationsService,
    private readonly ledger: PaymentLedgerService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.client = secretKey ? new Stripe(secretKey) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async createCheckoutSession(access: ReservationAccessDto): Promise<{ url: string }> {
    const stripe = this.stripe();
    const reservation = await this.reservations.findPayable(access);
    const site = this.siteUrl();
    const tripLabel = reservation.tripType === TripType.ROUND_TRIP ? 'Round trip' : 'One way';

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: reservation.customerEmail,
        client_reference_id: reservation.code,
        metadata: { reservationCode: reservation.code },
        payment_intent_data: {
          description: `Reservation ${reservation.code}`,
          metadata: { reservationCode: reservation.code },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: toCents(reservation.total),
              product_data: {
                name: `Private transfer · ${reservation.vehicleName}`,
                description: `${tripLabel} · Reservation ${reservation.code}`,
              },
            },
          },
        ],
        success_url: `${site}/reservation/${reservation.code}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/reservation/${reservation.code}?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      });
    } catch (error) {
      this.logger.error(`Stripe checkout session failed for ${reservation.code}: ${String(error)}`);
      throw new ServiceUnavailableException('Card payments are temporarily unavailable. Please try again or use PayPal.');
    }

    await this.ledger.recordAttempt(reservation, PaymentProvider.STRIPE, session.id);
    return { url: session.url! };
  }

  /**
   * Al volver de Stripe el sitio llama aquí con el id de la sesión. Se consulta
   * a Stripe directamente, así que no depende de que el webhook haya llegado
   * (útil en desarrollo, donde el webhook requiere Stripe CLI).
   */
  async confirmSession(sessionId: string): Promise<{ code: string; paid: boolean }> {
    const stripe = this.stripe();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        throw new BadRequestException('Unknown payment session');
      }
      this.logger.error(`Stripe session retrieve failed: ${String(error)}`);
      throw new ServiceUnavailableException('We could not verify your payment yet. Please refresh in a moment.');
    }
    return this.applySession(session);
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    const stripe = this.stripe();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Stripe webhook is not configured');
    if (!rawBody || !signature) throw new BadRequestException('Missing webhook signature');

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    const relevant = [
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
      'checkout.session.expired',
    ];
    if (!relevant.includes(event.type)) return;

    const session = event.data.object as Stripe.Checkout.Session;
    const eventRowId = await this.ledger.recordWebhookEvent(WebhookProvider.STRIPE, event.id, event.type, {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      reservationCode: session.metadata?.reservationCode ?? null,
    });
    if (eventRowId === null) return;

    await this.applySession(session, event.type);
    await this.ledger.markWebhookProcessed(eventRowId);
  }

  private async applySession(
    session: Stripe.Checkout.Session,
    eventType?: string,
  ): Promise<{ code: string; paid: boolean }> {
    const code = session.metadata?.reservationCode ?? session.client_reference_id ?? '';

    if (session.payment_status === 'paid') {
      await this.ledger.markSucceeded(PaymentProvider.STRIPE, session.id, {
        amount: new Prisma.Decimal(session.amount_total ?? 0).div(100),
        currency: session.currency ?? 'usd',
        payload: {
          sessionId: session.id,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        },
      });
      return { code, paid: true };
    }

    if (session.status === 'expired') {
      await this.ledger.markClosed(PaymentProvider.STRIPE, session.id, PaymentRecordStatus.CANCELLED, 'Checkout session expired');
    } else if (eventType === 'checkout.session.async_payment_failed') {
      await this.ledger.markClosed(PaymentProvider.STRIPE, session.id, PaymentRecordStatus.FAILED, 'Asynchronous payment failed');
    }
    return { code, paid: false };
  }

  private stripe(): Stripe {
    if (!this.client) throw new ServiceUnavailableException('Card payments are not available right now.');
    return this.client;
  }

  private siteUrl(): string {
    return this.config.getOrThrow<string>('PUBLIC_SITE_URL').replace(/\/+$/, '');
  }
}

function toCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

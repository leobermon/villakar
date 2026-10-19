import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentRecordStatus, Prisma, TripType } from '@prisma/client';
import { ReservationAccessDto } from '../reservations/dto/lookup-reservation.dto';
import { ReservationsService } from '../reservations/reservations.service';
import { PaymentLedgerService } from './payment-ledger.service';

const API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

interface PaypalLink {
  href: string;
  rel: string;
}

interface PaypalCapture {
  id: string;
  status: string;
  amount?: { currency_code: string; value: string };
}

interface PaypalOrder {
  id: string;
  status: string;
  links?: PaypalLink[];
  purchase_units?: Array<{
    reference_id?: string;
    payments?: { captures?: PaypalCapture[] };
  }>;
}

interface PaypalError {
  name?: string;
  details?: Array<{ issue?: string }>;
}

/**
 * Pago con PayPal (Orders API v2) por redirección: se crea la orden, el
 * cliente la aprueba en PayPal y al volver se captura desde el servidor.
 */
@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly reservations: ReservationsService,
    private readonly ledger: PaymentLedgerService,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('PAYPAL_CLIENT_ID') && this.config.get<string>('PAYPAL_CLIENT_SECRET'));
  }

  async createOrder(access: ReservationAccessDto): Promise<{ approveUrl: string }> {
    this.ensureConfigured();
    const reservation = await this.reservations.findPayable(access);
    const site = this.config.getOrThrow<string>('PUBLIC_SITE_URL').replace(/\/+$/, '');
    const tripLabel = reservation.tripType === TripType.ROUND_TRIP ? 'Round trip' : 'One way';

    const order = await this.request<PaypalOrder>('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reservation.code,
          custom_id: reservation.code,
          description: `Private transfer · ${reservation.vehicleName} · ${tripLabel}`.slice(0, 127),
          amount: { currency_code: 'USD', value: reservation.total.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'VillaKar Transfers',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${site}/reservation/${reservation.code}?paypal=return`,
            cancel_url: `${site}/reservation/${reservation.code}?payment=cancelled`,
          },
        },
      },
    }).catch((error: unknown) => {
      if (error instanceof PaypalApiError) {
        throw new ServiceUnavailableException('PayPal is temporarily unavailable. Please try again or pay by card.');
      }
      throw error;
    });

    const approveUrl = order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href;
    if (!approveUrl) {
      this.logger.error(`PayPal order ${order.id} has no approval link`);
      throw new ServiceUnavailableException('PayPal is temporarily unavailable. Please try again or pay by card.');
    }

    await this.ledger.recordAttempt(reservation, PaymentProvider.PAYPAL, order.id);
    return { approveUrl };
  }

  /** Orden de PayPal por un monto libre (links de pago). `referenceId` regresa al capturar. */
  async createOrderFor(params: {
    referenceId: string;
    description: string;
    amount: Prisma.Decimal;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ orderId: string; approveUrl: string }> {
    this.ensureConfigured();
    const order = await this.request<PaypalOrder>('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          custom_id: params.referenceId,
          description: params.description.slice(0, 127),
          amount: { currency_code: 'USD', value: params.amount.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'VillaKar Transfers',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
          },
        },
      },
    }).catch((error: unknown) => {
      if (error instanceof PaypalApiError) {
        throw new ServiceUnavailableException('PayPal is temporarily unavailable. Please try again or pay by card.');
      }
      throw error;
    });

    const approveUrl = order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href;
    if (!approveUrl) {
      this.logger.error(`PayPal order ${order.id} has no approval link`);
      throw new ServiceUnavailableException('PayPal is temporarily unavailable. Please try again or pay by card.');
    }
    return { orderId: order.id, approveUrl };
  }

  /** Captura una orden de un link de pago y devuelve el resultado ya interpretado. Idempotente. */
  async captureFor(orderId: string): Promise<{
    status: 'paid' | 'declined' | 'pending';
    referenceId: string;
    amount?: Prisma.Decimal;
    currency?: string;
    captureId?: string;
    message?: string;
  }> {
    this.ensureConfigured();

    let order: PaypalOrder;
    try {
      order = await this.request<PaypalOrder>('POST', `/v2/checkout/orders/${orderId}/capture`, {});
    } catch (error) {
      if (!(error instanceof PaypalApiError)) throw error;
      const issue = error.issue;
      if (issue === 'ORDER_ALREADY_CAPTURED') {
        order = await this.request<PaypalOrder>('GET', `/v2/checkout/orders/${orderId}`);
      } else if (issue === 'INSTRUMENT_DECLINED' || issue === 'PAYER_ACTION_REQUIRED' || issue === 'ORDER_NOT_APPROVED') {
        throw new BadRequestException('PayPal could not complete the payment. Please try again.');
      } else if (error.status === 404) {
        throw new BadRequestException('Unknown PayPal order');
      } else {
        throw new ServiceUnavailableException('We could not confirm your PayPal payment yet. Please refresh in a moment.');
      }
    }

    const unit = order.purchase_units?.[0];
    const referenceId = unit?.reference_id ?? '';
    const capture = unit?.payments?.captures?.find((candidate) => candidate.status === 'COMPLETED');
    if (order.status === 'COMPLETED' && capture?.amount) {
      return {
        status: 'paid',
        referenceId,
        amount: new Prisma.Decimal(capture.amount.value),
        currency: capture.amount.currency_code,
        captureId: capture.id,
      };
    }
    if (unit?.payments?.captures?.some((candidate) => candidate.status === 'DECLINED')) {
      return { status: 'declined', referenceId, message: 'PayPal declined the payment. Please try another payment method.' };
    }
    return { status: 'pending', referenceId, message: 'Your PayPal payment is pending review. We will email you once it clears.' };
  }

  /** Captura la orden que el cliente aprobó en PayPal. Idempotente. */
  async captureOrder(orderId: string): Promise<{ code: string; paid: boolean; message?: string }> {
    this.ensureConfigured();

    let order: PaypalOrder;
    try {
      order = await this.request<PaypalOrder>('POST', `/v2/checkout/orders/${orderId}/capture`, {});
    } catch (error) {
      if (!(error instanceof PaypalApiError)) throw error;
      const issue = error.issue;
      if (issue === 'ORDER_ALREADY_CAPTURED') {
        order = await this.request<PaypalOrder>('GET', `/v2/checkout/orders/${orderId}`);
      } else if (issue === 'INSTRUMENT_DECLINED' || issue === 'PAYER_ACTION_REQUIRED' || issue === 'ORDER_NOT_APPROVED') {
        return { code: '', paid: false, message: 'PayPal could not complete the payment. Please try again.' };
      } else if (error.status === 404) {
        throw new BadRequestException('Unknown PayPal order');
      } else {
        throw new ServiceUnavailableException('We could not confirm your PayPal payment yet. Please refresh in a moment.');
      }
    }

    const unit = order.purchase_units?.[0];
    const code = unit?.reference_id ?? '';
    const capture = unit?.payments?.captures?.find((candidate) => candidate.status === 'COMPLETED');

    if (order.status === 'COMPLETED' && capture?.amount) {
      await this.ledger.markSucceeded(PaymentProvider.PAYPAL, order.id, {
        amount: new Prisma.Decimal(capture.amount.value),
        currency: capture.amount.currency_code,
        payload: { orderId: order.id, captureId: capture.id },
      });
      return { code, paid: true };
    }

    const declined = unit?.payments?.captures?.find((candidate) => candidate.status === 'DECLINED');
    if (declined) {
      await this.ledger.markClosed(PaymentProvider.PAYPAL, order.id, PaymentRecordStatus.FAILED, 'Capture declined');
      return { code, paid: false, message: 'PayPal declined the payment. Please try another payment method.' };
    }
    // PENDING (p. ej. revisión de PayPal): se confirmará cuando PayPal lo libere.
    return { code, paid: false, message: 'Your PayPal payment is pending review. We will email you once it clears.' };
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) throw new ServiceUnavailableException('PayPal is not available right now.');
  }

  private baseUrl(): string {
    return API_BASE[this.config.getOrThrow<'sandbox' | 'live'>('PAYPAL_ENV')];
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const credentials = Buffer.from(
      `${this.config.getOrThrow<string>('PAYPAL_CLIENT_ID')}:${this.config.getOrThrow<string>('PAYPAL_CLIENT_SECRET')}`,
    ).toString('base64');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(`PayPal token request failed: ${String(error)}`);
      throw new ServiceUnavailableException('PayPal is temporarily unavailable.');
    }
    if (!response.ok) {
      this.logger.error(`PayPal token responded ${response.status}: ${await response.text()}`);
      throw new ServiceUnavailableException('PayPal is temporarily unavailable.');
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.accessToken();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Evita duplicar la operación si la petición se reintenta.
          ...(method === 'POST' ? { 'PayPal-Request-Id': randomUUID() } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(`PayPal ${method} ${path} failed: ${String(error)}`);
      throw new ServiceUnavailableException('PayPal is temporarily unavailable.');
    }

    if (!response.ok) {
      const text = await response.text();
      let parsed: PaypalError = {};
      try {
        parsed = JSON.parse(text) as PaypalError;
      } catch {
        // Respuesta sin JSON: se registra tal cual.
      }
      this.logger.warn(`PayPal ${method} ${path} responded ${response.status}: ${text.slice(0, 500)}`);
      throw new PaypalApiError(response.status, parsed.details?.[0]?.issue ?? parsed.name);
    }
    return (await response.json()) as T;
  }
}

class PaypalApiError extends Error {
  constructor(
    readonly status: number,
    readonly issue: string | undefined,
  ) {
    super(`PayPal API error ${status}${issue ? ` (${issue})` : ''}`);
  }
}

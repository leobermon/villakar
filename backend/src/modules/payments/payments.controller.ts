import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ReservationAccessDto } from '../reservations/dto/lookup-reservation.dto';
import { ReservationsService } from '../reservations/reservations.service';
import { SettingsService } from '../settings/settings.service';
import { PaymentLedgerService } from './payment-ledger.service';
import { PaypalCaptureDto, StripeConfirmDto } from './dto/payment-return.dto';
import { PaypalService } from './paypal.service';
import { StripeService } from './stripe.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly stripe: StripeService,
    private readonly paypal: PaypalService,
    private readonly ledger: PaymentLedgerService,
    private readonly reservations: ReservationsService,
    private readonly settings: SettingsService,
  ) {}

  /** Métodos de pago disponibles: el sitio muestra solo los configurados. */
  @Get('methods')
  async methods(): Promise<{ card: boolean; paypal: boolean; cash: boolean; mxnRate: number | null }> {
    const enabled = await this.settings.get('payments');
    return {
      card: enabled.cardEnabled && this.stripe.isConfigured,
      paypal: enabled.paypalEnabled && this.paypal.isConfigured,
      cash: enabled.cashEnabled,
      // Tipo de cambio para ofrecer el pago con tarjeta en pesos (null = solo USD).
      mxnRate: enabled.usdToMxnRate,
    };
  }

  /** El cliente pagará en efectivo al chofer: la reserva se confirma sin cobro en línea. */
  @Post('cash')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async payInCash(@Body() dto: ReservationAccessDto): Promise<{ confirmed: true }> {
    await this.requireMethod('cash');
    const reservation = await this.reservations.findPayable(dto);
    if (reservation.lastMinute) {
      throw new UnprocessableEntityException(
        'This is a last-minute service: please pay online by card or PayPal to guarantee your reservation.',
      );
    }
    await this.ledger.recordCashOnService(reservation);
    return { confirmed: true };
  }

  @Post('stripe/checkout-session')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async createStripeSession(@Body() dto: ReservationAccessDto): Promise<{ url: string }> {
    await this.requireMethod('card');
    return this.stripe.createCheckoutSession(dto);
  }

  @Post('stripe/confirm')
  @HttpCode(200)
  confirmStripe(@Body() dto: StripeConfirmDto): Promise<{ code: string; paid: boolean }> {
    return this.stripe.confirmSession(dto.sessionId);
  }

  /** Webhook de Stripe: la firma se verifica contra el cuerpo crudo. */
  @Post('stripe/webhook')
  @HttpCode(200)
  @SkipThrottle()
  async stripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    await this.stripe.handleWebhook(request.rawBody, signature);
    return { received: true };
  }

  @Post('paypal/orders')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async createPaypalOrder(@Body() dto: ReservationAccessDto): Promise<{ approveUrl: string }> {
    await this.requireMethod('paypal');
    return this.paypal.createOrder(dto);
  }

  @Post('paypal/capture')
  @HttpCode(200)
  capturePaypal(@Body() dto: PaypalCaptureDto): Promise<{ code: string; paid: boolean; message?: string }> {
    return this.paypal.captureOrder(dto.orderId);
  }

  /** Rechaza iniciar un pago con un método apagado desde el panel (Configuración). */
  private async requireMethod(method: 'card' | 'paypal' | 'cash'): Promise<void> {
    const available = await this.methods();
    if (!available[method]) throw new ServiceUnavailableException('This payment method is not available.');
  }
}

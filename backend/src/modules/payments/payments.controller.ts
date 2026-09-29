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
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ReservationAccessDto } from '../reservations/dto/lookup-reservation.dto';
import { ReservationsService } from '../reservations/reservations.service';
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
    private readonly config: ConfigService,
  ) {}

  /** Métodos de pago disponibles: el sitio muestra solo los configurados. */
  @Get('methods')
  methods(): { card: boolean; paypal: boolean; cash: boolean } {
    return {
      card: this.stripe.isConfigured,
      paypal: this.paypal.isConfigured,
      cash: this.config.getOrThrow<boolean>('CASH_PAYMENTS_ENABLED'),
    };
  }

  /** El cliente pagará en efectivo al chofer: la reserva se confirma sin cobro en línea. */
  @Post('cash')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async payInCash(@Body() dto: ReservationAccessDto): Promise<{ confirmed: true }> {
    if (!this.config.getOrThrow<boolean>('CASH_PAYMENTS_ENABLED')) {
      throw new ServiceUnavailableException('Cash payment is not available.');
    }
    await this.ledger.recordCashOnService(await this.reservations.findPayable(dto));
    return { confirmed: true };
  }

  @Post('stripe/checkout-session')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  createStripeSession(@Body() dto: ReservationAccessDto): Promise<{ url: string }> {
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
  createPaypalOrder(@Body() dto: ReservationAccessDto): Promise<{ approveUrl: string }> {
    return this.paypal.createOrder(dto);
  }

  @Post('paypal/capture')
  @HttpCode(200)
  capturePaypal(@Body() dto: PaypalCaptureDto): Promise<{ code: string; paid: boolean; message?: string }> {
    return this.paypal.captureOrder(dto.orderId);
  }
}

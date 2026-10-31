import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CardCurrencyDto, PaypalCaptureDto, StripeConfirmDto } from './dto/payment-return.dto';
import { PaymentLinkResult, PaymentLinksService, PublicPaymentLink } from './payment-links.service';

/** Página pública /pay/<token>: el cliente paga el link que le mandó el equipo. */
@Controller('payment-links')
export class PaymentLinksController {
  constructor(private readonly links: PaymentLinksService) {}

  @Get(':token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  get(@Param('token') token: string): Promise<PublicPaymentLink> {
    return this.links.get(token);
  }

  @Post('stripe/confirm')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  confirmStripe(@Body() dto: StripeConfirmDto): Promise<PaymentLinkResult> {
    return this.links.confirmStripe(dto.sessionId);
  }

  @Post('paypal/capture')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  capturePaypal(@Body() dto: PaypalCaptureDto): Promise<PaymentLinkResult> {
    return this.links.capturePaypal(dto.orderId);
  }

  @Post(':token/stripe')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  startStripe(@Param('token') token: string, @Body() dto: CardCurrencyDto): Promise<{ url: string }> {
    return this.links.startStripe(token, dto.currency);
  }

  @Post(':token/paypal')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  startPaypal(@Param('token') token: string): Promise<{ approveUrl: string }> {
    return this.links.startPaypal(token);
  }
}

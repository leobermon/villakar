import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QuoteDto } from './dto/quote.dto';
import { PricingService, QuoteResult } from './pricing.service';

@Controller()
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  /**
   * Cotiza un traslado. Solo informativo: al crear la reserva el precio se
   * vuelve a calcular en el servidor, nunca se toma el que envíe el navegador.
   */
  @Post('quote')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  quote(@Body() dto: QuoteDto): Promise<QuoteResult> {
    return this.pricing.quote(dto);
  }
}

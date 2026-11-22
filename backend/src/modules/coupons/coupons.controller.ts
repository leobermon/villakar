import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /** Checkout del sitio: comprueba un código y devuelve el descuento. Límite bajo para frenar adivinar códigos. */
  @Post('validate')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  validate(@Body() dto: ValidateCouponDto) {
    return this.coupons.preview(dto.code, dto.tripType, dto.email);
  }
}

import { IsIn, IsOptional, Matches } from 'class-validator';
import { ReservationAccessDto } from '../../reservations/dto/lookup-reservation.dto';

export class StripeConfirmDto {
  @Matches(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/, { message: 'Invalid session id' })
  sessionId: string;
}

export class PaypalCaptureDto {
  @Matches(/^[A-Z0-9]{10,40}$/, { message: 'Invalid order id' })
  orderId: string;
}

/** Elige la moneda del cobro con tarjeta; sin ella se cobra en USD. */
export class CardCurrencyDto {
  @IsOptional()
  @IsIn(['usd', 'mxn'], { message: 'Please choose US dollars or Mexican pesos.' })
  currency?: 'usd' | 'mxn';
}

export class StripeCheckoutDto extends ReservationAccessDto {
  @IsOptional()
  @IsIn(['usd', 'mxn'], { message: 'Please choose US dollars or Mexican pesos.' })
  currency?: 'usd' | 'mxn';
}

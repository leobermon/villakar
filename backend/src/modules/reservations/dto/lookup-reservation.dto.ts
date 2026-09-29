import { IsEmail, Matches, MaxLength } from 'class-validator';

export const RESERVATION_CODE_PATTERN = /^VC[A-Z0-9]{8}$/;

/** Código + email del cliente: basta para consultar o pagar una reserva sin cuenta. */
export class ReservationAccessDto {
  @Matches(RESERVATION_CODE_PATTERN, { message: 'Invalid reservation code' })
  code: string;

  @IsEmail()
  @MaxLength(190)
  email: string;
}

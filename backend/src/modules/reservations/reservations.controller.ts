import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationAccessDto } from './dto/lookup-reservation.dto';
import { ReservationsService, ReservationSummary } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  /** Crea la reserva (PENDING / UNPAID). El precio se recalcula aquí, no se toma del navegador. */
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  create(@Body() dto: CreateReservationDto): Promise<ReservationSummary> {
    return this.reservations.create(dto);
  }

  /** Consulta por código + email. Es POST para que el email no quede en URLs ni en logs. */
  @Post('lookup')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  lookup(@Body() dto: ReservationAccessDto): Promise<ReservationSummary> {
    return this.reservations.lookup(dto);
  }
}

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationAccessDto } from './dto/lookup-reservation.dto';
import { ReservationsService, ReservationSummary } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly emails: ReservationEmailsService,
  ) {}

  /** Crea la reserva (PENDING / UNPAID). El precio se recalcula aquí, no se toma del navegador. */
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async create(@Body() dto: CreateReservationDto): Promise<ReservationSummary> {
    const summary = await this.reservations.create(dto);
    // "Reserva recibida" (pendiente): sale sola, sin retrasar la respuesta al cliente.
    void this.emails.sendPendingByCode(summary.code);
    return summary;
  }

  /** Consulta por código + email. Es POST para que el email no quede en URLs ni en logs. */
  @Post('lookup')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  lookup(@Body() dto: ReservationAccessDto): Promise<ReservationSummary> {
    return this.reservations.lookup(dto);
  }
}

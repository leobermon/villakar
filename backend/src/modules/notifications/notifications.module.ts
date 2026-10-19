import { forwardRef, Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { MailService } from './mail.service';
import { ReservationEmailsService } from './reservation-emails.service';

@Module({
  imports: [forwardRef(() => ReservationsModule)],
  providers: [MailService, ReservationEmailsService],
  exports: [ReservationEmailsService],
})
export class NotificationsModule {}

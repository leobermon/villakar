import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { PaymentLedgerService } from './payment-ledger.service';
import { PaymentsController } from './payments.controller';
import { PaypalService } from './paypal.service';
import { StripeService } from './stripe.service';

@Module({
  imports: [ReservationsModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentLedgerService, StripeService, PaypalService],
})
export class PaymentsModule {}

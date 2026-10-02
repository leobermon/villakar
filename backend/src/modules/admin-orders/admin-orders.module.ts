import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminPaymentsService } from './admin-payments.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService, AdminPaymentsService],
})
export class AdminOrdersModule {}

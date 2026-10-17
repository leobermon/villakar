import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminMessagesController } from './admin-messages.controller';
import { AdminMessagesService } from './admin-messages.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminMessagesController],
  providers: [AdminMessagesService],
})
export class AdminMessagesModule {}

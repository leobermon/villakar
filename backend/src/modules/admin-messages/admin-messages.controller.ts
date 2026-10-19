import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminMessagesService } from './admin-messages.service';
import { ResendEmailDto, UpdateContactRequestDto } from './dto';

/** Comunicación con clientes: registro de correos enviados y solicitudes del formulario de contacto. */
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminMessagesController {
  constructor(private readonly messages: AdminMessagesService) {}

  @Get('emails')
  listEmails() {
    return this.messages.listEmails();
  }

  /** Historial de correos de una orden. */
  @Get('orders/:id/emails')
  listOrderEmails(@Param('id', ParseIntPipe) id: number) {
    return this.messages.listOrderEmails(id);
  }

  @Post('orders/:id/resend-email')
  @HttpCode(200)
  resendEmail(@Param('id', ParseIntPipe) id: number, @Body() dto: ResendEmailDto) {
    return this.messages.resend(id, dto.kind);
  }

  @Post('orders/:id/resend-confirmation')
  @HttpCode(200)
  resendConfirmation(@Param('id', ParseIntPipe) id: number) {
    return this.messages.resend(id, 'RESERVATION_CONFIRMATION');
  }

  @Get('contact-requests')
  listContactRequests() {
    return this.messages.listContactRequests();
  }

  @Patch('contact-requests/:id')
  updateContactRequest(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactRequestDto) {
    return this.messages.updateContactRequest(id, dto);
  }
}

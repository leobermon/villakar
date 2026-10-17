import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminMessagesService } from './admin-messages.service';
import { UpdateContactRequestDto } from './dto';

/** Comunicación con clientes: registro de correos enviados y solicitudes del formulario de contacto. */
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminMessagesController {
  constructor(private readonly messages: AdminMessagesService) {}

  @Get('emails')
  listEmails() {
    return this.messages.listEmails();
  }

  @Post('orders/:id/resend-confirmation')
  @HttpCode(200)
  resendConfirmation(@Param('id', ParseIntPipe) id: number) {
    return this.messages.resendConfirmation(id);
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

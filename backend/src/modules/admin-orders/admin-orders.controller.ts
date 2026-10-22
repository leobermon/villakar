import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import type { AdminUser } from '../auth/auth.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminPaymentsService } from './admin-payments.service';
import { CreatePaymentLinkDto, ManualPaymentDto, RejectPaymentDto, UpdateOrderDto, VerifyPaymentDto } from './dto';

/**
 * Operación diaria del panel: órdenes, cobros y links de pago. Cualquier
 * usuario del panel (también operadores): asignan choferes y reciben el
 * efectivo que entregan los choferes.
 */
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminOrdersController {
  constructor(
    private readonly orders: AdminOrdersService,
    private readonly payments: AdminPaymentsService,
  ) {}

  @Get('orders')
  listOrders() {
    return this.orders.list();
  }

  @Patch('orders/:id')
  updateOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto, @CurrentAdmin() user: AdminUser) {
    return this.orders.update(id, dto, user);
  }

  @Get('payments')
  listPayments() {
    return this.payments.list();
  }

  @Post('payments')
  recordPayment(@Body() dto: ManualPaymentDto, @CurrentAdmin() user: AdminUser) {
    return this.payments.recordManual(dto, user);
  }

  @Post('payments/:id/verify')
  @HttpCode(200)
  verifyPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyPaymentDto, @CurrentAdmin() user: AdminUser) {
    return this.payments.verify(id, dto, user);
  }

  @Post('payments/:id/reject')
  @HttpCode(200)
  rejectPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectPaymentDto, @CurrentAdmin() user: AdminUser) {
    return this.payments.reject(id, dto, user);
  }

  @Post('payment-links')
  createLink(@Body() dto: CreatePaymentLinkDto, @CurrentAdmin() user: AdminUser) {
    return this.payments.createLink(dto, user);
  }

  @Post('payment-links/:id/cancel')
  @HttpCode(200)
  cancelLink(@Param('id', ParseIntPipe) id: number, @CurrentAdmin() user: AdminUser) {
    return this.payments.cancelLink(id, user);
  }
}

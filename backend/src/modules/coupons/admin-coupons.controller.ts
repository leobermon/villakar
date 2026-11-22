import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminAuthGuard, CurrentAdmin, Roles } from '../auth/admin-auth.guard';
import type { AdminUser } from '../auth/auth.service';
import { AdminCouponsService } from './admin-coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';

/** Cupones de descuento del panel: solo administradores y superadministradores. */
@Controller('admin/coupons')
@UseGuards(AdminAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCouponsController {
  constructor(private readonly coupons: AdminCouponsService) {}

  @Get()
  list() {
    return this.coupons.list();
  }

  @Post()
  create(@Body() dto: CreateCouponDto, @CurrentAdmin() actor: AdminUser) {
    return this.coupons.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCouponDto, @CurrentAdmin() actor: AdminUser) {
    return this.coupons.update(id, dto, actor);
  }
}

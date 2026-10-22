import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminAuthGuard, Roles } from '../auth/admin-auth.guard';
import { AuditService } from './audit.service';

/** Historial de movimientos: solo superadministradores (el guard deja pasar a SUPER_ADMIN y a nadie más). */
@Controller('admin/audit')
@UseGuards(AdminAuthGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('q') query?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const day = /^\d{4}-\d{2}-\d{2}$/;
    return this.audit.list({
      userId: Number(userId) > 0 ? Number(userId) : undefined,
      action: action?.trim() || undefined,
      query: query?.trim() || undefined,
      from: from && day.test(from) ? from : undefined,
      to: to && day.test(to) ? to : undefined,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 50)),
    });
  }
}

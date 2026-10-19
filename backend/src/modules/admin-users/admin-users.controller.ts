import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminAuthGuard, CurrentAdmin, Roles } from '../auth/admin-auth.guard';
import type { AdminUser } from '../auth/auth.service';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto';

/**
 * Usuarios del panel. Por ahora solo administradores (y superadministradores) pueden
 * verlos y darlos de alta; las reglas finas por rol se definen más adelante.
 */
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() dto: CreateAdminUserDto, @CurrentAdmin() actor: AdminUser) {
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto, @CurrentAdmin() actor: AdminUser) {
    return this.users.update(id, dto, actor);
  }
}

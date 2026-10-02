import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminAuthGuard, CurrentAdmin, Roles } from '../auth/admin-auth.guard';
import type { AdminUser } from '../auth/auth.service';
import { SettingsService } from './settings.service';
import type { SettingsSection } from './settings.types';

/** Configuración del panel. Leer: cualquier usuario. Cambiar: administradores. */
@Controller('admin/settings')
@UseGuards(AdminAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async getAll() {
    return { settings: await this.settings.getAll(), providers: this.settings.providers() };
  }

  /** El cuerpo se valida en el servicio con el DTO de la sección. */
  @Put(':section')
  @Roles(UserRole.ADMIN)
  save(@Param('section') section: SettingsSection, @Body() body: unknown, @CurrentAdmin() user: AdminUser) {
    return this.settings.save(section, body, user.id);
  }
}

/** Datos públicos que necesita el sitio de reservas (nada sensible). */
@Controller('site-settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get() {
    const { company, booking } = await this.settings.getAll();
    return {
      company,
      maxOnlinePassengers: booking.maxOnlinePassengers,
      minNoticeHours: booking.minNoticeHours,
      departurePickupLeadHours: booking.departurePickupLeadHours,
    };
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminAuthGuard, CurrentAdmin, Roles } from '../auth/admin-auth.guard';
import type { AdminUser } from '../auth/auth.service';
import { AdminCatalogService } from './admin-catalog.service';
import { CreateRateDto, RatePatchesDto, VehicleDto, VehicleTypeDto, ZoneDto } from './dto';

/**
 * Catálogo del panel. Leer: cualquier usuario del panel. Modificar (precios,
 * zonas, vehículos): solo administradores; los operadores no tocan precios.
 */
@Controller('admin/catalog')
@UseGuards(AdminAuthGuard)
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  getAll() {
    return this.catalog.getAll();
  }

  @Patch('rates')
  @Roles(UserRole.ADMIN)
  patchRates(@Body() dto: RatePatchesDto, @CurrentAdmin() user: AdminUser) {
    return this.catalog.patchRates(dto.changes, user.id);
  }

  @Post('rates')
  @Roles(UserRole.ADMIN)
  createRate(@Body() dto: CreateRateDto, @CurrentAdmin() user: AdminUser) {
    return this.catalog.createRate(dto, user.id);
  }

  @Post('zones')
  @Roles(UserRole.ADMIN)
  createZone(@Body() dto: ZoneDto, @CurrentAdmin() user: AdminUser) {
    return this.catalog.saveZone(dto, user.id);
  }

  @Put('zones/:id')
  @Roles(UserRole.ADMIN)
  updateZone(@Param('id', ParseIntPipe) id: number, @Body() dto: ZoneDto, @CurrentAdmin() user: AdminUser) {
    return this.catalog.saveZone(dto, user.id, id);
  }

  @Delete('zones/:id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN)
  deleteZone(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.deleteZone(id);
  }

  @Post('vehicle-types')
  @Roles(UserRole.ADMIN)
  createVehicleType(@Body() dto: VehicleTypeDto) {
    return this.catalog.saveVehicleType(dto);
  }

  @Put('vehicle-types/:id')
  @Roles(UserRole.ADMIN)
  updateVehicleType(@Param('id', ParseIntPipe) id: number, @Body() dto: VehicleTypeDto) {
    return this.catalog.saveVehicleType(dto, id);
  }

  @Post('vehicles')
  @Roles(UserRole.ADMIN)
  createVehicle(@Body() dto: VehicleDto) {
    return this.catalog.saveVehicle(dto);
  }

  @Put('vehicles/:id')
  @Roles(UserRole.ADMIN)
  updateVehicle(@Param('id', ParseIntPipe) id: number, @Body() dto: VehicleDto) {
    return this.catalog.saveVehicle(dto, id);
  }
}

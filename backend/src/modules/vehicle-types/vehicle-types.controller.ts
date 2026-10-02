import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PublicVehicleType {
  code: string;
  name: string;
  description: string | null;
  maxPassengers: number;
  maxLuggage: number;
  imageUrl: string | null;
}

@Controller('vehicle-types')
export class VehicleTypesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Flota activa para mostrar en el sitio (sin precios: dependen de la ruta). */
  @Get()
  list(): Promise<PublicVehicleType[]> {
    return this.prisma.vehicleType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { code: true, name: true, description: true, maxPassengers: true, maxLuggage: true, imageUrl: true },
    });
  }
}

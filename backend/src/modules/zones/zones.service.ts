import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ZoneMatch {
  id: number;
  name: string;
  isAirport: boolean;
}

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Zona (geofence) que contiene al lugar. Si varias se traslapan gana la de
   * mayor prioridad y, a igual prioridad, la más pequeña (la más específica).
   * Devuelve null si el lugar está fuera de todas las zonas activas.
   */
  async findZoneForPlace(placeId: number): Promise<ZoneMatch | null> {
    const [row] = await this.prisma.$queryRaw<Array<{ id: number; name: string; is_airport: number | boolean }>>`
      SELECT z.id, z.name, z.is_airport
      FROM zones z
      JOIN places p ON p.id = ${placeId}
      WHERE z.is_active = 1
        AND ST_Contains(z.boundary, p.location)
      ORDER BY z.priority DESC, ST_Area(z.boundary) ASC
      LIMIT 1`;

    if (!row) return null;
    return { id: Number(row.id), name: row.name, isAirport: Boolean(row.is_airport) };
  }
}

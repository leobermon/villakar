import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@prisma/client';
import { dateOnlyToDate } from '../../common/utils/time';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRateDto, RatePatchDto, VehicleDto, VehicleTypeDto, ZoneDto } from './dto';

type LngLat = [number, number];

// Solo los campos que usa el panel (types/catalog.ts): sin fechas internas.
const VEHICLE_TYPE_FIELDS = { id: true, code: true, name: true, description: true, maxPassengers: true, maxLuggage: true, imageUrl: true, sortOrder: true, isActive: true } satisfies Prisma.VehicleTypeSelect;
const VEHICLE_FIELDS = { id: true, vehicleTypeId: true, unitNumber: true, plate: true, brand: true, model: true, year: true, status: true, notes: true } satisfies Prisma.VehicleSelect;

/** Formas que devuelve la API (mismos campos que los tipos del panel: types/catalog.ts). */
export interface ZoneOut {
  id: number;
  name: string;
  slug: string;
  boundary: LngLat[];
  color: string;
  priority: number;
  isAirport: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface ZoneRow {
  id: number;
  name: string;
  slug: string;
  color: string;
  priority: number;
  is_airport: number | boolean;
  is_active: number | boolean;
  sort_order: number;
  geojson: string | { coordinates: LngLat[][] };
}

/**
 * Catálogo del panel: zonas, tipos de vehículo, flota y tarifas. Aquí viven las
 * reglas (no solo en el panel): precios positivos, tarifas sin traslapes,
 * capacidad del vehículo, zonas con tarifas no se borran, etc.
 */
@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const [zones, vehicleTypes, vehicles, rates] = await Promise.all([
      this.zones(),
      this.prisma.vehicleType.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: VEHICLE_TYPE_FIELDS }),
      this.prisma.vehicle.findMany({ orderBy: { unitNumber: 'asc' }, select: VEHICLE_FIELDS }),
      this.prisma.zoneRate.findMany({ orderBy: { id: 'asc' } }),
    ]);
    return {
      zones,
      vehicleTypes,
      vehicles: vehicles.map((vehicle) => ({ ...vehicle, id: Number(vehicle.id) })),
      rates: rates.map(toRateOut),
    };
  }

  // ---------------- Tarifas ----------------

  /** Cambios en bloque desde la tabla de tarifas (todo o nada). */
  async patchRates(changes: RatePatchDto[], userId: number) {
    const ids = changes.map((change) => change.id);
    const existing = await this.prisma.zoneRate.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (existing.length !== new Set(ids).size) throw new NotFoundException('Una de las tarifas ya no existe. Recarga la página.');

    await this.prisma.$transaction(
      changes.map((change) =>
        this.prisma.zoneRate.update({
          where: { id: change.id },
          data: {
            priceOneWay: change.priceOneWay,
            priceRoundTrip: change.priceRoundTrip,
            isActive: change.isActive,
            updatedBy: userId,
          },
        }),
      ),
    );
    const updated = await this.prisma.zoneRate.findMany({ where: { id: { in: ids } } });
    return updated.map(toRateOut);
  }

  async createRate(dto: CreateRateDto, userId: number) {
    if (dto.originZoneId === dto.destinationZoneId) throw new BadRequestException('El origen y el destino deben ser zonas distintas.');
    const [origin, destination, vehicle] = await Promise.all([
      this.prisma.zone.findUnique({ where: { id: dto.originZoneId }, select: { id: true } }),
      this.prisma.zone.findUnique({ where: { id: dto.destinationZoneId }, select: { id: true } }),
      this.prisma.vehicleType.findUnique({ where: { id: dto.vehicleTypeId } }),
    ]);
    if (!origin || !destination) throw new BadRequestException('Elige la zona de origen y la de destino.');
    if (!vehicle) throw new BadRequestException('Elige el vehículo.');
    if (dto.maxPax < dto.minPax) throw new BadRequestException('Revisa el rango de pasajeros (el máximo debe ser mayor o igual al mínimo).');
    if (dto.maxPax > vehicle.maxPassengers) throw new BadRequestException(`${vehicle.name} admite hasta ${vehicle.maxPassengers} pasajeros.`);

    // Mismo trayecto (en cualquier sentido si alguna es bidireccional), mismo vehículo y pasajeros que se traslapan.
    const overlapping = await this.prisma.zoneRate.findFirst({
      where: {
        isActive: true,
        vehicleTypeId: dto.vehicleTypeId,
        minPax: { lte: dto.maxPax },
        maxPax: { gte: dto.minPax },
        OR: [
          { originZoneId: dto.originZoneId, destinationZoneId: dto.destinationZoneId },
          {
            originZoneId: dto.destinationZoneId,
            destinationZoneId: dto.originZoneId,
            ...(dto.isBidirectional ? {} : { isBidirectional: true }),
          },
        ],
      },
    });
    if (overlapping) {
      throw new ConflictException(
        `Ya hay una tarifa activa de ${vehicle.name} para este trayecto con ${overlapping.minPax}–${overlapping.maxPax} pasajeros. Edita esa tarifa en la tabla.`,
      );
    }

    try {
      const rate = await this.prisma.zoneRate.create({
        data: { ...dto, validFrom: dateOnlyToDate(dto.validFrom), updatedBy: userId },
      });
      return toRateOut(rate);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Ya existe una tarifa igual con esa fecha de inicio.');
      throw error;
    }
  }

  // ---------------- Zonas ----------------

  async saveZone(dto: ZoneDto, userId: number, id?: number): Promise<ZoneOut> {
    const wkt = toPolygonWkt(dto.boundary);
    const [{ valid }] = await this.prisma.$queryRaw<Array<{ valid: number | null }>>`
      SELECT ST_IsValid(ST_GeomFromText(${wkt}, 4326, 'axis-order=long-lat')) AS valid`;
    if (!valid) throw new BadRequestException('El área de la zona no es válida (¿se cruzan sus bordes?). Dibújala de nuevo.');

    const slugOwner = await this.prisma.zone.findUnique({ where: { slug: dto.slug }, select: { id: true } });
    if (slugOwner && slugOwner.id !== id) throw new ConflictException(`Ya existe una zona con el identificador "${dto.slug}".`);

    const fields = {
      name: dto.name.trim(),
      slug: dto.slug,
      color: dto.color.toUpperCase(),
      priority: dto.priority,
      isAirport: dto.isAirport,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    };

    const zoneId = await this.prisma.$transaction(async (tx) => {
      if (id === undefined) {
        // `boundary` es geometría (Unsupported en Prisma): el alta va en SQL.
        await tx.$executeRaw`
          INSERT INTO zones (name, slug, boundary, color, priority, is_airport, is_active, sort_order, updated_by)
          VALUES (${fields.name}, ${fields.slug}, ST_GeomFromText(${wkt}, 4326, 'axis-order=long-lat'), ${fields.color},
                  ${fields.priority}, ${fields.isAirport}, ${fields.isActive}, ${fields.sortOrder}, ${userId})`;
        const created = await tx.zone.findUniqueOrThrow({ where: { slug: fields.slug }, select: { id: true } });
        return created.id;
      }
      const updated = await tx.zone.updateMany({ where: { id }, data: { ...fields, updatedBy: userId } });
      if (updated.count === 0) throw new NotFoundException('La zona ya no existe.');
      await tx.$executeRaw`UPDATE zones SET boundary = ST_GeomFromText(${wkt}, 4326, 'axis-order=long-lat') WHERE id = ${id}`;
      return id;
    });

    const [zone] = await this.zones(zoneId);
    return zone!;
  }

  /**
   * Borra una tarifa. Las reservas que la usaron conservan su precio guardado;
   * su referencia a la tarifa queda en NULL (fk_res_rate ON DELETE SET NULL).
   */
  async deleteRate(id: number) {
    const deleted = await this.prisma.zoneRate.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new NotFoundException('La tarifa ya no existe.');
  }

  /** Solo zonas sin tarifas ni traslados; con historial se desactivan. */
  async deleteZone(id: number) {
    const [rates, legs] = await Promise.all([
      this.prisma.zoneRate.count({ where: { OR: [{ originZoneId: id }, { destinationZoneId: id }] } }),
      this.prisma.reservationLeg.count({ where: { OR: [{ originZoneId: id }, { destinationZoneId: id }] } }),
    ]);
    if (rates) throw new ConflictException('Esta zona tiene tarifas: desactívala en lugar de borrarla.');
    if (legs) throw new ConflictException('Esta zona tiene traslados registrados: desactívala en lugar de borrarla.');
    const deleted = await this.prisma.zone.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new NotFoundException('La zona ya no existe.');
  }

  // ---------------- Vehículos ----------------

  async saveVehicleType(dto: VehicleTypeDto, id?: number) {
    const code = dto.code.trim().toUpperCase();
    const codeOwner = await this.prisma.vehicleType.findUnique({ where: { code }, select: { id: true } });
    if (codeOwner && codeOwner.id !== id) throw new ConflictException(`Ya existe un vehículo con el código ${code}.`);
    if (id !== undefined) {
      const tooBig = await this.prisma.zoneRate.findMany({
        where: { vehicleTypeId: id, maxPax: { gt: dto.maxPassengers } },
        select: { maxPax: true },
      });
      if (tooBig.length) {
        throw new ConflictException(
          `Hay ${tooBig.length} tarifa(s) de este vehículo para hasta ${Math.max(...tooBig.map((rate) => rate.maxPax))} pasajeros. Ajusta esas tarifas antes de bajar la capacidad.`,
        );
      }
    }
    const data = {
      ...dto,
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      imageUrl: dto.imageUrl?.trim() || null,
    };
    if (id === undefined) return this.prisma.vehicleType.create({ data, select: VEHICLE_TYPE_FIELDS });
    const exists = await this.prisma.vehicleType.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('El vehículo ya no existe.');
    return this.prisma.vehicleType.update({ where: { id }, data, select: VEHICLE_TYPE_FIELDS });
  }

  async saveVehicle(dto: VehicleDto, id?: number) {
    const unitNumber = dto.unitNumber.trim().toUpperCase();
    const plate = dto.plate.trim().toUpperCase();
    const type = await this.prisma.vehicleType.findUnique({ where: { id: dto.vehicleTypeId }, select: { id: true } });
    if (!type) throw new BadRequestException('Elige el tipo de vehículo.');
    const [unitOwner, plateOwner] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { unitNumber }, select: { id: true } }),
      this.prisma.vehicle.findUnique({ where: { plate }, select: { id: true } }),
    ]);
    if (unitOwner && Number(unitOwner.id) !== id) throw new ConflictException(`La unidad ${unitNumber} ya existe.`);
    if (plateOwner && Number(plateOwner.id) !== id) throw new ConflictException(`Las placas ${plate} ya están registradas.`);

    const data = {
      vehicleTypeId: dto.vehicleTypeId,
      unitNumber,
      plate,
      brand: dto.brand?.trim() || null,
      model: dto.model?.trim() || null,
      year: dto.year ?? null,
      status: dto.status as VehicleStatus,
      notes: dto.notes?.trim() || null,
    };
    const vehicle =
      id === undefined
        ? await this.prisma.vehicle.create({ data, select: VEHICLE_FIELDS })
        : await this.prisma.vehicle.update({ where: { id }, data, select: VEHICLE_FIELDS }).catch((error: unknown) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('La unidad ya no existe.');
            throw error;
          });
    return { ...vehicle, id: Number(vehicle.id) };
  }

  // ---------------- Lectura de zonas (geometría vía SQL) ----------------

  private async zones(onlyId?: number): Promise<ZoneOut[]> {
    const rows = await this.prisma.$queryRaw<ZoneRow[]>`
      SELECT id, name, slug, color, priority, is_airport, is_active, sort_order, ST_AsGeoJSON(boundary) AS geojson
      FROM zones
      ${onlyId === undefined ? Prisma.empty : Prisma.sql`WHERE id = ${onlyId}`}
      ORDER BY sort_order, id`;
    return rows.map((row) => {
      const geojson = typeof row.geojson === 'string' ? (JSON.parse(row.geojson) as { coordinates: LngLat[][] }) : row.geojson;
      const ring = geojson.coordinates[0] ?? [];
      // GeoJSON cierra el anillo repitiendo el primer punto; el panel no lo repite.
      const open = ring.length > 1 && ring[0]![0] === ring.at(-1)![0] && ring[0]![1] === ring.at(-1)![1] ? ring.slice(0, -1) : ring;
      return {
        id: Number(row.id),
        name: row.name,
        slug: row.slug,
        color: row.color,
        priority: Number(row.priority),
        isAirport: Boolean(row.is_airport),
        isActive: Boolean(row.is_active),
        sortOrder: Number(row.sort_order),
        boundary: open.map(([lng, lat]) => [lng, lat] as LngLat),
      };
    });
  }
}

function toRateOut(rate: Prisma.ZoneRateGetPayload<object>) {
  return {
    id: Number(rate.id),
    originZoneId: rate.originZoneId,
    destinationZoneId: rate.destinationZoneId,
    vehicleTypeId: rate.vehicleTypeId,
    minPax: rate.minPax,
    maxPax: rate.maxPax,
    priceOneWay: rate.priceOneWay.toNumber(),
    priceRoundTrip: rate.priceRoundTrip.toNumber(),
    isBidirectional: rate.isBidirectional,
    validFrom: rate.validFrom.toISOString().slice(0, 10),
    validTo: rate.validTo ? rate.validTo.toISOString().slice(0, 10) : null,
    isActive: rate.isActive,
  };
}

/** Polígono WKT cerrado a partir del anillo [lng, lat]. */
function toPolygonWkt(ring: Array<[number, number]>): string {
  for (const point of ring) {
    const [lng, lat] = point;
    if (!Array.isArray(point) || point.length !== 2 || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      throw new BadRequestException('Las coordenadas de la zona no son válidas.');
    }
  }
  const closed = [...ring, ring[0]!];
  return `POLYGON((${closed.map(([lng, lat]) => `${lng} ${lat}`).join(', ')}))`;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

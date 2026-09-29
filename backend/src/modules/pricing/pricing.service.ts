import { BadRequestException, Injectable } from '@nestjs/common';
import { PlaceType, Prisma, RouteType, TripType } from '@prisma/client';
import { dateOnlyToDate, todayInCancun } from '../../common/utils/time';
import { PrismaService } from '../../prisma/prisma.service';
import { PlacesService, ResolvedPlace } from '../places/places.service';
import { ZoneMatch, ZonesService } from '../zones/zones.service';
import { QuoteDto, QuoteLocationDto } from './dto/quote.dto';

export type RateWithVehicle = Prisma.ZoneRateGetPayload<{ include: { vehicleType: true } }>;

export type NotServiceableReason = 'OUT_OF_SERVICE_AREA' | 'NO_RATE_AVAILABLE';

export interface QuoteEndpoint {
  placeId: number;
  name: string;
  formattedAddress: string | null;
  zone: { id: number; name: string } | null;
}

export interface QuoteOption {
  rateId: number;
  vehicleType: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    maxPassengers: number;
    maxLuggage: number;
    imageUrl: string | null;
  };
  currency: 'USD';
  price: number;
}

export interface QuoteResult {
  serviceable: boolean;
  /** Presente cuando serviceable = false: el sitio muestra "Contact us". */
  reason: NotServiceableReason | null;
  tripType: TripType;
  routeType: RouteType | null;
  passengers: number;
  origin: QuoteEndpoint;
  destination: QuoteEndpoint;
  options: QuoteOption[];
}

interface TripPlaces {
  origin: ResolvedPlace;
  destination: ResolvedPlace;
  originZone: ZoneMatch | null;
  destinationZone: ZoneMatch | null;
}

export type PricedTrip =
  | (TripPlaces & { serviceable: false; reason: NotServiceableReason; routeType: RouteType | null })
  | (TripPlaces & {
      serviceable: true;
      originZone: ZoneMatch;
      destinationZone: ZoneMatch;
      routeType: RouteType;
      rates: RateWithVehicle[];
    });

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly places: PlacesService,
    private readonly zones: ZonesService,
  ) {}

  async quote(dto: QuoteDto): Promise<QuoteResult> {
    const trip = await this.priceTrip(dto);
    const base = {
      tripType: dto.tripType,
      passengers: dto.passengers,
      origin: toEndpoint(trip.origin, trip.originZone),
      destination: toEndpoint(trip.destination, trip.destinationZone),
      routeType: trip.routeType,
    };

    if (!trip.serviceable) {
      return { ...base, serviceable: false, reason: trip.reason, options: [] };
    }
    return { ...base, serviceable: true, reason: null, options: trip.rates.map((rate) => toOption(rate, dto.tripType)) };
  }

  /**
   * Resuelve lugares, zonas, tipo de ruta y tarifas aplicables. Lo usan la
   * cotización y la creación de reservas, que así cobran exactamente lo cotizado.
   */
  async priceTrip(dto: QuoteDto): Promise<PricedTrip> {
    this.validateDates(dto);

    const [origin, destination] = await Promise.all([
      this.resolveLocation(dto.origin, 'origin'),
      this.resolveLocation(dto.destination, 'destination'),
    ]);
    if (origin.id === destination.id) {
      throw new BadRequestException('Origin and destination must be different');
    }

    const [originZone, destinationZone] = await Promise.all([
      this.zones.findZoneForPlace(origin.id),
      this.zones.findZoneForPlace(destination.id),
    ]);
    if (!originZone || !destinationZone) {
      return { serviceable: false, reason: 'OUT_OF_SERVICE_AREA', origin, destination, originZone, destinationZone, routeType: null };
    }

    const routeType = resolveRouteType(isAirport(origin, originZone), isAirport(destination, destinationZone));
    const rates = await this.findApplicableRates(
      originZone.id,
      destinationZone.id,
      dto.passengers,
      dateOnlyToDate(dto.date),
    );
    if (rates.length === 0) {
      return { serviceable: false, reason: 'NO_RATE_AVAILABLE', origin, destination, originZone, destinationZone, routeType };
    }
    return { serviceable: true, origin, destination, originZone, destinationZone, routeType, rates };
  }

  /**
   * Una tarifa por tipo de vehículo que aplique a la ruta, a la fecha y al número
   * de pasajeros. Si hay varias candidatas para el mismo vehículo, gana la del
   * sentido exacto (origen→destino) sobre la bidireccional inversa y, después,
   * la de vigencia más reciente.
   */
  async findApplicableRates(
    originZoneId: number,
    destinationZoneId: number,
    passengers: number,
    serviceDate: Date,
  ): Promise<RateWithVehicle[]> {
    const candidates = await this.prisma.zoneRate.findMany({
      where: {
        isActive: true,
        minPax: { lte: passengers },
        maxPax: { gte: passengers },
        validFrom: { lte: serviceDate },
        vehicleType: { isActive: true, maxPassengers: { gte: passengers } },
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: serviceDate } }] },
          {
            OR: [
              { originZoneId, destinationZoneId },
              { originZoneId: destinationZoneId, destinationZoneId: originZoneId, isBidirectional: true },
            ],
          },
        ],
      },
      include: { vehicleType: true },
      orderBy: { validFrom: 'desc' },
    });

    const isExactDirection = (rate: RateWithVehicle) =>
      rate.originZoneId === originZoneId && rate.destinationZoneId === destinationZoneId;

    const bestByVehicle = new Map<number, RateWithVehicle>();
    for (const rate of candidates) {
      const current = bestByVehicle.get(rate.vehicleTypeId);
      if (!current || (isExactDirection(rate) && !isExactDirection(current))) {
        bestByVehicle.set(rate.vehicleTypeId, rate);
      }
    }

    return [...bestByVehicle.values()].sort((a, b) => a.vehicleType.sortOrder - b.vehicleType.sortOrder);
  }

  private validateDates(dto: QuoteDto): void {
    if (dto.date < todayInCancun()) {
      throw new BadRequestException('date cannot be in the past');
    }
    if (dto.tripType === TripType.ROUND_TRIP) {
      if (!dto.returnDate) throw new BadRequestException('returnDate is required for round trips');
      if (dto.returnDate < dto.date) throw new BadRequestException('returnDate must be on or after date');
    }
  }

  private async resolveLocation(location: QuoteLocationDto, field: string): Promise<ResolvedPlace> {
    const hasAirport = location.airportCode !== undefined;
    const hasGoogleId = location.googlePlaceId !== undefined;
    if (hasAirport === hasGoogleId) {
      throw new BadRequestException(`${field} must include exactly one of airportCode or googlePlaceId`);
    }
    return hasAirport
      ? this.places.findByCode(location.airportCode!)
      : this.places.resolveGooglePlace(location.googlePlaceId!, location.sessionToken);
  }
}

function isAirport(place: ResolvedPlace, zone: ZoneMatch): boolean {
  return place.placeType === PlaceType.AIRPORT || zone.isAirport;
}

function resolveRouteType(originIsAirport: boolean, destinationIsAirport: boolean): RouteType {
  if (originIsAirport && destinationIsAirport) {
    throw new BadRequestException('Airport to airport transfers are not available');
  }
  if (originIsAirport) return RouteType.AIRPORT_HOTEL;
  if (destinationIsAirport) return RouteType.HOTEL_AIRPORT;
  return RouteType.HOTEL_HOTEL;
}

function toEndpoint(place: ResolvedPlace, zone: ZoneMatch | null): QuoteEndpoint {
  return {
    placeId: place.id,
    name: place.name,
    formattedAddress: place.formattedAddress,
    zone: zone ? { id: zone.id, name: zone.name } : null,
  };
}

function toOption(rate: RateWithVehicle, tripType: TripType): QuoteOption {
  const price = tripType === TripType.ROUND_TRIP ? rate.priceRoundTrip : rate.priceOneWay;
  const { vehicleType } = rate;
  return {
    rateId: Number(rate.id),
    vehicleType: {
      id: vehicleType.id,
      code: vehicleType.code,
      name: vehicleType.name,
      description: vehicleType.description,
      maxPassengers: vehicleType.maxPassengers,
      maxLuggage: vehicleType.maxLuggage,
      imageUrl: vehicleType.imageUrl,
    },
    currency: 'USD',
    price: price.toNumber(),
  };
}

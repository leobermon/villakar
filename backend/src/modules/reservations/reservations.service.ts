import { randomInt } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
  ReservationSource,
  ReservationStatus,
  RouteType,
  TripType,
} from '@prisma/client';
import { formatLocalDateTime, localDateTime, nowInCancun } from '../../common/utils/time';
import { phoneMatchesCountry } from '../../common/validators/phone';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { SettingsService } from '../settings/settings.service';
import { CreateReservationDto, LegDetailsDto } from './dto/create-reservation.dto';
import { ReservationAccessDto } from './dto/lookup-reservation.dto';

const HOUR_MS = 60 * 60 * 1000;
/** Ventana máxima entre la recogida en el hotel y la salida del vuelo. */
const MAX_PICKUP_BEFORE_FLIGHT_MS = 8 * HOUR_MS;
// Sin 0/O ni 1/I/L para que el código se pueda dictar por teléfono sin confusiones.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

type LegKind = 'ARRIVAL' | 'DEPARTURE' | 'TRANSFER';

const reservationInclude = {
  customer: true,
  vehicleType: true,
  legs: { orderBy: { legNumber: 'asc' } },
  // Cobros vigentes (pendientes o cobrados), el más reciente primero: de ahí sale el método de pago.
  payments: {
    where: { type: PaymentType.CHARGE, status: { in: [PaymentRecordStatus.PENDING, PaymentRecordStatus.SUCCEEDED] } },
    select: { provider: true, status: true },
    orderBy: { id: 'desc' },
  },
} satisfies Prisma.ReservationInclude;

type ReservationWithDetails = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;

export interface ReservationSummary {
  code: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  tripType: TripType;
  routeType: RouteType;
  vehicleName: string;
  passengers: number;
  total: number;
  currency: 'USD';
  customer: { firstName: string; lastName: string; email: string; phone: string | null };
  legs: Array<{
    legNumber: number;
    originName: string;
    destinationName: string;
    /** Hora local de Cancún, 'YYYY-MM-DDTHH:MM'. */
    pickupAt: string;
    flightNumber: string | null;
    airline: string | null;
    flightTime: string | null;
    terminal: string | null;
  }>;
  specialRequests: string | null;
  /** Cuándo se creó la reserva (instante UTC en ISO). */
  createdAt: string;
  /** Límite para pagar (instante UTC en ISO). Null si ya no aplica. */
  expiresAt: string | null;
  /** true si aún se puede pagar en línea. */
  canPay: boolean;
  /** true si el cliente eligió pagar en efectivo al chofer después del servicio. */
  payInCash: boolean;
  /** Con qué se pagó (si ya está cobrado) o con qué se pagará (efectivo pendiente). null si aún no hay. */
  paymentMethod: PaymentProvider | null;
  /** true si el primer servicio es dentro de CASH_MIN_NOTICE_HOURS: solo se acepta pago en línea. */
  lastMinute: boolean;
  /** true si ya se le envió al cliente el correo de confirmación. */
  confirmationEmailSent: boolean;
}

/** Reserva lista para cobrarse: la usan los proveedores de pago. */
export interface PayableReservation {
  id: bigint;
  code: string;
  total: Prisma.Decimal;
  vehicleName: string;
  tripType: TripType;
  customerEmail: string;
  /** Primer servicio a menos de CASH_MIN_NOTICE_HOURS: no se acepta efectivo. */
  lastMinute: boolean;
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly settings: SettingsService,
  ) {}

  async create(dto: CreateReservationDto): Promise<ReservationSummary> {
    if (!phoneMatchesCountry(dto.customer.phone, dto.customer.phoneCountry)) {
      throw new BadRequestException('The phone number does not match the selected country code.');
    }
    const trip = await this.pricing.priceTrip(dto);
    if (!trip.serviceable) {
      throw new UnprocessableEntityException('This route cannot be booked online. Please contact us for a quote.');
    }
    const rate = trip.rates.find((candidate) => candidate.vehicleTypeId === dto.vehicleTypeId);
    if (!rate) {
      throw new UnprocessableEntityException('The selected vehicle is no longer available for this trip. Please search again.');
    }

    const expectedLegs = dto.tripType === TripType.ROUND_TRIP ? 2 : 1;
    if (dto.legs.length !== expectedLegs) {
      throw new BadRequestException('Something went wrong with your trip details. Please search again.');
    }

    // Ida: origen → destino en `date`. Regreso: destino → origen en `returnDate`.
    const outbound = { from: trip.origin, fromZone: trip.originZone, to: trip.destination, toZone: trip.destinationZone };
    const segments = [
      { ...outbound, date: dto.date, kind: legKind(trip.routeType) },
      ...(expectedLegs === 2
        ? [
            {
              from: trip.destination,
              fromZone: trip.destinationZone,
              to: trip.origin,
              toZone: trip.originZone,
              date: dto.returnDate!,
              kind: legKind(reverseRoute(trip.routeType)),
            },
          ]
        : []),
    ];

    const legs = segments.map((segment, index) => ({
      segment,
      times: resolveLegTimes(segment.kind, segment.date, dto.legs[index], index),
      details: dto.legs[index],
    }));
    const booking = await this.settings.get('booking');
    this.validateSchedule(legs.map(({ times }) => times.pickupAt), booking.minNoticeHours);

    const price = dto.tripType === TripType.ROUND_TRIP ? rate.priceRoundTrip : rate.priceOneWay;
    const holdMinutes = booking.holdMinutes;
    const specialRequests = dto.specialRequests?.trim() || null;

    const reservation = await this.withUniqueCode((code) =>
      this.prisma.reservation.create({
        data: {
          code,
          customer: {
            create: {
              firstName: dto.customer.firstName.trim(),
              lastName: dto.customer.lastName.trim(),
              email: normalizeEmail(dto.customer.email),
              phone: dto.customer.phone,
              countryCode: dto.customer.phoneCountry,
            },
          },
          tripType: dto.tripType,
          routeType: trip.routeType,
          vehicleType: { connect: { id: rate.vehicleTypeId } },
          zoneRate: { connect: { id: rate.id } },
          adults: dto.passengers,
          subtotal: price,
          total: price,
          source: ReservationSource.WEB,
          specialRequests,
          expiresAt: new Date(Date.now() + holdMinutes * 60_000),
          legs: {
            create: legs.map(({ segment, times, details }, index) => ({
              legNumber: index + 1,
              originPlace: { connect: { id: segment.from.id } },
              originZone: { connect: { id: segment.fromZone.id } },
              originName: segment.from.name,
              destinationPlace: { connect: { id: segment.to.id } },
              destinationZone: { connect: { id: segment.toZone.id } },
              destinationName: segment.to.name,
              pickupAt: times.pickupAt,
              flightTime: times.flightAt,
              flightNumber: segment.kind === 'TRANSFER' ? null : normalizeFlightNumber(details.flightNumber!),
              airline: segment.kind === 'TRANSFER' ? null : details.airline!.trim(),
              terminal: segment.kind === 'TRANSFER' ? null : (details.terminal ?? null),
            })),
          },
          statusHistory: { create: { toStatus: ReservationStatus.PENDING, comment: 'Created on website' } },
        },
        include: reservationInclude,
      }),
    );

    return toSummary(reservation);
  }

  /** Uso interno (p. ej. correos): la reserva por id, sin verificar email. */
  async findSummaryById(id: bigint): Promise<ReservationSummary> {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({ where: { id }, include: reservationInclude });
    return toSummary(reservation);
  }

  /** Consulta pública: exige código y el email con el que se reservó. */
  async lookup({ code, email }: ReservationAccessDto): Promise<ReservationSummary> {
    return toSummary(await this.findByAccess(code, email));
  }

  /**
   * Reserva que todavía se puede pagar en línea. Lanza un error legible si ya
   * está pagada, cancelada o expiró.
   */
  async findPayable({ code, email }: ReservationAccessDto): Promise<PayableReservation> {
    const reservation = await this.findByAccess(code, email);
    if (reservation.paymentStatus === PaymentStatus.PAID) {
      throw new UnprocessableEntityException('This reservation is already paid.');
    }
    if (reservation.status === ReservationStatus.CONFIRMED) {
      throw new UnprocessableEntityException('This reservation is already confirmed.');
    }
    if (!isPayable(reservation)) {
      throw new UnprocessableEntityException('This reservation can no longer be paid online. Please make a new booking.');
    }
    return {
      id: reservation.id,
      code: reservation.code,
      total: reservation.total,
      vehicleName: reservation.vehicleType.name,
      tripType: reservation.tripType,
      customerEmail: reservation.customer.email,
      lastMinute: isLastMinute(reservation.legs[0]!.pickupAt),
    };
  }

  private async findByAccess(code: string, email: string): Promise<ReservationWithDetails> {
    const reservation = await this.prisma.reservation.findUnique({ where: { code }, include: reservationInclude });
    // Mismo error si no existe o si el email no coincide: no revela qué códigos existen.
    if (!reservation || reservation.customer.email !== normalizeEmail(email)) {
      throw new NotFoundException('We could not find a reservation with that code and email.');
    }
    return reservation;
  }

  private validateSchedule(pickups: Date[], noticeHours: number): void {
    const earliest = new Date(nowInCancun().getTime() + noticeHours * HOUR_MS);
    if (pickups[0] < earliest) {
      throw new BadRequestException(
        `Online bookings need at least ${noticeHours} hours of notice. For sooner pickups, please contact us.`,
      );
    }
    if (pickups[1] && pickups[1] <= pickups[0]) {
      throw new BadRequestException('The return pickup must be after the first pickup.');
    }
  }

  /** Genera el código de reserva; reintenta en el caso (muy raro) de que ya exista. */
  private async withUniqueCode<T>(create: (code: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await create(generateCode());
      } catch (error) {
        const isCodeCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          String(error.meta?.target ?? '').includes('code');
        if (!isCodeCollision) throw error;
      }
    }
    throw new Error('Could not generate a unique reservation code');
  }
}

export function isPayable(reservation: {
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  expiresAt: Date | null;
}): boolean {
  return (
    reservation.status === ReservationStatus.PENDING &&
    reservation.paymentStatus === PaymentStatus.UNPAID &&
    (!reservation.expiresAt || reservation.expiresAt > new Date())
  );
}

function legKind(route: RouteType): LegKind {
  if (route === RouteType.AIRPORT_HOTEL) return 'ARRIVAL';
  if (route === RouteType.HOTEL_AIRPORT) return 'DEPARTURE';
  return 'TRANSFER';
}

function reverseRoute(route: RouteType): RouteType {
  if (route === RouteType.AIRPORT_HOTEL) return RouteType.HOTEL_AIRPORT;
  if (route === RouteType.HOTEL_AIRPORT) return RouteType.AIRPORT_HOTEL;
  return RouteType.HOTEL_HOTEL;
}

/**
 * Horas de un tramo (locales de Cancún):
 * - Llegada: el chofer espera a la hora de aterrizaje; pickup = hora del vuelo.
 * - Salida: pickup en el hotel antes del vuelo. Si la hora de pickup es mayor
 *   que la del vuelo, es del día anterior (vuelo de madrugada).
 * - Hotel → hotel: solo hora de pickup.
 */
function resolveLegTimes(
  kind: LegKind,
  date: string,
  details: LegDetailsDto,
  index: number,
): { pickupAt: Date; flightAt: Date | null } {
  const label = index === 0 ? 'first transfer' : 'return transfer';
  const require = (value: string | undefined, field: string): string => {
    if (!value?.trim()) throw new BadRequestException(`Please complete the ${field.toLowerCase()} for your ${label}.`);
    return value;
  };

  if (kind === 'TRANSFER') {
    return { pickupAt: localDateTime(date, withinServiceHours(require(details.pickupTime, 'Pickup time'), label)), flightAt: null };
  }

  require(details.flightNumber, 'Flight number');
  require(details.airline, 'Airline');
  const flightTime = require(details.flightTime, 'Flight time');
  // En llegadas el servicio empieza al aterrizar.
  if (kind === 'ARRIVAL') withinServiceHours(flightTime, label);
  const flightAt = localDateTime(date, flightTime);
  if (kind === 'ARRIVAL') return { pickupAt: flightAt, flightAt };

  let pickupAt = localDateTime(date, withinServiceHours(require(details.pickupTime, 'Pickup time'), label));
  if (pickupAt >= flightAt) pickupAt = new Date(pickupAt.getTime() - 24 * HOUR_MS);
  if (flightAt.getTime() - pickupAt.getTime() > MAX_PICKUP_BEFORE_FLIGHT_MS) {
    throw new BadRequestException(`Your hotel pickup for the ${label} must be no more than 8 hours before your flight. Please choose a later time.`);
  }
  return { pickupAt, flightAt };
}

/** Servicios que empiezan dentro de estas horas son "last minute": solo pago en línea. */
export const CASH_MIN_NOTICE_HOURS = 8;

/** pickupAt es un Date "de pared" de Cancún (ver localDateTime). */
function isLastMinute(firstPickupAt: Date): boolean {
  return firstPickupAt.getTime() - nowInCancun().getTime() < CASH_MIN_NOTICE_HOURS * HOUR_MS;
}

/** Horario de servicio (hora local de Cancún, HH:MM): de 5:00 am a 8:00 pm, ambos incluidos. */
export const SERVICE_HOURS = { start: '05:00', end: '20:00' } as const;

function withinServiceHours(time: string, label: string): string {
  if (time < SERVICE_HOURS.start || time > SERVICE_HOURS.end) {
    throw new BadRequestException(
      `Our service hours are 5:00 am to 8:00 pm. For other times, please contact us.`,
    );
  }
  return time;
}

function generateCode(): string {
  let code = 'VC';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeFlightNumber(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function hasPendingCash(reservation: ReservationWithDetails): boolean {
  return reservation.payments.some(
    (payment) => payment.provider === PaymentProvider.CASH && payment.status === PaymentRecordStatus.PENDING,
  );
}

/** Método con el que se cobró; si aún no se cobra, "CASH" cuando quedó pendiente de pagar en efectivo. */
function paymentMethodOf(reservation: ReservationWithDetails): PaymentProvider | null {
  if (reservation.paymentStatus !== PaymentStatus.UNPAID) {
    return reservation.payments.find((payment) => payment.status === PaymentRecordStatus.SUCCEEDED)?.provider ?? null;
  }
  return hasPendingCash(reservation) ? PaymentProvider.CASH : null;
}

function toSummary(reservation: ReservationWithDetails): ReservationSummary {
  const payable = isPayable(reservation);
  return {
    code: reservation.code,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    tripType: reservation.tripType,
    routeType: reservation.routeType,
    vehicleName: reservation.vehicleType.name,
    passengers: reservation.adults + reservation.children + reservation.infants,
    total: reservation.total.toNumber(),
    currency: 'USD',
    customer: {
      firstName: reservation.customer.firstName,
      lastName: reservation.customer.lastName,
      email: reservation.customer.email,
      phone: reservation.customer.phone,
    },
    legs: reservation.legs.map((leg) => ({
      legNumber: leg.legNumber,
      originName: leg.originName,
      destinationName: leg.destinationName,
      pickupAt: formatLocalDateTime(leg.pickupAt),
      flightNumber: leg.flightNumber,
      airline: leg.airline,
      flightTime: leg.flightTime ? formatLocalDateTime(leg.flightTime) : null,
      terminal: leg.terminal,
    })),
    specialRequests: reservation.specialRequests,
    createdAt: reservation.createdAt.toISOString(),
    expiresAt: payable && reservation.expiresAt ? reservation.expiresAt.toISOString() : null,
    canPay: payable,
    payInCash: reservation.paymentStatus === PaymentStatus.UNPAID && hasPendingCash(reservation),
    paymentMethod: paymentMethodOf(reservation),
    lastMinute: isLastMinute(reservation.legs[0]!.pickupAt),
    confirmationEmailSent: reservation.confirmationEmailSentAt !== null,
  };
}

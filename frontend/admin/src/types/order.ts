/**
 * Orden = reserva de traslado. Mismos nombres y valores que el backend
 * (backend/prisma/schema.prisma y ReservationSummary), para que pasar de los
 * datos de prueba a la API real no requiera traducir campos.
 */

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';

/** Cómo pagó (o pagará) el cliente. null: aún no elige. */
export type PaymentMethod = 'STRIPE' | 'PAYPAL' | 'CASH' | 'TRANSFER' | null;

export type TripType = 'ONE_WAY' | 'ROUND_TRIP';
export type RouteType = 'AIRPORT_HOTEL' | 'HOTEL_AIRPORT' | 'HOTEL_HOTEL';
export type OrderSource = 'WEB' | 'ADMIN' | 'PHONE' | 'AGENCY';

/** Estado de un tramo. Los abiertos (SCHEDULED, ASSIGNED, IN_PROGRESS) siguen el estado de la orden. */
export type LegStatus = 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface OrderLeg {
  legNumber: number;
  originName: string;
  destinationName: string;
  /** Hora local de Cancún, 'YYYY-MM-DDTHH:MM'. */
  pickupAt: string;
  flightNumber: string | null;
  airline: string | null;
  terminal: string | null;
  driverName: string | null;
  driverPhone: string | null;
  status: LegStatus;
}

export interface Order {
  id: number;
  code: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  tripType: TripType;
  routeType: RouteType;
  source: OrderSource;
  /** phone en formato internacional E.164 (+529981234567); countryCode es el país ISO del teléfono (MX). */
  customer: { firstName: string; lastName: string; email: string; phone: string; countryCode: string | null };
  vehicle: { code: string; name: string };
  passengers: number;
  total: number;
  currency: 'USD';
  legs: OrderLeg[];
  specialRequests: string | null;
  internalNotes: string | null;
  /** Instante UTC ISO de creación. */
  createdAt: string;
}

/** Campos que el equipo puede editar desde el panel. */
export interface OrderUpdate {
  status?: OrderStatus;
  internalNotes?: string | null;
  /** Chofer y/o cierre de un tramo (completado, cancelado, no show) sin tocar el otro. */
  legs?: Array<Pick<OrderLeg, 'legNumber'> & Partial<Pick<OrderLeg, 'driverName' | 'driverPhone'>> & { status?: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' }>;
}

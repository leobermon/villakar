import { PaymentLinkStatus, PaymentRecordStatus, PaymentType, Prisma } from '@prisma/client';
import { formatLocalDateTime } from '../../common/utils/time';

/**
 * Formas que consume el panel (frontend/admin/src/types/order.ts y payment.ts).
 * Los ids BIGINT se envían como number: no llegan a 2^53 en este negocio.
 */

export const orderInclude = {
  customer: true,
  vehicleType: { select: { code: true, name: true } },
  legs: { orderBy: { legNumber: 'asc' } },
  payments: {
    where: { type: PaymentType.CHARGE },
    select: { provider: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.ReservationInclude;

export type OrderRow = Prisma.ReservationGetPayload<{ include: typeof orderInclude }>;

export function toOrder(row: OrderRow) {
  // Método: el del cobro exitoso; si no hay, el del intento más reciente (p. ej. efectivo por cobrar).
  const charge = row.payments.find((payment) => payment.status === PaymentRecordStatus.SUCCEEDED) ?? row.payments[0];
  return {
    id: Number(row.id),
    code: row.code,
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: charge?.provider ?? null,
    tripType: row.tripType,
    routeType: row.routeType,
    source: row.source,
    customer: {
      firstName: row.customer.firstName,
      lastName: row.customer.lastName,
      email: row.customer.email,
      phone: row.customer.phone ?? '',
      countryCode: row.customer.countryCode,
    },
    vehicle: { code: row.vehicleType.code, name: row.vehicleType.name },
    passengers: row.adults + row.children + row.infants,
    total: row.total.toNumber(),
    currency: 'USD' as const,
    legs: row.legs.map((leg) => ({
      legNumber: leg.legNumber,
      originName: leg.originName,
      destinationName: leg.destinationName,
      pickupAt: formatLocalDateTime(leg.pickupAt),
      flightNumber: leg.flightNumber,
      airline: leg.airline,
      terminal: leg.terminal,
      driverName: leg.driverName,
      driverPhone: leg.driverPhone,
    })),
    specialRequests: row.specialRequests,
    internalNotes: row.internalNotes,
    createdAt: row.createdAt.toISOString(),
  };
}

export type AdminOrder = ReturnType<typeof toOrder>;

export const paymentInclude = {
  reservation: { select: { code: true, customer: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.PaymentInclude;

export type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

export function toPayment(row: PaymentRow) {
  return {
    id: Number(row.id),
    orderId: Number(row.reservationId),
    orderCode: row.reservation.code,
    customerName: `${row.reservation.customer.firstName} ${row.reservation.customer.lastName}`,
    provider: row.provider,
    type: row.type,
    amount: row.amount.toNumber(),
    currency: 'USD' as const,
    status: row.status,
    // La referencia del equipo, o el id del proveedor (sesión de Stripe, orden de PayPal).
    reference: row.reference ?? row.providerPaymentId,
    receivedBy: row.receivedBy,
    note: row.note ?? row.failureReason,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export const linkInclude = { reservation: { select: { code: true } } } satisfies Prisma.PaymentLinkInclude;

export type LinkRow = Prisma.PaymentLinkGetPayload<{ include: typeof linkInclude }>;

export function toPaymentLink(row: LinkRow, siteUrl: string) {
  return {
    id: Number(row.id),
    token: row.token,
    url: `${siteUrl}/pay/${row.token}`,
    orderId: row.reservationId === null ? null : Number(row.reservationId),
    orderCode: row.reservation?.code ?? null,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    description: row.description,
    amount: row.amount.toNumber(),
    currency: 'USD' as const,
    status: row.status as PaymentLinkStatus,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

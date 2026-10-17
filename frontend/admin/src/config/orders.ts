import type { BadgeTone } from '@/components/ui/badge';
import type { Order, OrderSource, OrderStatus, PaymentMethod, RouteType } from '@/types/order';

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  CONFIRMED: { label: 'Confirmado', tone: 'info' },
  COMPLETED: { label: 'Completado', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
  NO_SHOW: { label: 'No show', tone: 'danger' },
};

/** Orden en que se muestran los estados en filtros y selectores. */
export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

/**
 * Cambios de estado permitidos desde el panel. Evita saltos sin sentido
 * (p. ej. de Completada a Pendiente). El estado actual siempre se incluye.
 */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const PAYMENT_METHOD_LABEL: Record<Exclude<PaymentMethod, null>, string> = {
  STRIPE: 'Tarjeta',
  PAYPAL: 'PayPal',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
};

/** Resumen del pago para la tabla: combina método y estado en una sola insignia. */
export function paymentSummary(order: Order): { label: string; tone: BadgeTone } {
  const method = order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : null;
  switch (order.paymentStatus) {
    case 'PAID':
      return { label: `Pagado · ${method}`, tone: 'success' };
    case 'REFUNDED':
      return { label: 'Reembolsado', tone: 'neutral' };
    case 'PARTIALLY_REFUNDED':
      return { label: 'Reembolso parcial', tone: 'neutral' };
    case 'FAILED':
      return { label: 'Pago fallido', tone: 'danger' };
    default:
      if (order.paymentMethod === 'CASH') return { label: 'Efectivo por cobrar', tone: 'warning' };
      if (order.paymentMethod === 'TRANSFER') return { label: 'Transferencia por verificar', tone: 'warning' };
      return { label: 'Sin pagar', tone: 'warning' };
  }
}

/** Abreviatura de la ruta en la tabla: LL llegada, SA salida, HH hotel a hotel. */
export const ROUTE_CODE: Record<RouteType, string> = {
  AIRPORT_HOTEL: 'LL',
  HOTEL_AIRPORT: 'SA',
  HOTEL_HOTEL: 'HH',
};

export const ROUTE_LABEL: Record<RouteType, string> = {
  AIRPORT_HOTEL: 'Aeropuerto → Hotel',
  HOTEL_AIRPORT: 'Hotel → Aeropuerto',
  HOTEL_HOTEL: 'Hotel → Hotel',
};

export const SOURCE_LABEL: Record<OrderSource, string> = {
  WEB: 'Sitio web',
  ADMIN: 'Panel',
  PHONE: 'Teléfono',
  AGENCY: 'Agencia',
};

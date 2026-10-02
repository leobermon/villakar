import type { BadgeTone } from '@/components/ui/badge';
import type { PaymentLinkStatus, PaymentProvider, PaymentRecordStatus, PaymentType } from '@/types/payment';

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  STRIPE: 'Tarjeta (Stripe)',
  PAYPAL: 'PayPal',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
};

export const PAYMENT_STATUS: Record<PaymentRecordStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Por verificar', tone: 'warning' },
  SUCCEEDED: { label: 'Recibido', tone: 'success' },
  FAILED: { label: 'No recibido', tone: 'danger' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  CHARGE: 'Cobro',
  REFUND: 'Reembolso',
};

export const LINK_STATUS: Record<PaymentLinkStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Activo', tone: 'info' },
  PAID: { label: 'Pagado', tone: 'success' },
  EXPIRED: { label: 'Expirado', tone: 'neutral' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
};

/** Opciones de vigencia al crear un link. */
export const LINK_VALIDITY_OPTIONS = [
  { hours: 24, label: '24 horas' },
  { hours: 48, label: '48 horas' },
  { hours: 72, label: '3 días' },
  { hours: 168, label: '7 días' },
];

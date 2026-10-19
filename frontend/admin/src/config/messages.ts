import type { BadgeTone } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/order';
import type { ContactStatus, EmailKind, EmailStatus } from '@/types/messages';

export const EMAIL_STATUS: Record<EmailStatus, { label: string; tone: BadgeTone }> = {
  SENT: { label: 'Enviado', tone: 'success' },
  FAILED: { label: 'Falló', tone: 'danger' },
};

export const EMAIL_KIND_LABEL: Record<EmailKind, string> = {
  RESERVATION_PENDING: 'Reserva recibida (pendiente)',
  RESERVATION_CONFIRMATION: 'Reserva confirmada',
  RESERVATION_COMPLETED: 'Agradecimiento (completada)',
  RESERVATION_CANCELLED: 'Reserva cancelada',
};

/** Orden en que se muestran en el historial de una orden (el de su vida normal). */
export const EMAIL_KIND_ORDER: EmailKind[] = [
  'RESERVATION_PENDING',
  'RESERVATION_CONFIRMATION',
  'RESERVATION_COMPLETED',
  'RESERVATION_CANCELLED',
];

/** Cuándo sale solo cada correo, para explicarlo en el historial. */
export const EMAIL_KIND_WHEN: Record<EmailKind, string> = {
  RESERVATION_PENDING: 'Sale al reservar en el sitio',
  RESERVATION_CONFIRMATION: 'Sale al confirmarse la orden',
  RESERVATION_COMPLETED: 'Sale al marcar la orden como Completado',
  RESERVATION_CANCELLED: 'Sale al marcar la orden como Cancelado',
};

/** Qué correos se pueden reenviar según el estado de la orden (igual que el backend). */
export const EMAIL_KINDS_BY_STATUS: Record<OrderStatus, EmailKind[]> = {
  PENDING: ['RESERVATION_PENDING'],
  CONFIRMED: ['RESERVATION_CONFIRMATION'],
  COMPLETED: ['RESERVATION_CONFIRMATION', 'RESERVATION_COMPLETED'],
  CANCELLED: ['RESERVATION_CANCELLED'],
  NO_SHOW: [],
};

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: BadgeTone }> = {
  NEW: { label: 'Nueva', tone: 'warning' },
  CONTACTED: { label: 'Atendida', tone: 'info' },
  CLOSED: { label: 'Cerrada', tone: 'neutral' },
};

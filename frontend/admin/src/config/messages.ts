import type { BadgeTone } from '@/components/ui/badge';
import type { ContactStatus, EmailLog, EmailStatus } from '@/types/messages';

export const EMAIL_STATUS: Record<EmailStatus, { label: string; tone: BadgeTone }> = {
  SENT: { label: 'Enviado', tone: 'success' },
  FAILED: { label: 'Falló', tone: 'danger' },
};

export const EMAIL_KIND_LABEL: Record<EmailLog['kind'], string> = {
  RESERVATION_CONFIRMATION: 'Confirmación de reserva',
};

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: BadgeTone }> = {
  NEW: { label: 'Nueva', tone: 'warning' },
  CONTACTED: { label: 'Atendida', tone: 'info' },
  CLOSED: { label: 'Cerrada', tone: 'neutral' },
};

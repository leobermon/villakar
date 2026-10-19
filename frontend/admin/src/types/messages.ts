export type EmailStatus = 'SENT' | 'FAILED';

/** Tipos de correo que el sistema envía al cliente. */
export type EmailKind = 'RESERVATION_PENDING' | 'RESERVATION_CONFIRMATION' | 'RESERVATION_COMPLETED' | 'RESERVATION_CANCELLED';

/** Correo que envió el sistema al cliente (registro de /api/admin/emails). */
export interface EmailLog {
  id: number;
  kind: EmailKind;
  reservationId: number | null;
  reservationCode: string | null;
  customerName: string | null;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  error: string | null;
  /** Instante UTC en ISO. */
  createdAt: string;
}

export type ContactStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

/** Solicitud del formulario "Contact us" del sitio (/api/admin/contact-requests). */
export interface ContactRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  hotelName: string;
  /** 'YYYY-MM-DD' */
  arrivalDate: string | null;
  passengers: number | null;
  message: string | null;
  status: ContactStatus;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactUpdate {
  status?: ContactStatus;
  internalNotes?: string | null;
}

export interface ResendResult {
  sent: boolean;
  error: string | null;
  email: EmailLog | null;
}

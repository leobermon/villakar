/**
 * Configuración general del negocio. Reemplaza valores que hoy están fijos en
 * el código o en el .env del backend (ver comentarios por campo).
 */

export interface CompanySettings {
  /** Hoy fijo en frontend/booking/src/config.ts (SITE.name). */
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  /** Horario de atención que ve el cliente (texto libre). */
  hours: string;
}

export interface BookingSettings {
  /** BOOKING_MIN_NOTICE_HOURS (backend): horas mínimas entre la reserva y la recogida. */
  minNoticeHours: number;
  /** BOOKING_HOLD_MINUTES (backend): minutos que se aparta el precio de una reserva sin pagar. */
  holdMinutes: number;
  /** SITE.maxPassengers (sitio): más pasajeros se mandan a cotización. */
  maxOnlinePassengers: number;
  /** Horas antes del vuelo que el sitio sugiere para la recogida en salidas (hoy 3). */
  departurePickupLeadHours: number;
  /** Redondo sugerido = sencillo × factor al crear tarifas (hoy 1.85). */
  roundTripFactor: number;
}

export interface PaymentSettings {
  cardEnabled: boolean;
  paypalEnabled: boolean;
  /** CASH_PAYMENTS_ENABLED (backend). */
  cashEnabled: boolean;
}

/** Estado de un proveedor de pago (solo lectura: las claves viven en el servidor). */
export interface ProviderStatus {
  connected: boolean;
  /** 'test' con claves de prueba/sandbox, 'live' con claves reales. */
  mode: 'test' | 'live' | null;
}

export interface NotificationSettings {
  /** Parte de MAIL_FROM (backend). */
  senderName: string;
  senderEmail: string;
  /** Correos del equipo que reciben los avisos internos. */
  teamEmails: string[];
  notifyNewReservation: boolean;
  notifyContactRequest: boolean;
  notifyPaymentToVerify: boolean;
  /** Idioma del mensaje de WhatsApp/correo de los links de pago. */
  paymentLinkLanguage: 'en' | 'es';
}

export interface Settings {
  company: CompanySettings;
  booking: BookingSettings;
  payments: PaymentSettings;
  notifications: NotificationSettings;
}

export type SettingsSection = keyof Settings;

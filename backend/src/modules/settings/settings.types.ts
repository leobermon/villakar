/**
 * Configuración del negocio editable desde el panel (tabla app_settings).
 * Mismas formas que frontend/admin/src/types/settings.ts.
 */

export interface CompanySettings {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  /** Horario de atención, texto libre (p. ej. "Daily, 7:00 am – 10:00 pm"). */
  hours: string;
}

export interface BookingSettings {
  minNoticeHours: number;
  holdMinutes: number;
  maxOnlinePassengers: number;
  departurePickupLeadHours: number;
  roundTripFactor: number;
}

export interface PaymentSettings {
  cardEnabled: boolean;
  paypalEnabled: boolean;
  cashEnabled: boolean;
}

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
  teamEmails: string[];
  notifyNewReservation: boolean;
  notifyContactRequest: boolean;
  notifyPaymentToVerify: boolean;
  paymentLinkLanguage: 'en' | 'es';
}

export interface Settings {
  company: CompanySettings;
  booking: BookingSettings;
  payments: PaymentSettings;
  notifications: NotificationSettings;
}

export type SettingsSection = keyof Settings;

export const SETTINGS_SECTIONS: SettingsSection[] = ['company', 'booking', 'payments', 'notifications'];

/** Estado de un proveedor de pago. Las claves nunca salen del servidor. */
export interface ProviderStatus {
  connected: boolean;
  mode: 'test' | 'live' | null;
}

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { ProviderStatus, Settings, SettingsSection } from '@/types/settings';

/** Error de validación ligado a un campo del formulario. */
export class SettingsError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{6,30}$/;

/**
 * Configuración guardada en la base (/api/admin/settings). Mientras una sección
 * no se guarde, el backend devuelve los valores de su .env. Aquí se valida antes
 * de enviar para señalar el campo; el backend vuelve a validar todo.
 */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null);
  /** Stripe y PayPal: si el servidor tiene claves (las claves nunca llegan al panel). */
  const providers = ref<Record<'stripe' | 'paypal', ProviderStatus>>({
    stripe: { connected: false, mode: null },
    paypal: { connected: false, mode: null },
  });
  const loading = ref(false);
  const loadError = ref<string | null>(null);

  async function load(force = false) {
    if ((settings.value && !force) || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      const data = await api<{ settings: Settings; providers: Record<'stripe' | 'paypal', ProviderStatus> }>('/admin/settings');
      settings.value = data.settings;
      providers.value = data.providers;
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : 'No se pudo cargar la configuración.';
    } finally {
      loading.value = false;
    }
  }

  /** Guarda una sección completa después de validarla (lanza SettingsError con el campo). */
  async function save<S extends SettingsSection>(section: S, values: Settings[S]) {
    validate(section, values);
    try {
      const saved = await api<Settings[S]>(`/admin/settings/${section}`, { method: 'PUT', json: values });
      if (settings.value) settings.value[section] = saved;
    } catch (e) {
      if (e instanceof ApiError) {
        throw new SettingsError('form', e.status === 403 ? 'Solo un administrador puede cambiar la configuración.' : e.message);
      }
      throw e;
    }
  }

  function validate<S extends SettingsSection>(section: S, values: Settings[S]) {
    if (section === 'company') {
      const company = values as Settings['company'];
      if (!company.name.trim()) throw new SettingsError('name', 'El nombre comercial es obligatorio.');
      if (company.email && !EMAIL.test(company.email)) throw new SettingsError('email', 'Correo no válido.');
      if (company.phone && !PHONE.test(company.phone)) throw new SettingsError('phone', 'Teléfono no válido. Incluye la clave de país: +52 998 …');
      if (company.whatsapp && !PHONE.test(company.whatsapp)) throw new SettingsError('whatsapp', 'Número no válido. Incluye la clave de país: +52 998 …');
    }
    if (section === 'booking') {
      const booking = values as Settings['booking'];
      // Mismos límites que valida el backend en env.validation.ts.
      if (!Number.isInteger(booking.minNoticeHours) || booking.minNoticeHours < 0 || booking.minNoticeHours > 168) throw new SettingsError('minNoticeHours', 'Entre 0 y 168 horas.');
      if (!Number.isInteger(booking.holdMinutes) || booking.holdMinutes < 30 || booking.holdMinutes > 1440) throw new SettingsError('holdMinutes', 'Entre 30 y 1440 minutos (Stripe exige al menos 30).');
      if (!Number.isInteger(booking.maxOnlinePassengers) || booking.maxOnlinePassengers < 1 || booking.maxOnlinePassengers > 50) throw new SettingsError('maxOnlinePassengers', 'Entre 1 y 50 pasajeros.');
      if (!(booking.departurePickupLeadHours >= 1 && booking.departurePickupLeadHours <= 6)) throw new SettingsError('departurePickupLeadHours', 'Entre 1 y 6 horas.');
      if (!(booking.roundTripFactor >= 1 && booking.roundTripFactor <= 2.5)) throw new SettingsError('roundTripFactor', 'Entre 1 y 2.5.');
    }
    if (section === 'payments') {
      const payments = values as Settings['payments'];
      const active = (payments.cardEnabled && providers.value.stripe.connected) || (payments.paypalEnabled && providers.value.paypal.connected) || payments.cashEnabled;
      if (!active) throw new SettingsError('payments', 'Debe quedar al menos un método de pago funcionando; si no, nadie podrá reservar en línea.');
    }
    if (section === 'notifications') {
      const notifications = values as Settings['notifications'];
      if (!notifications.senderName.trim()) throw new SettingsError('senderName', 'Escribe el nombre del remitente.');
      if (!EMAIL.test(notifications.senderEmail)) throw new SettingsError('senderEmail', 'Correo no válido.');
      const invalid = notifications.teamEmails.find((email) => !EMAIL.test(email));
      if (invalid) throw new SettingsError('teamEmails', `"${invalid}" no es un correo válido.`);
      const wantsAlerts = notifications.notifyNewReservation || notifications.notifyContactRequest || notifications.notifyPaymentToVerify;
      if (wantsAlerts && notifications.teamEmails.length === 0) throw new SettingsError('teamEmails', 'Agrega al menos un correo del equipo para recibir los avisos.');
    }
  }

  return { settings, providers, loading, loadError, load, save };
});

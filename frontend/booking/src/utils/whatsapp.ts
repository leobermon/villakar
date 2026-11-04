import { computed, ref } from 'vue';
import { fetchCompanyInfo } from '@/api/booking';
import { SITE } from '@/config';

/**
 * Número para WhatsApp en formato internacional, solo dígitos. Un número de 10 dígitos es mexicano sin lada de país.
 * (Mismo criterio que los correos del backend.)
 */
export function whatsappDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? `52${digits}` : digits;
}

/** El teléfono de contacto que se captura en Configuración → Empresa del panel; null hasta que la API responde. */
const phone = ref<string | null>(null);
let requested = false;

function loadPhone(): void {
  if (requested || typeof window === 'undefined') return;
  requested = true;
  fetchCompanyInfo()
    // El campo WhatsApp de Configuración solo es respaldo cuando no hay teléfono.
    .then((company) => (phone.value = whatsappDigits(company.phone || company.whatsapp)))
    .catch(() => (phone.value = ''))
    // Sin dato o sin respuesta se usa el número de config.ts.
    .finally(() => (phone.value ||= SITE.whatsapp.phone));
}

/**
 * Enlace de WhatsApp con el mensaje ya escrito. El número viene de Configuración → Empresa, así que si
 * cambia el teléfono en el panel, cambia en el sitio sin tocar código. `url` es null mientras carga
 * (el botón no se muestra hasta tener el número correcto).
 */
export function useWhatsApp() {
  loadPhone();
  const url = (message: string) => (phone.value ? `https://wa.me/${phone.value}?text=${encodeURIComponent(message)}` : null);
  return { phone: computed(() => phone.value), url };
}

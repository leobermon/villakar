/**
 * Google Analytics 4. Solo corre en el navegador (el prerenderizado no toca `window`).
 * El ID de medición viene de VITE_GA_ID; si está vacío no se carga nada.
 */
import { ref } from 'vue';

const GA_ID = import.meta.env.VITE_GA_ID ?? '';
const CONSENT_KEY = 'cookie_consent';

export type Consent = 'granted' | 'denied';

function readConsent(): Consent | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : null;
  } catch {
    return null;
  }
}

/** Elección del visitante sobre las cookies de medición; null mientras no haya elegido (muestra el aviso). */
export const consent = ref<Consent | null>(typeof window === 'undefined' ? 'denied' : readConsent());

/** Hay medición configurada: solo entonces tiene sentido mostrar el aviso. */
export const analyticsEnabled = Boolean(GA_ID);

export function setConsent(choice: Consent): void {
  consent.value = choice;
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Sin localStorage: la elección vale solo en esta visita.
  }
  window.gtag?.('consent', 'update', { analytics_storage: choice });
}

/** "Cookie settings": vuelve a mostrar el aviso para que el visitante cambie su elección. */
export function reopenConsent(): void {
  consent.value = null;
}

type GtagArgs = unknown[];

declare global {
  interface Window {
    dataLayer?: GtagArgs[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function enabled(): boolean {
  return typeof window !== 'undefined' && Boolean(GA_ID);
}

function track(event: string, params: Record<string, unknown> = {}): void {
  if (enabled()) window.gtag?.('event', event, params);
}

/** Carga gtag.js y desactiva el page_view automático (en una SPA se envía en cada cambio de ruta). */
export function initAnalytics(): void {
  if (!enabled() || window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js necesita el objeto `arguments`, no un arreglo.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments as unknown as GtagArgs);
  };
  // Consent Mode: sin permiso, GA4 no guarda cookies; si el visitante ya aceptó antes, arranca concedido.
  window.gtag('consent', 'default', {
    analytics_storage: consent.value === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

export function trackPageView(path: string): void {
  track('page_view', { page_path: path, page_location: window.location.origin + path, page_title: document.title });
}

/** El cliente pidió precios y recibió opciones de vehículo. */
export function trackQuote(route: string, tripType: string, passengers: number): void {
  track('search', { search_term: route, trip_type: tripType, passengers });
}

/** Se creó la reserva y el cliente pasa al pago. */
export function trackBeginCheckout(value: number, vehicle: string, paymentType: string): void {
  track('begin_checkout', { currency: 'USD', value, items: [{ item_name: vehicle, price: value, quantity: 1 }] });
  track('add_payment_info', { currency: 'USD', value, payment_type: paymentType });
}

const PURCHASE_KEY = 'ga_purchase_';

/**
 * Venta confirmada (pagada en línea o en efectivo confirmada). Se envía una sola vez por reserva,
 * y solo si se creó hace poco: así no se cuenta de nuevo cuando el cliente reabre la reserva días después.
 */
export function trackPurchase(code: string, value: number, vehicle: string, paymentType: string, createdAt: string): void {
  if (!enabled()) return;
  if (Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000) return;
  try {
    if (localStorage.getItem(PURCHASE_KEY + code)) return;
    localStorage.setItem(PURCHASE_KEY + code, '1');
  } catch {
    // Sin localStorage (modo privado): se envía igual; GA4 descarta transaction_id repetidos.
  }
  track('purchase', {
    transaction_id: code,
    currency: 'USD',
    value,
    payment_type: paymentType,
    items: [{ item_name: vehicle, price: value, quantity: 1 }],
  });
}

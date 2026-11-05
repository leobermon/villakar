/**
 * Google Analytics 4 y Google Tag Manager. Solo corren en el navegador (el prerenderizado no toca `window`).
 * Analytics: el ID de medición viene de VITE_GA_ID; si está vacío no se carga.
 * Tag Manager: solo en producción; el ID viene de VITE_GTM_ID (por defecto el contenedor del sitio).
 * Los dos comparten el mismo dataLayer y el mismo Consent Mode: sin permiso del visitante no guardan cookies.
 * Importante: la etiqueta de GA4 NO debe repetirse dentro de GTM mientras Analytics se cargue desde aquí
 * (contaría cada visita y compra dos veces).
 */
import { ref } from 'vue';

const GA_ID = import.meta.env.VITE_GA_ID ?? '';
const GTM_ID = import.meta.env.VITE_GTM_ID || 'GTM-K9NWSJPD';
const GTM_ON = import.meta.env.PROD && Boolean(GTM_ID);
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
  return typeof window !== 'undefined' && (Boolean(GA_ID) || GTM_ON);
}

function track(event: string, params: Record<string, unknown> = {}): void {
  if (enabled()) window.gtag?.('event', event, params);
}

/** dataLayer y gtag() compartidos, con el Consent Mode ya fijado antes de que cargue cualquier etiqueta. */
function setupDataLayer(): void {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js y GTM necesitan el objeto `arguments`, no un arreglo.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments as unknown as GtagArgs);
  };
  // Consent Mode: sin permiso, no se guardan cookies; si el visitante ya aceptó antes, arranca concedido.
  window.gtag('consent', 'default', {
    analytics_storage: consent.value === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

/** Pide el script cuando la página ya cargó y el navegador está libre: no compite con la foto principal. */
function loadWhenIdle(src: string): void {
  const load = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  };
  const whenIdle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(load, { timeout: 4000 }) : setTimeout(load, 2000));
  // Los eventos que ocurran antes quedan en dataLayer y se envían al cargar.
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

/** Carga Analytics (sin el page_view automático: en una SPA se envía en cada cambio de ruta) y Tag Manager. */
export function initAnalytics(): void {
  if (!enabled()) return;
  setupDataLayer();

  if (GA_ID) {
    window.gtag!('js', new Date());
    window.gtag!('config', GA_ID, { send_page_view: false });
    loadWhenIdle(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
  }

  if (GTM_ON) {
    window.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' } as unknown as GtagArgs);
    loadWhenIdle(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`);
  }
}

export function trackPageView(path: string): void {
  track('page_view', { page_path: path, page_location: window.location.origin + path, page_title: document.title });
}

/** El visitante tocó el botón de WhatsApp. */
export function trackWhatsAppClick(): void {
  track('contact', { method: 'whatsapp' });
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

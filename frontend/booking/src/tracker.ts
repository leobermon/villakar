/**
 * Analítica propia (panel admin → Analítica). Anónima y sin cookies: la visita se identifica con un número
 * aleatorio guardado solo en sessionStorage (desaparece al cerrar la pestaña). No se guarda IP ni datos del cliente.
 * Respeta "No rastrear" (Do Not Track / Global Privacy Control). Nunca estorba: si falla, se ignora.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const SID_KEY = 'vk_sid';
const SOURCE_KEY = 'vk_src';

export interface TrackFields {
  path?: string;
  route?: string;
  tripType?: string;
  hotel?: string;
  /** Qué botón, qué campo o qué vehículo, según el evento. */
  label?: string;
  amount?: number;
  passengers?: number;
  /** Fecha elegida para el servicio y de regreso (YYYY-MM-DD). */
  serviceDate?: string;
  returnDate?: string;
  props?: Record<string, unknown>;
}

function canTrack(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return navigator.doNotTrack !== '1' && !nav.globalPrivacyControl;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

let memorySid: string | null = null;
function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = randomId();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    memorySid ??= randomId();
    return memorySid;
  }
}

/** De dónde llegó: utm_source de la dirección o el sitio de referencia; vacío si entró directo. */
function detectSource(): string | undefined {
  try {
    const saved = sessionStorage.getItem(SOURCE_KEY);
    if (saved !== null) return saved || undefined;
    let source = new URLSearchParams(window.location.search).get('utm_source') ?? '';
    if (!source && document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== window.location.hostname.replace(/^www\./, '')) source = host;
    }
    source = source.slice(0, 80);
    sessionStorage.setItem(SOURCE_KEY, source);
    return source || undefined;
  } catch {
    return undefined;
  }
}

/** Envía un evento. `field_focus` y similares se mandan una sola vez por visita con `once`. */
export function trackEvent(name: string, fields: TrackFields = {}, once = false): void {
  if (!canTrack()) return;
  try {
    if (once) {
      const key = `vk_once_${name}_${fields.label ?? ''}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    }
    const body = {
      sid: sessionId(),
      name,
      path: (fields.path ?? window.location.pathname).slice(0, 190),
      route: fields.route,
      tripType: fields.tripType,
      hotel: fields.hotel?.slice(0, 190),
      label: fields.label?.slice(0, 80),
      amount: fields.amount === undefined ? undefined : Math.round(fields.amount * 100) / 100,
      passengers: fields.passengers,
      serviceDate: fields.serviceDate || undefined,
      returnDate: fields.returnDate || undefined,
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      source: detectSource(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      props: fields.props,
    };
    void fetch(`${API_BASE}/vk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // La analítica nunca debe romper la página.
  }
}

/** Nombre corto de un enlace para el reporte de clics. */
function linkLabel(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute('href') ?? '';
  if (!href || href.startsWith('#')) return null;
  if (/wa\.me|whatsapp/i.test(href)) return 'whatsapp';
  if (href.startsWith('tel:')) return 'phone';
  if (href.startsWith('mailto:')) return 'email';
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) return `link:${url.pathname}`;
    return `external:${url.hostname.replace(/^www\./, '')}`;
  } catch {
    return null;
  }
}

/**
 * Clics clave: enlaces (destinos, servicios, menú, WhatsApp, teléfono) y cualquier elemento con `data-track="nombre"`.
 * Un solo escuchador para todo el sitio.
 */
export function initTracker(): void {
  if (!canTrack()) return;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      const marked = target?.closest<HTMLElement>('[data-track]');
      if (marked) {
        trackEvent('click', { label: marked.dataset.track, props: { from: window.location.pathname } });
        return;
      }
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      const label = anchor ? linkLabel(anchor) : null;
      if (label) trackEvent('click', { label, props: { from: window.location.pathname } });
    },
    { capture: true },
  );
}

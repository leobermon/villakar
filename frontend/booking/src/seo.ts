/**
 * SEO por página: título, descripción, URL canónica y etiquetas para compartir enlaces.
 * Lo usan dos lados: el navegador (actualiza el <head> al navegar) y el prerenderizado
 * (scripts/prerender.mjs escribe estas mismas etiquetas en el HTML estático de cada página).
 */

import { DESTINATIONS, destinationBySlug, destinationPath } from '@/content/destinations';
import { FAQ_ITEMS } from '@/content/faq';

export interface PageSeo {
  title: string;
  description: string;
  /** Datos estructurados (schema.org) de la página, si los tiene. */
  jsonLd?: object;
  /** Páginas privadas (cotización, reservación): que Google no las indexe. */
  noindex?: boolean;
}

export const SITE_NAME = 'VillaKar Transfers';

/** Foto que aparece al compartir el enlace en WhatsApp, Facebook, etc. */
export const SHARE_IMAGE = '/hero/slide-family-beach.jpg';

export const HOME_SEO: PageSeo = {
  title: 'Cancun Airport Private Transfers | VillaKar Transfers',
  description:
    'Private airport transfers from Cancun Airport to Cancun, Playa del Carmen, Tulum and the Riviera Maya. Fixed prices in USD, book online in minutes.',
};

export const SEO_BY_ROUTE: Record<string, PageSeo> = {
  home: HOME_SEO,
  contact: {
    title: 'Contact and Group Quotes | VillaKar Transfers',
    description:
      'Need a quote for a large group, a tour or a hotel outside our online zones? Contact VillaKar Transfers and we will reply with a personalized quote.',
  },
  faq: {
    title: 'FAQ: Cancun Airport Transfers | VillaKar Transfers',
    description:
      'Answers to the most common questions about private airport transfers in Cancun and the Riviera Maya: prices, payment, vehicles, flight delays and pickup times.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  },
  terms: {
    title: 'Terms and Conditions | VillaKar Transfers',
    description:
      'Terms and conditions of VillaKar Transfers private transfers: our role as intermediary, flight delays and no-shows, liability and client responsibility.',
  },
  privacy: {
    title: 'Privacy Policy | VillaKar Transfers',
    description: 'How VillaKar Transfers collects, uses and protects your information, and how to manage your cookie choices.',
  },
  results: {
    title: 'Choose your vehicle | VillaKar Transfers',
    description: 'Choose your vehicle and complete your private transfer booking.',
    noindex: true,
  },
  paylink: {
    title: 'Secure payment | VillaKar Transfers',
    description: 'Pay your VillaKar Transfers payment link securely with card or PayPal.',
    noindex: true,
  },
  reservation: {
    title: 'Your reservation | VillaKar Transfers',
    description: 'View and manage your VillaKar Transfers reservation.',
    noindex: true,
  },
};

/** Páginas que se prerenderizan y salen en el sitemap. */
export const INDEXABLE_PATHS: string[] = [
  '/',
  '/contact',
  '/faq',
  '/terms',
  '/privacy',
  ...DESTINATIONS.map((destination) => destinationPath(destination.slug)),
];

/** SEO de una página de destino (/destinations/:slug): se arma con los datos del destino. */
function destinationSeo(path: string): PageSeo | undefined {
  const destination = destinationBySlug(path.split('/').filter(Boolean)[1]);
  if (!destination) return undefined;
  return {
    title: `Cancun Airport to ${destination.name} Private Transfer | VillaKar Transfers`,
    description: `Private transfer from Cancun Airport to ${destination.name}: ${destination.time.toLowerCase()}, ${destination.distanceKm}. ${destination.summary} Book online with a fixed price in USD.`,
  };
}

export function seoForRoute(name: unknown, path = ''): PageSeo {
  if (name === 'destination') return destinationSeo(path) ?? HOME_SEO;
  return (typeof name === 'string' && SEO_BY_ROUTE[name]) || HOME_SEO;
}

export function canonicalUrl(origin: string, path: string): string {
  const clean = path === '/' ? '/' : path.replace(/\/+$/, '');
  return `${origin.replace(/\/+$/, '')}${clean}`;
}

/** Las etiquetas del <head> de una página, listas para escribir como HTML (prerenderizado). */
export function headTags(seo: PageSeo, origin: string, path: string): string {
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const url = canonicalUrl(origin, path);
  const image = `${origin.replace(/\/+$/, '')}${SHARE_IMAGE}`;
  return [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    seo.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '',
    `<link rel="canonical" href="${esc(url)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    seo.jsonLd ? `<script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');
}

function setMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    document.head.appendChild(element);
  }
  element.setAttribute(element.tagName === 'LINK' ? 'href' : 'content', content);
}

/** En el navegador: actualiza título y etiquetas al cambiar de página. */
export function applySeo(routeName: unknown, path: string): void {
  const seo = seoForRoute(routeName, path);
  const url = canonicalUrl(window.location.origin, path);
  document.title = seo.title;
  setMeta('meta[name="description"]', { name: 'description' }, seo.description);
  setMeta('link[rel="canonical"]', { rel: 'canonical' }, url);
  setMeta('meta[property="og:title"]', { property: 'og:title' }, seo.title);
  setMeta('meta[property="og:description"]', { property: 'og:description' }, seo.description);
  setMeta('meta[property="og:url"]', { property: 'og:url' }, url);
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seo.title);
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seo.description);

  // Datos estructurados: se agregan o se quitan según la página.
  const ld = document.head.querySelector('script#seo-jsonld');
  if (seo.jsonLd) {
    const script = ld ?? Object.assign(document.createElement('script'), { id: 'seo-jsonld', type: 'application/ld+json' });
    script.textContent = JSON.stringify(seo.jsonLd);
    if (!ld) document.head.appendChild(script);
  } else {
    ld?.remove();
  }

  const robots = document.head.querySelector('meta[name="robots"]');
  if (seo.noindex) setMeta('meta[name="robots"]', { name: 'robots' }, 'noindex, nofollow');
  else robots?.remove();
}

import type { PaymentLink } from '@/types/payment';

export type MessageLanguage = 'en' | 'es';

/** Texto del link de pago; el idioma se elige en Configuración → Notificaciones. */
function message(link: PaymentLink, language: MessageLanguage): string {
  const expires = new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Cancun',
  }).format(new Date(link.expiresAt));
  const firstName = link.customerName.split(' ')[0];
  const amount = `USD ${link.amount.toFixed(2)}`;
  return language === 'es'
    ? `Hola ${firstName}, este es tu link de pago seguro para ${link.description} (${amount}):\n${link.url}\n\nEl link es válido hasta el ${expires} (hora de Cancún).\n— VillaKar Transfers`
    : `Hi ${firstName}, here is your secure payment link for ${link.description} (${amount}):\n${link.url}\n\nThe link is valid until ${expires} (Cancun time).\n— VillaKar Transfers`;
}

/** wa.me con el mensaje listo; si hay teléfono, abre el chat de ese número. */
export function paymentLinkWhatsappUrl(link: PaymentLink, language: MessageLanguage = 'en'): string {
  const phone = link.customerPhone?.replace(/\D/g, '') ?? '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message(link, language))}`;
}

export function paymentLinkEmailUrl(link: PaymentLink, language: MessageLanguage = 'en'): string {
  const subject = language === 'es' ? `Link de pago · ${link.description}` : `Payment link · ${link.description}`;
  return `mailto:${link.customerEmail ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message(link, language))}`;
}

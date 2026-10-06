import { parsePhoneNumberFromString } from 'libphonenumber-js';

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });

/** Teléfono guardado (+529981234567) para mostrar: +52 998 123 4567. Si no se puede leer, tal cual. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return parsePhoneNumberFromString(phone)?.formatInternational() ?? phone;
}

/** Para enlaces tel: y wa.me: solo dígitos, con la clave de país. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** "🇲🇽 México" a partir del código ISO. */
export function countryLabel(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  const flag = String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
  return `${flag} ${regionNames.of(code) ?? code}`;
}

/** true si el texto se puede leer como teléfono internacional válido (+52 998 123 4567). */
export function isInternationalPhone(text: string): boolean {
  const parsed = parsePhoneNumberFromString(text.trim());
  return Boolean(parsed?.isValid());
}

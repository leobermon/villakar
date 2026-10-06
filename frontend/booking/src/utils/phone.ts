import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

export type { CountryCode };

/** Teléfono tal como lo captura el cliente: país (clave) y número local. */
export interface PhoneValue {
  country: CountryCode;
  number: string;
}

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
}

/** Países de donde llega la mayoría de los clientes: van primero en la lista. */
const FEATURED: CountryCode[] = ['US', 'CA', 'MX', 'GB'];

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function option(code: CountryCode): CountryOption {
  return { code, name: regionNames.of(code) ?? code, dialCode: `+${getCountryCallingCode(code)}` };
}

export const FEATURED_COUNTRIES: CountryOption[] = FEATURED.map(option);
export const OTHER_COUNTRIES: CountryOption[] = getCountries()
  .filter((code) => !FEATURED.includes(code))
  .map(option)
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const ALL_CODES = new Set<string>(getCountries());

export function countryOption(code: CountryCode): CountryOption {
  return option(code);
}

/** País sugerido por el idioma del navegador (en-US → US, es-MX → MX); si no, Estados Unidos. */
export function defaultCountry(): CountryCode {
  for (const language of navigator.languages ?? [navigator.language]) {
    const region = language.split('-')[1]?.toUpperCase();
    if (region && ALL_CODES.has(region)) return region as CountryCode;
  }
  return 'US';
}

/** El número en formato internacional E.164 (+529981234567), o null si no es válido para ese país. */
export function toE164(value: PhoneValue): string | null {
  const parsed = parsePhoneNumberFromString(value.number, value.country);
  return parsed && isValidPhoneNumber(value.number, value.country) ? parsed.number : null;
}

/**
 * Si el cliente escribió el número con su clave (+44 …), detecta el país.
 * Devuelve el país y el número local, o null si no trae clave reconocible.
 */
export function splitInternational(number: string): PhoneValue | null {
  if (!number.trim().startsWith('+')) return null;
  const parsed = parsePhoneNumberFromString(number);
  return parsed?.country ? { country: parsed.country, number: parsed.formatNational() } : null;
}

/** Número local con el formato habitual del país (998 123 4567), si es válido. */
export function formatNational(value: PhoneValue): string {
  const parsed = parsePhoneNumberFromString(value.number, value.country);
  return parsed && parsed.isValid() ? parsed.formatNational() : value.number;
}

/** Para mostrar un teléfono guardado: +52 998 123 4567. Si no se puede leer, tal cual. */
export function formatInternational(phone: string | null | undefined): string {
  if (!phone) return '';
  return parsePhoneNumberFromString(phone)?.formatInternational() ?? phone;
}

/** Clases de flag-icons para la bandera; Ascensión y Tristán de Acuña usan la de Santa Elena. */
export function flagClass(code: CountryCode): string {
  const file = code === 'AC' || code === 'TA' ? 'sh' : code.toLowerCase();
  return `fi fi-${file}`;
}

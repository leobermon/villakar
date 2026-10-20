const usd = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });

/** 209 → "USD 209.00". */
export function formatUsd(amount: number): string {
  return usd.format(amount);
}

// Las horas de servicio se guardan como hora local de Cancún ('YYYY-MM-DDTHH:MM');
// se formatean en UTC para no aplicar la zona horaria del navegador.
const dateTime = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});
const dateOnly = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const timeOnly = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

/** 'YYYY-MM-DDTHH:MM' → "mar, 20 oct, 14:30". */
export function formatLocalDateTime(value: string): string {
  return dateTime.format(new Date(`${value}:00Z`));
}

export function formatLocalDate(value: string): string {
  return dateOnly.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function formatLocalTime(value: string): string {
  return timeOnly.format(new Date(`${value}:00Z`));
}

/** Instante UTC ISO → fecha en hora de Cancún. */
export function formatInstant(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Cancun',
  }).format(new Date(iso));
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DDTHH:MM' (hora local de Cancún) → "20 oct 2026 14:30". */
export function formatLocalStamp(value: string): string {
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d} ${MONTHS[Number(m) - 1]} ${y} ${value.slice(11, 16)}`;
}

const instantParts = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Cancun',
});

/** Instante UTC ISO → "20/oct/26 14:30" en hora de Cancún. */
export function formatInstantStamp(iso: string): string {
  const p = Object.fromEntries(instantParts.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${p.day}/${MONTHS[Number(p.month) - 1]}/${p.year} ${p.hour}:${p.minute}`;
}

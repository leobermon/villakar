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

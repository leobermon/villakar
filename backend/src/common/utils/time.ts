export const BUSINESS_TIME_ZONE = 'America/Cancun';

/** Fecha de hoy en Cancún con formato YYYY-MM-DD. */
export function todayInCancun(now: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(now);
}

/** Convierte 'YYYY-MM-DD' a Date (medianoche UTC) para comparar contra columnas DATE. */
export function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * Hora local de Cancún ('YYYY-MM-DD' + 'HH:MM') como Date "de pared": los campos
 * UTC del Date contienen la hora local. Así se guarda en las columnas DATETIME
 * marcadas como hora local America/Cancun, sin conversión de zona.
 */
export function localDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

/** La hora actual de Cancún en el mismo formato "de pared" que localDateTime. */
export function nowInCancun(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
  return localDateTime(`${get('year')}-${get('month')}-${get('day')}`, `${get('hour')}:${get('minute')}`);
}

/** Date "de pared" → 'YYYY-MM-DDTHH:MM' (hora local de Cancún, sin zona). */
export function formatLocalDateTime(value: Date): string {
  return value.toISOString().slice(0, 16);
}

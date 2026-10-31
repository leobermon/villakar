const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function formatUsd(amount: number): string {
  return usd.format(amount);
}

/** Pesos con centavos exactos que equivalen a un monto en USD (igual que el cobro del servidor). */
export function usdToPesos(amountUsd: number, rate: number): number {
  return Math.round(amountUsd * rate * 100) / 100;
}

export function formatMxn(pesos: number): string {
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pesos)} MXN`;
}

/** Hoy en Cancún como YYYY-MM-DD (para el mínimo de los campos de fecha). */
export function todayInCancun(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun' }).format(new Date());
}

/** Hora actual de Cancún como 'HH:MM', redondeada hacia arriba a 5 minutos (como el selector de hora). */
export function nextTimeSlotInCancun(): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Cancun', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)!.value);
  const total = Math.ceil((get('hour') * 60 + get('minute') + 1) / 5) * 5;
  if (total >= 24 * 60) return '24:00';
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Horas que faltan para 'YYYY-MM-DDTHH:MM' (hora local de Cancún), contadas desde ahora. */
export function hoursUntilCancun(localDateTime: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cancun',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
  // Las dos horas se leen como UTC "de pared": la diferencia sale en horas de Cancún.
  const now = Date.parse(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00Z`);
  return (Date.parse(`${localDateTime}:00Z`) - now) / 3_600_000;
}

/** 'YYYY-MM-DDTHH:MM' (hora local de Cancún) → "Fri, Oct 2, 2026, 3:45 PM". */
export function formatLocalDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${value}:00Z`));
}

/** 'YYYY-MM-DDTHH:MM' → "3:45 PM". */
export function formatLocalTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(`${value}:00Z`),
  );
}

/** 'YYYY-MM-DD' → "Fri, Oct 2, 2026" sin desfases de zona horaria. */
export function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

/** Instante ISO (UTC) → "Oct 15, 2026, 2:35 PM" en hora de Cancún. */
export function formatInstantCancun(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Cancun',
  }).format(new Date(value));
}

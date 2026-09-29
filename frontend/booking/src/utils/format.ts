const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function formatUsd(amount: number): string {
  return usd.format(amount);
}

/** Hoy en Cancún como YYYY-MM-DD (para el mínimo de los campos de fecha). */
export function todayInCancun(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun' }).format(new Date());
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

/** Clases de los controles de formulario del panel (mismo aspecto en todos los módulos). */
export function inputClass(invalid = false): string {
  return [
    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-brand-950 outline-none focus:ring-4 disabled:bg-fog-50 disabled:text-brand-900/50',
    invalid ? 'border-accent-500 focus:ring-accent-500/20' : 'border-fog-200 focus:border-brand-400 focus:ring-brand-300/25',
  ].join(' ');
}

export const primaryButton =
  'h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:outline-none';
export const secondaryButton =
  'h-10 rounded-lg border border-brand-300 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none';
export const ghostButton =
  'h-10 rounded-lg px-4 text-sm font-semibold text-brand-900 hover:bg-fog-100 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none';

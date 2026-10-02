/**
 * Abre el selector nativo (calendario / reloj) al hacer clic en cualquier parte
 * de un input de fecha u hora, no solo en su icono. Se usa como @click.
 *
 * showPicker() no existe en navegadores viejos y lanza si el input está
 * deshabilitado o si el clic no viene del usuario; en esos casos el campo se
 * comporta como siempre (se puede escribir o usar el icono).
 */
export function openNativePicker(event: MouseEvent): void {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) return;
  if (typeof input.showPicker !== 'function') return;
  try {
    input.showPicker();
  } catch {
    // Navegador sin soporte en este contexto: se queda el comportamiento nativo.
  }
}

/**
 * Abre el selector nativo (calendario / reloj) al hacer clic en cualquier parte
 * de un input de fecha u hora, no solo en su icono. Se usa como @click.
 * Igual que en el sitio de reservas (frontend/booking/src/utils/picker.ts).
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

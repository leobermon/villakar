import { onBeforeUnmount, ref } from 'vue';

/**
 * Copia texto al portapapeles y expone `copied` unos segundos para dar aviso.
 * navigator.clipboard solo existe en https/localhost; si no está (panel abierto
 * por http con la IP de la red), se usa el método clásico con un textarea.
 */
export function useClipboard(resetAfterMs = 2000) {
  const copied = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy(text: string): Promise<boolean> {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy(text);

    copied.value = ok;
    clearTimeout(timer);
    if (ok) timer = setTimeout(() => (copied.value = false), resetAfterMs);
    return ok;
  }

  onBeforeUnmount(() => clearTimeout(timer));
  return { copied, copy };
}

function legacyCopy(text: string): boolean {
  const active = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  active?.focus();
  return ok;
}

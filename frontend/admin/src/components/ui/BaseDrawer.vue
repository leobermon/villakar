<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';

/**
 * Panel lateral modal para ver/editar un registro. Maneja Escape, fondo
 * clicable, foco atrapado dentro del panel y devuelve el foco al elemento que
 * lo abrió al cerrarse.
 */
/** size lg: panel más ancho, para registros con mucha información (p. ej. órdenes). */
const props = defineProps<{ open: boolean; title: string; subtitle?: string; size?: 'md' | 'lg' }>();
const emit = defineEmits<{ close: [] }>();

const titleId = useId();
const panel = ref<HTMLElement | null>(null);
let returnFocusTo: HTMLElement | null = null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Escape se escucha en la ventana: funciona aunque el foco haya quedado fuera
// del panel (p. ej. si el campo enfocado desapareció al reiniciar un formulario).
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTo = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onWindowKeydown);
      await nextTick();
      panel.value?.focus();
    } else {
      window.removeEventListener('keydown', onWindowKeydown);
      document.body.style.overflow = '';
      // Si el elemento que lo abrió ya no existe (p. ej. la fila salió del filtro
      // al cambiar de estado), el foco va al contenido principal.
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
      else document.getElementById('main')?.focus();
      returnFocusTo = null;
    }
  },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown);
  document.body.style.overflow = '';
});

/** Mantiene el Tab dentro del panel (Escape lo maneja la ventana). */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !panel.value) return;
  // Mantiene el Tab dentro del panel.
  const focusable = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 motion-reduce:transition-none"
      leave-active-class="transition duration-150 motion-reduce:transition-none"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="props.open" class="fixed inset-0 z-50 flex justify-end">
        <div class="absolute inset-0 bg-brand-950/35" aria-hidden="true" @click="emit('close')" />
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          class="relative flex h-full w-full flex-col bg-white shadow-2xl outline-none"
          :class="props.size === 'lg' ? 'max-w-3xl' : 'max-w-xl'"
          @keydown="onKeydown"
        >
          <header class="flex items-start justify-between gap-4 border-b border-fog-200 px-5 py-4">
            <div class="min-w-0">
              <h2 :id="titleId" class="truncate text-lg font-bold text-brand-950">{{ props.title }}</h2>
              <p v-if="props.subtitle" class="text-sm text-brand-900/60">{{ props.subtitle }}</p>
              <slot name="header" />
            </div>
            <button
              type="button"
              class="grid size-9 shrink-0 place-items-center rounded-lg text-brand-900/60 hover:bg-fog-100 hover:text-brand-950 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>

          <div class="flex-1 overflow-y-auto px-5 py-5">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="border-t border-fog-200 bg-fog-50 px-5 py-3">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

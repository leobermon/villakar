<script setup lang="ts">
import { ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';

const props = withDefaults(defineProps<{ text: string; label?: string; size?: 'sm' | 'md' }>(), {
  label: 'Copiar',
  size: 'md',
});

const { copied, copy } = useClipboard();
const failed = ref(false);

async function onClick() {
  failed.value = !(await copy(props.text));
}
</script>

<template>
  <button
    type="button"
    class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
    :class="[
      props.size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-4 text-sm',
      copied ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700',
    ]"
    @click.stop="onClick"
  >
    <svg v-if="copied" viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
    <svg v-else viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </svg>
    {{ copied ? 'Copiado' : failed ? 'No se pudo copiar' : props.label }}
    <!-- Aviso para lectores de pantalla al copiar. -->
    <span class="sr-only" aria-live="polite">{{ copied ? 'Link copiado al portapapeles' : '' }}</span>
  </button>
</template>

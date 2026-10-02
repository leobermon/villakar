<script setup lang="ts">
import type { BadgeTone } from './badge';

const props = defineProps<{ label: string; tone: BadgeTone }>();

// Cada tono lleva un punto de color además del texto: el estado no depende solo del color.
const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-fog-100 text-brand-900/75', dot: 'bg-brand-900/40' },
  info: { badge: 'bg-brand-50 text-brand-800', dot: 'bg-brand-400' },
  brand: { badge: 'bg-brand-100 text-brand-900', dot: 'bg-brand-600' },
  success: { badge: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  danger: { badge: 'bg-accent-50 text-accent-600', dot: 'bg-accent-500' },
};
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" :class="TONES[props.tone].badge">
    <span class="size-1.5 rounded-full" :class="TONES[props.tone].dot" aria-hidden="true" />
    {{ props.label }}
  </span>
</template>

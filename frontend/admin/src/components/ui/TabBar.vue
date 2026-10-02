<script setup lang="ts" generic="T extends string">
/**
 * Pestañas accesibles (role="tablist"). Cada panel debe tener
 * id="panel-<value>" y aria-labelledby="tab-<value>".
 */
const props = defineProps<{ tabs: ReadonlyArray<{ value: T; label: string; count?: number }>; label: string }>();
const model = defineModel<T>({ required: true });

function onKeydown(event: KeyboardEvent, index: number) {
  // Flechas izquierda/derecha para moverse entre pestañas.
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  const step = event.key === 'ArrowRight' ? 1 : -1;
  const next = props.tabs[(index + step + props.tabs.length) % props.tabs.length]!;
  model.value = next.value;
  document.getElementById(`tab-${next.value}`)?.focus();
}
</script>

<template>
  <!-- overflow-y-hidden: el subrayado activo (-mb-px) no debe generar barra vertical. -->
  <div class="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-fog-200" role="tablist" :aria-label="props.label">
    <button
      v-for="(option, index) in props.tabs"
      :id="`tab-${option.value}`"
      :key="option.value"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      :aria-controls="`panel-${option.value}`"
      :tabindex="model === option.value ? 0 : -1"
      class="-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition focus-visible:bg-fog-100 focus-visible:outline-none"
      :class="model === option.value ? 'border-brand-600 text-brand-950' : 'border-transparent text-brand-900/60 hover:text-brand-950'"
      @click="model = option.value"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="rounded-md bg-fog-100 px-1.5 text-xs text-brand-900/60 tabular-nums">{{ option.count }}</span>
    </button>
  </div>
</template>

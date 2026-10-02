<script setup lang="ts">
/** Interruptor accesible (role="switch") para activar/desactivar registros. */
const props = defineProps<{ label: string; disabled?: boolean }>();
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="props.label"
    :disabled="props.disabled"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
    :class="model ? 'bg-brand-600' : 'bg-fog-200'"
    @click.stop="model = !model"
  >
    <span class="inline-block size-5 rounded-full bg-white shadow transition-transform" :class="model ? 'translate-x-5.5' : 'translate-x-0.5'" />
  </button>
</template>

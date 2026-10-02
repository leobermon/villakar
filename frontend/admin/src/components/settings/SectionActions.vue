<script setup lang="ts">
import { ghostButton, primaryButton } from '@/utils/formStyles';

/** Pie de cada sección de configuración: estado y botones Descartar / Guardar. */
const props = defineProps<{ dirty: boolean; saving: boolean; saved: boolean; message?: string | null }>();
const emit = defineEmits<{ save: []; reset: [] }>();
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-fog-200 pt-4">
    <p class="text-sm" aria-live="polite">
      <span v-if="props.message" class="font-medium text-accent-600" role="alert">{{ props.message }}</span>
      <span v-else-if="props.dirty" class="font-medium text-amber-700">Cambios sin guardar</span>
      <span v-else-if="props.saved" class="font-medium text-emerald-700">Guardado</span>
    </p>
    <div class="flex gap-2">
      <button type="button" :class="ghostButton" :disabled="!props.dirty || props.saving" @click="emit('reset')">Descartar</button>
      <button type="submit" :class="primaryButton" :disabled="!props.dirty || props.saving" @click.prevent="emit('save')">
        {{ props.saving ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </div>
  </div>
</template>

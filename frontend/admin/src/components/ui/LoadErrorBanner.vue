<script setup lang="ts">
/** Aviso cuando no se pudieron cargar los datos del módulo, con botón para reintentar. */
const props = defineProps<{ message: string | null }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="props.message" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-500/30 bg-accent-50 px-4 py-3 text-sm">
    <span class="font-medium text-accent-600">{{ props.message }}</span>
    <button type="button" class="font-semibold text-brand-700 underline underline-offset-2" @click="emit('retry')">Reintentar</button>
  </div>
</template>

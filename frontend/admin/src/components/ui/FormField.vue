<script setup lang="ts">
import { useId } from 'vue';

/**
 * Etiqueta + control + ayuda/error. El control recibe `id` (y `describedBy`)
 * por el slot para quedar asociado a su etiqueta y a su mensaje:
 *   <FormField label="Nombre" :error="errors.name" v-slot="{ id, describedBy }">
 *     <input :id="id" :aria-describedby="describedBy" … />
 *   </FormField>
 */
const props = defineProps<{ label: string; error?: string | null; hint?: string; optional?: boolean }>();

const id = useId();
const messageId = `${id}-message`;
</script>

<template>
  <div>
    <label :for="id" class="mb-1 block text-xs font-semibold text-brand-900/70">
      {{ props.label }} <span v-if="props.optional" class="font-normal">(opcional)</span>
    </label>
    <slot :id="id" :described-by="props.error || props.hint ? messageId : undefined" :invalid="Boolean(props.error)" />
    <p v-if="props.error" :id="messageId" class="mt-1 text-xs font-medium text-accent-600">{{ props.error }}</p>
    <p v-else-if="props.hint" :id="messageId" class="mt-1 text-xs text-brand-900/55">{{ props.hint }}</p>
  </div>
</template>

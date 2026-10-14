<script setup lang="ts">
import { useId } from 'vue';

const accepted = defineModel<boolean>({ required: true });
const id = useId();
</script>

<template>
  <!-- `required` hace que el navegador bloquee el envío sin aceptar los términos. -->
  <div class="flex items-start gap-2.5 text-left">
    <input
      :id="id"
      v-model="accepted"
      type="checkbox"
      required
      class="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-700"
    />
    <label :for="id" class="cursor-pointer text-xs leading-relaxed text-brand-900/80">
      I have read and agree to the
      <!-- Nueva pestaña para no perder los datos ya capturados en el formulario. -->
      <RouterLink
        :to="{ name: 'terms' }"
        target="_blank"
        class="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
      >Terms and Conditions</RouterLink>
      including the Force Majeure and Third-Party Liability clause
    </label>
  </div>
</template>

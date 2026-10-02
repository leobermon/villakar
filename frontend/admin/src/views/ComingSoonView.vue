<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <section class="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-fog-200 bg-white p-8 text-center">
    <h2 class="text-lg font-bold">{{ route.meta.title }}</h2>
    <p class="mt-2 text-sm text-brand-900/65">Este módulo se construirá en la siguiente etapa del panel.</p>
    <RouterLink
      :to="{ name: 'orders' }"
      class="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
    >
      Ir a Órdenes
    </RouterLink>
  </section>
</template>

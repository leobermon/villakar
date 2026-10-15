<script setup lang="ts">
import PaymentBadges from '@/components/layout/PaymentBadges.vue';
import { SITE } from '@/config';

const year = new Date().getFullYear();

/** Destinos que atendemos desde el aeropuerto de Cancún. */
const DESTINATIONS = [
  'Cancun',
  'Costa Mujeres',
  'Playa Mujeres',
  'Puerto Morelos',
  'Bahía Petempich',
  'Playa del Carmen',
  'Akumal',
  'Tulum',
];
</script>

<template>
  <footer class="mt-auto border-t border-brand-100 bg-white print:hidden">
    <div class="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 md:grid-cols-2">
      <section>
        <h2 class="text-xs font-semibold tracking-wide text-brand-800 uppercase">Payment Methods</h2>
        <PaymentBadges class="mt-2.5" />
      </section>

      <section>
        <h2 class="text-xs font-semibold tracking-wide text-brand-800 uppercase">Destinations we serve</h2>
        <ul class="mt-2 grid list-disc grid-cols-2 gap-x-6 gap-y-1 pl-4 text-sm text-brand-950 marker:text-brand-500 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          <li v-for="place in DESTINATIONS" :key="place">{{ place }}</li>
        </ul>
      </section>
    </div>

    <div class="border-t border-brand-100">
      <div class="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-xs text-brand-900/60 sm:flex-row sm:justify-between sm:px-6">
        <p>© {{ year }} {{ SITE.name }} · Cancun & Riviera Maya</p>
        <p>
          Prices in USD ·
          <RouterLink :to="{ name: 'terms' }" class="underline underline-offset-2 hover:text-brand-800">Terms and Conditions</RouterLink>
        </p>
      </div>
    </div>
  </footer>
</template>

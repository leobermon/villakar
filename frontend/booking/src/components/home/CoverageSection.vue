<script setup lang="ts">
import HeadingStripes from '@/components/home/HeadingStripes.vue';

/**
 * Cobertura en Quintana Roo: las zonas principales como tarjetas, debajo del
 * buscador, con una postal por destino; cada tarjeta muestra el tiempo
 * aproximado de manejo desde el aeropuerto.
 */

interface CoverageArea {
  name: string;
  text: string;
  /** Dato corto en la tarjeta (tiempo aproximado o punto de encuentro). */
  badge: string;
  image: string;
}

// Tiempos aproximados sin tráfico desde el aeropuerto de Cancún (CUN).
const AREAS: CoverageArea[] = [
  {
    name: 'Cancun Airport',
    text: 'Your driver waits at arrivals in Terminals 2, 3 and 4 holding a sign with your name.',
    badge: 'Meet & greet at arrivals',
    image: '/destinations/cancun-airport.jpg',
  },
  {
    name: 'Cancun Hotel Zone',
    text: 'Every resort along Kukulcan Boulevard, from Punta Cancun to Punta Nizuc.',
    badge: 'About 20 min from the airport',
    image: '/destinations/cancun.jpg',
  },
  {
    name: 'Puerto Morelos',
    text: 'Quiet beaches and reef-front resorts just south of Cancun.',
    badge: 'About 25 min',
    image: '/destinations/puerto-morelos.jpg',
  },
  {
    name: 'Playa del Carmen',
    text: 'Fifth Avenue, Playacar and the resorts around town.',
    badge: 'About 45 min',
    image: '/destinations/playa-del-carmen.jpg',
  },
  {
    name: 'Tulum',
    text: 'Beach-road boutique hotels and downtown Tulum.',
    badge: 'About 1 h 30 min',
    image: '/destinations/tulum.jpg',
  },
  {
    name: 'Akumal',
    text: 'Calm turtle bay and beach resorts, south of Playa del Carmen.',
    badge: 'About 1 h 15 min',
    image: '/destinations/akumal.jpg',
  },
];

const ALSO_SERVED = ['Puerto Juarez', 'Playa Mujeres', 'Costa Mujeres', 'Puerto Aventuras'];

</script>

<template>
  <section class="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="coverage-title">
    <div>
      <div>
        <div class="flex items-center gap-3 sm:gap-4">
          <HeadingStripes />
          <h2 id="coverage-title" class="font-display text-3xl leading-tight font-bold text-balance text-brand-950 sm:text-4xl md:whitespace-nowrap">
            We go wherever your vacation takes you
          </h2>
        </div>
        <p class="mt-3 max-w-2xl text-base text-brand-900/75">
          Private door-to-door transfers across Quintana Roo, from Cancun Airport to the Hotel Zone, the Riviera Maya and
          Tulum.
        </p>
      </div>
    </div>

    <ul class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <li
        v-for="area in AREAS"
        :key="area.name"
        class="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white"
      >
        <!-- Postal completa (4:3, sin recorte): el texto de la imagen forma parte del diseño. -->
        <div class="relative aspect-[4/3] overflow-hidden bg-brand-900">
          <img
            :src="area.image"
            :alt="area.name"
            width="2000"
            height="1500"
            loading="lazy"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="flex-1 p-3">
          <span class="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{{ area.badge }}</span>
          <h3 class="mt-2 font-display text-sm font-semibold text-brand-950">{{ area.name }}</h3>
          <p class="mt-1 text-xs leading-snug text-brand-900/70">{{ area.text }}</p>
        </div>
      </li>
    </ul>

    <p class="mt-6 text-sm text-brand-900/70">
      We also serve {{ ALSO_SERVED.slice(0, -1).join(', ') }} and {{ ALSO_SERVED.at(-1) }}. Going somewhere else?
      <RouterLink :to="{ name: 'contact' }" class="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
        Ask us for a quote
      </RouterLink>
    </p>
  </section>
</template>

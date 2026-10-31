<script setup lang="ts">
import { RouterLink } from 'vue-router';
import HeadingStripes from '@/components/home/HeadingStripes.vue';
import { destinationPath } from '@/content/destinations';

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
  /** Si tiene página de destino (content/destinations.ts), la tarjeta lleva a ella. */
  slug?: string;
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
    slug: 'cancun',
  },
  {
    name: 'Puerto Morelos',
    text: 'Quiet beaches and reef-front resorts just south of Cancun.',
    badge: 'About 25 min',
    image: '/destinations/puerto-morelos.jpg',
    slug: 'puerto-morelos',
  },
  {
    name: 'Playa del Carmen',
    text: 'Fifth Avenue, Playacar and the resorts around town.',
    badge: 'About 45 min',
    image: '/destinations/playa-del-carmen.jpg',
    slug: 'playa-del-carmen',
  },
  {
    name: 'Tulum',
    text: 'Beach-road boutique hotels and downtown Tulum.',
    badge: 'About 1 h 30 min',
    image: '/destinations/tulum.jpg',
    slug: 'tulum',
  },
  {
    name: 'Akumal',
    text: 'Calm turtle bay and beach resorts, south of Playa del Carmen.',
    badge: 'About 1 h 15 min',
    image: '/destinations/akumal.jpg',
    slug: 'akumal',
  },
];

/** Otras zonas que se atienden; las que tienen página de destino llevan un enlace. */
const ALSO_SERVED: Array<{ name: string; slug?: string }> = [
  { name: 'Puerto Juarez' },
  { name: 'Playa Mujeres', slug: 'playa-mujeres' },
  { name: 'Costa Mujeres', slug: 'costa-mujeres' },
  { name: 'Bahia Petempich', slug: 'bahia-petempich' },
  { name: 'Puerto Aventuras' },
];

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
        class="flex"
      >
        <component
          :is="area.slug ? RouterLink : 'div'"
          v-bind="area.slug ? { to: destinationPath(area.slug), 'aria-label': `${area.name}: route, time and photos` } : {}"
          class="group flex w-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white"
          :class="area.slug ? 'transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-950/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0' : ''"
        >
        <!-- Postal completa (4:3, sin recorte): el texto de la imagen forma parte del diseño. -->
        <div class="relative aspect-[4/3] overflow-hidden bg-brand-900">
          <img
            :src="area.image"
            :alt="area.name"
            width="2000"
            height="1500"
            loading="lazy"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div class="flex-1 p-3">
          <span class="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{{ area.badge }}</span>
          <h3 class="mt-2 font-display text-sm font-semibold text-brand-950">{{ area.name }}</h3>
          <p class="mt-1 text-xs leading-snug text-brand-900/70">{{ area.text }}</p>
          <span v-if="area.slug" class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:underline">
            Route and details <span aria-hidden="true">→</span>
          </span>
        </div>
        </component>
      </li>
    </ul>

    <p class="mt-6 text-sm text-brand-900/70">
      We also serve
      <template v-for="(place, index) in ALSO_SERVED" :key="place.name">
        <RouterLink
          v-if="place.slug"
          :to="destinationPath(place.slug)"
          class="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >{{ place.name }}</RouterLink
        ><template v-else>{{ place.name }}</template
        ><template v-if="index < ALSO_SERVED.length - 2">, </template
        ><template v-else-if="index === ALSO_SERVED.length - 2"> and </template>
      </template
      >. Going somewhere else?
      <RouterLink :to="{ name: 'contact' }" class="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
        Ask us for a quote
      </RouterLink>
    </p>
  </section>
</template>

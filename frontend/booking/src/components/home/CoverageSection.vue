<script setup lang="ts">
/**
 * Cobertura en Quintana Roo: las zonas principales como tarjetas, debajo del
 * buscador. Las ilustraciones son de línea (sin fotos todavía); cada tarjeta
 * muestra el tiempo aproximado de manejo desde el aeropuerto.
 */

interface CoverageArea {
  name: string;
  text: string;
  /** Dato corto en la tarjeta (tiempo aproximado o punto de encuentro). */
  badge: string;
  icon: 'plane' | 'hotel' | 'lighthouse' | 'palm' | 'pyramid';
  /** Tarjetas anchas en la primera fila en pantallas grandes. */
  wide?: boolean;
}

// Tiempos aproximados sin tráfico desde el aeropuerto de Cancún (CUN).
const AREAS: CoverageArea[] = [
  {
    name: 'Cancun Airport',
    text: 'Your driver waits at arrivals in Terminals 2, 3 and 4 with a sign with your name.',
    badge: 'Meet & greet at arrivals',
    icon: 'plane',
    wide: true,
  },
  {
    name: 'Cancun Hotel Zone',
    text: 'Every resort along Kukulcan Boulevard, from Punta Cancun to Punta Nizuc.',
    badge: 'About 20 min from the airport',
    icon: 'hotel',
    wide: true,
  },
  {
    name: 'Puerto Morelos',
    text: 'Quiet beaches and reef-front resorts just south of Cancun.',
    badge: 'About 25 min',
    icon: 'lighthouse',
  },
  {
    name: 'Playa del Carmen',
    text: 'Fifth Avenue, Playacar and the resorts around town.',
    badge: 'About 45 min',
    icon: 'palm',
  },
  {
    name: 'Tulum',
    text: 'Beach-road boutique hotels and downtown Tulum.',
    badge: 'About 1 h 30 min',
    icon: 'pyramid',
  },
];

const ALSO_SERVED = ['Puerto Juarez', 'Playa Mujeres', 'Costa Mujeres', 'Puerto Aventuras', 'Akumal'];

/** Lleva al buscador y deja el cursor en el campo del hotel. */
function goToSearch() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  const hotelInput = form.querySelector<HTMLInputElement>('input[role="combobox"]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    form.scrollIntoView({ block: 'start' });
    hotelInput?.focus({ preventScroll: true });
    return;
  }

  // Enfocar durante el desplazamiento suave lo cancela: se enfoca al terminar
  // (scrollend; con respaldo por tiempo para navegadores que no lo tienen).
  let focused = false;
  const focusHotel = () => {
    if (focused) return;
    focused = true;
    // Si la animación no ocurrió (pestaña en segundo plano, etc.), salta directo.
    const top = form.getBoundingClientRect().top;
    if (top < -8 || top > window.innerHeight / 2) form.scrollIntoView({ block: 'start' });
    hotelInput?.focus({ preventScroll: true });
  };
  window.addEventListener('scrollend', focusHotel, { once: true });
  setTimeout(focusHotel, 1000);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 pt-16 sm:px-6" aria-labelledby="coverage-title">
    <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div class="max-w-2xl">
        <!-- Las tres franjas del ala del logo: el único acento rojo de la sección. -->
        <div class="flex w-14 flex-col gap-1" aria-hidden="true">
          <span class="h-1.5 w-full rounded-full bg-brand-600" />
          <span class="h-1.5 w-4/5 rounded-full bg-accent-500" />
          <span class="h-1.5 w-3/5 rounded-full bg-brand-400" />
        </div>
        <h2 id="coverage-title" class="mt-4 font-display text-3xl leading-tight font-bold text-balance text-brand-950 sm:text-4xl">
          We go wherever your vacation takes you
        </h2>
        <p class="mt-3 text-base text-brand-900/75">
          Private door-to-door transfers across Quintana Roo, from Cancun Airport to the Hotel Zone, the Riviera Maya and
          Tulum.
        </p>
      </div>
      <button
        type="button"
        class="h-11 shrink-0 self-start rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-300/40 focus-visible:outline-none md:self-auto"
        @click="goToSearch"
      >
        Check your price
      </button>
    </div>

    <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <li
        v-for="(area, index) in AREAS"
        :key="area.name"
        class="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white"
        :class="[area.wide ? 'lg:col-span-3' : 'lg:col-span-2', index === 0 ? 'sm:col-span-2 lg:col-span-3' : '']"
      >
        <div
          class="relative flex min-h-20 items-end justify-between gap-4 px-5 pt-4 pb-4 text-white sm:min-h-32 sm:pt-6"
          :class="[
            index === 0 ? 'bg-brand-950' : 'bg-gradient-to-br from-brand-600 to-brand-800',
            area.wide ? 'lg:min-h-36' : '',
          ]"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-10 shrink-0 opacity-95 sm:size-14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              v-if="area.icon === 'plane'"
              fill="currentColor"
              stroke="none"
              d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"
            />
            <path
              v-else-if="area.icon === 'hotel'"
              d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2.5 21h19M7.5 8h4M7.5 12h4M7.5 16h4M17.5 14h.01M17.5 17h.01"
            />
            <path
              v-else-if="area.icon === 'lighthouse'"
              d="M10 21l1-12h2l1 12M9 9h6M10 9V6.5L12 4l2 2.5V9M3 21h18M6.5 6.5 4 5.5M17.5 6.5 20 5.5M10.5 14h3"
            />
            <path
              v-else-if="area.icon === 'palm'"
              d="M12 21c0-5 .6-9 2.2-12M14.2 9C13 6 10 5 7 6M14.2 9c1.3-3 4.3-3.8 7-2M14.2 9c-3 .2-5 2.1-5.8 4.5M14.2 9c3 .3 4.8 2.4 5 5.2M3 21h18"
            />
            <path
              v-else
              d="M2.5 21h19M5 21l1.8-4h10.4L19 21M7.2 17l1.8-4h6l1.8 4M9.4 13l1.3-3h2.6l1.3 3M11 10V8h2v2"
            />
          </svg>
          <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{{ area.badge }}</span>
        </div>
        <div class="flex-1 p-5">
          <h3 class="font-display text-lg font-semibold text-brand-950">{{ area.name }}</h3>
          <p class="mt-1 text-sm text-brand-900/70">{{ area.text }}</p>
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

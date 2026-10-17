<script setup lang="ts">
import HeadingStripes from '@/components/home/HeadingStripes.vue';

/**
 * Servicios especiales en la portada (sobre la flota). Las fotos viven en
 * public/services; cada tarjeta lleva a la página de contacto para cotizar.
 */
const SERVICES = [
  {
    key: 'tours',
    title: 'Tours',
    tagline: 'Chichen Itza, cenotes, Tulum and more',
    text: 'Explore the Riviera Maya with a private driver. Your group, your schedule, no crowded buses.',
    image: '/services/tours.jpg',
    position: 'object-[35%_center]',
  },
  {
    key: 'large-group',
    title: 'Large groups',
    tagline: 'Vans and buses for every size',
    text: 'Friends, families or teams of any size, all arriving together in comfort and on time.',
    image: '/services/large-group.jpg',
    position: 'object-center',
  },
  {
    key: 'special-events',
    title: 'Special events',
    tagline: 'Weddings, parties and celebrations',
    text: 'Guest shuttles and arrivals for your big day, coordinated so everyone gets there smiling.',
    image: '/services/special-events.jpg',
    position: 'object-[55%_center]',
  },
];
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="services-title">
    <div class="max-w-2xl">
      <p class="text-sm font-semibold tracking-[0.2em] text-brand-600 uppercase">More than airport rides</p>
      <div class="mt-2 flex items-center gap-3 sm:gap-4">
        <HeadingStripes />
        <h2 id="services-title" class="font-display text-3xl leading-tight font-bold text-balance text-brand-950 sm:text-4xl">
          Services made for your trip
        </h2>
      </div>
      <p class="mt-3 text-base text-brand-900/75">
        Tours, large groups and special events, all with the same private service and a price confirmed upfront.
      </p>
    </div>

    <ul class="mt-8 grid gap-5 md:grid-cols-3">
      <li v-for="service in SERVICES" :key="service.key">
        <RouterLink
          :to="{ name: 'contact' }"
          class="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg shadow-brand-950/10 ring-1 ring-brand-950/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-950/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <!-- Foto casi completa (proporción cercana a la original) para que no se vea con zoom. -->
          <div class="relative aspect-[9/4] overflow-hidden bg-brand-900">
            <img
              :src="service.image"
              :alt="`${service.title}: ${service.tagline}`"
              width="1800"
              height="700"
              loading="lazy"
              :class="[
                'h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100',
                service.position,
              ]"
            />
            <div
              class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-950/40 to-transparent"
              aria-hidden="true"
            />
          </div>

          <div class="flex flex-1 flex-col p-6">
            <p class="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">{{ service.tagline }}</p>
            <h3 class="mt-1 font-display text-3xl font-bold text-brand-950">{{ service.title }}</h3>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-brand-900/75">{{ service.text }}</p>
            <span
              class="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:gap-3 group-hover:bg-brand-700"
            >
              Request a quote
              <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.69l-3.22-3.22a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

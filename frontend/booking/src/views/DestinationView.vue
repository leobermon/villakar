<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import RouteMap from '@/components/destinations/RouteMap.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { AIRPORT, DESTINATIONS, destinationBySlug, destinationPath, photoUrl } from '@/content/destinations';

const route = useRoute();
// El guard de la ruta garantiza que el destino existe.
const destination = computed(() => destinationBySlug(route.params.slug)!);
const others = computed(() => DESTINATIONS.filter((item) => item.slug !== destination.value.slug));
const photos = computed(() => [destination.value.hero, ...destination.value.gallery]);
</script>

<template>
  <div class="pb-16">
    <main>
      <!-- Portada del destino: foto, título y los datos clave del viaje -->
      <section class="relative isolate overflow-hidden bg-brand-900 text-white">
        <img
          :src="photoUrl(destination.hero.file)"
          :alt="destination.hero.alt"
          width="1280"
          class="absolute inset-0 -z-10 h-full w-full object-cover"
          :style="{ objectPosition: destination.hero.position ?? 'center' }"
          fetchpriority="high"
        />
        <div class="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/80 via-brand-950/35 to-brand-950/10" aria-hidden="true" />
        <!-- Sombra suave arriba: el logo y los enlaces blancos se leen sobre fotos claras. -->
        <div class="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-brand-950/55 to-transparent" aria-hidden="true" />
        <SiteHeader transparent />
        <div class="mx-auto flex min-h-[22rem] max-w-5xl flex-col justify-end px-4 pt-28 pb-8 sm:min-h-[26rem] sm:px-6">
          <p class="text-sm font-semibold tracking-[0.2em] text-brand-200 uppercase">Private transfer from Cancun Airport</p>
          <h1 class="mt-2 font-display text-4xl leading-tight font-bold sm:text-5xl">{{ destination.name }}</h1>
          <p class="mt-3 max-w-2xl text-lg text-white/90">{{ destination.tagline }}</p>
        </div>
      </section>

      <div class="mx-auto max-w-5xl px-4 sm:px-6">
        <!-- Datos del viaje -->
        <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl border border-t-0 border-brand-100 bg-brand-100 sm:grid-cols-3">
          <div class="bg-white px-5 py-4">
            <dt class="text-xs font-semibold tracking-wide text-brand-600 uppercase">Estimated time</dt>
            <dd class="mt-1 font-display text-2xl font-bold text-brand-950">{{ destination.time }}</dd>
          </div>
          <div class="bg-white px-5 py-4">
            <dt class="text-xs font-semibold tracking-wide text-brand-600 uppercase">Distance</dt>
            <dd class="mt-1 font-display text-2xl font-bold text-brand-950">
              {{ destination.distanceKm }}
              <span class="font-sans text-sm font-medium text-brand-900/60">({{ destination.distanceMi }})</span>
            </dd>
          </div>
          <div class="col-span-2 bg-white px-5 py-4 sm:col-span-1">
            <dt class="text-xs font-semibold tracking-wide text-brand-600 uppercase">Service</dt>
            <dd class="mt-1 font-display text-2xl font-bold text-brand-950">100% private</dd>
          </div>
        </dl>
        <p v-if="destination.note" class="mt-2 text-xs text-brand-900/60">{{ destination.note }}</p>

        <!-- Descripción y mapa -->
        <div class="mt-8 grid gap-8 lg:grid-cols-[1fr_26rem] lg:items-start">
          <article class="space-y-4 text-[15px] leading-relaxed text-brand-950/90">
            <h2 class="font-display text-2xl font-semibold text-brand-950">About {{ destination.shortName }}</h2>
            <p v-for="paragraph in destination.paragraphs" :key="paragraph">{{ paragraph }}</p>

            <h3 class="pt-2 font-display text-lg font-semibold text-brand-950">What to see and do</h3>
            <ul class="list-disc space-y-1 pl-5 marker:text-brand-500">
              <li v-for="item in destination.highlights" :key="item">{{ item }}</li>
            </ul>

            <h3 class="pt-2 font-display text-lg font-semibold text-brand-950">Good to know</h3>
            <ul class="list-disc space-y-1 pl-5 marker:text-brand-500">
              <li v-for="item in destination.goodToKnow" :key="item">{{ item }}</li>
            </ul>
          </article>

          <aside class="rounded-3xl border border-brand-100 bg-white p-4 lg:sticky lg:top-6">
            <h2 class="font-display text-lg font-semibold text-brand-950">The route</h2>
            <p class="mb-3 text-sm text-brand-900/70">{{ AIRPORT.name }} → {{ destination.shortName }}</p>
            <RouteMap :destination="destination" />
          </aside>
        </div>

        <!-- Fotos -->
        <section class="mt-10" aria-labelledby="photos-title">
          <h2 id="photos-title" class="font-display text-2xl font-semibold text-brand-950">Photos of {{ destination.shortName }}</h2>
          <!-- Dos fotos grandes arriba y las demás en fila de tres; con la foto principal suman 6. -->
          <ul class="mt-4 grid gap-4 sm:grid-cols-6">
            <li
              v-for="(photo, index) in destination.gallery"
              :key="photo.file"
              class="overflow-hidden rounded-2xl border border-brand-100 bg-white"
              :class="index < 2 ? 'sm:col-span-3' : 'sm:col-span-2'"
            >
              <img
                :src="photoUrl(photo.file)"
                :alt="photo.alt"
                width="1280"
                height="853"
                loading="lazy"
                class="aspect-[3/2] w-full object-cover"
                :style="{ objectPosition: photo.position ?? 'center' }"
              />
              <p v-if="photo.caption" class="px-4 py-3 text-sm font-medium text-brand-900/80">{{ photo.caption }}</p>
            </li>
          </ul>
        </section>

        <!-- Reservar -->
        <section class="mt-10 rounded-3xl bg-brand-950 px-6 py-8 text-center text-white sm:px-10">
          <h2 class="font-display text-2xl font-semibold">Book your private transfer to {{ destination.shortName }}</h2>
          <p class="mx-auto mt-2 max-w-xl text-sm text-white/75">
            See your price in seconds, pay online or in cash, and your driver will be waiting at the airport.
          </p>
          <div class="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <RouterLink
              :to="{ name: 'home', hash: '#booking-form' }"
              class="inline-flex h-11 items-center rounded-xl bg-white px-6 text-sm font-bold text-brand-900 hover:bg-brand-50"
            >
              Check your price
            </RouterLink>
            <RouterLink
              :to="{ name: 'contact' }"
              class="inline-flex h-11 items-center rounded-xl border border-white/30 px-6 text-sm font-bold text-white hover:bg-white/10"
            >
              Ask us a question
            </RouterLink>
          </div>
        </section>

        <!-- Otros destinos -->
        <section class="mt-10" aria-labelledby="others-title">
          <h2 id="others-title" class="font-display text-xl font-semibold text-brand-950">Other destinations</h2>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li v-for="item in others" :key="item.slug">
              <RouterLink
                :to="destinationPath(item.slug)"
                class="inline-flex rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                {{ item.shortName }} · {{ item.time.replace('About ', '') }}
              </RouterLink>
            </li>
          </ul>
        </section>

        <!-- Créditos de las fotos (licencias abiertas de Wikimedia Commons) -->
        <p class="mt-10 text-[11px] leading-relaxed text-brand-900/55">
          Photos:
          <template v-for="(photo, index) in photos" :key="photo.file">
            <a :href="photo.source" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-brand-800">{{ photo.author }}</a>
            ({{ photo.license }}) via Wikimedia Commons<template v-if="index < photos.length - 1">; </template>
          </template>.
        </p>
      </div>
    </main>
  </div>
</template>

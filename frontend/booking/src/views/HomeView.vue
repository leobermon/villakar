<script setup lang="ts">
import HeroSlider from '@/components/home/HeroSlider.vue';
import SearchForm from '@/components/booking/SearchForm.vue';
import CoverageSection from '@/components/home/CoverageSection.vue';
import FleetSection from '@/components/home/FleetSection.vue';
import ServicesSection from '@/components/home/ServicesSection.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';

const HIGHLIGHTS = [
  { title: 'Private transfers only', text: 'Your group travels alone. No shared shuttles and no stops at other hotels.' },
  { title: 'Price confirmed upfront', text: 'You see the total for your route and group before you pay, in US dollars.' },
  { title: 'Pay your way', text: 'Pay online by card or PayPal, or in cash to your driver after the service.' },
];
</script>

<template>
  <div class="pb-16">
    <section class="relative overflow-hidden bg-brand-900 pb-40 text-white sm:pb-44">
      <!-- Fotos de fondo en slider (para cambiarlas, edita SLIDES en HeroSlider.vue y los archivos de public/hero). -->
      <HeroSlider />
      <!-- Degradado azul desde la izquierda: el texto blanco se lee sobre la foto. -->
      <div
        class="absolute inset-0 bg-gradient-to-r from-brand-950/60 via-brand-900/25 to-transparent"
        aria-hidden="true"
      />
      <!-- Sombra suave arriba: el logo y "Contact" (blancos) se leen sobre fotos claras. -->
      <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-950/55 to-transparent" aria-hidden="true" />
      <svg
        class="absolute inset-x-0 bottom-0 h-24 w-full text-mist-50"
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0 64c160-32 320-48 480-32s320 64 480 64 320-48 480-64v64H0Z" />
      </svg>

      <SiteHeader transparent />

      <div class="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 sm:pt-36">
        <p class="text-sm font-semibold tracking-[0.2em] text-brand-200 uppercase">Cancun · Riviera Maya</p>
        <h1 class="mt-3 max-w-2xl font-display text-4xl leading-tight font-bold sm:text-5xl">
          Private airport transfers, booked in minutes
        </h1>
        <p class="mt-4 max-w-xl text-lg text-brand-100/90">
          From Cancun Airport to your hotel in Cancun, Playa del Carmen, Tulum and everywhere in between.
        </p>
      </div>
    </section>

    <div class="relative z-10 mx-auto -mt-32 max-w-7xl px-4 sm:px-6">
      <SearchForm />
    </div>

    <ServicesSection />

    <FleetSection />

    <section class="mx-auto max-w-7xl px-4 pt-10 sm:px-6" aria-label="Why book with us">
      <ul class="grid gap-2 sm:grid-cols-3 sm:gap-3">
        <li v-for="item in HIGHLIGHTS" :key="item.title" class="rounded-xl bg-white/70 px-4 py-2.5 ring-1 ring-brand-100">
          <h2 class="text-sm font-semibold text-brand-900">{{ item.title }}</h2>
          <p class="mt-0.5 text-xs leading-snug text-brand-900/65">{{ item.text }}</p>
        </li>
      </ul>
    </section>

    <CoverageSection />
  </div>
</template>

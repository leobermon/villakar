<script setup lang="ts">
import SearchForm from '@/components/booking/SearchForm.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';

const DESTINATIONS = [
  'Cancun',
  'Puerto Juarez',
  'Playa Mujeres',
  'Costa Mujeres',
  'Puerto Morelos',
  'Playa del Carmen',
  'Puerto Aventuras',
  'Akumal',
  'Tulum',
];

const HIGHLIGHTS = [
  { title: 'Private transfers only', text: 'Your group travels alone. No shared shuttles and no stops at other hotels.' },
  { title: 'Price confirmed upfront', text: 'You see the total for your route and group before you pay, in US dollars.' },
  { title: 'Pay your way', text: 'Pay online by card or PayPal, or in cash to your driver after the service.' },
];
</script>

<template>
  <div>
    <section class="relative overflow-hidden bg-brand-900 pb-40 text-white sm:pb-44">
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-500),transparent_60%),radial-gradient(ellipse_at_bottom_left,var(--color-brand-700),transparent_55%)] opacity-80"
        aria-hidden="true"
      />
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

      <div class="relative mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-36">
        <p class="text-sm font-semibold tracking-[0.2em] text-brand-200 uppercase">Cancun · Riviera Maya</p>
        <h1 class="mt-3 max-w-2xl font-display text-4xl leading-tight font-bold sm:text-5xl">
          Private airport transfers, booked in minutes
        </h1>
        <p class="mt-4 max-w-xl text-lg text-brand-100/90">
          From Cancun Airport to your hotel in Cancun, Playa del Carmen, Tulum and everywhere in between.
        </p>
      </div>
    </section>

    <div class="relative z-10 mx-auto -mt-32 max-w-6xl px-4 sm:px-6">
      <SearchForm />
    </div>

    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div class="grid gap-6 md:grid-cols-3">
        <div v-for="item in HIGHLIGHTS" :key="item.title" class="rounded-2xl bg-white p-6 shadow-sm">
          <h2 class="font-display text-lg font-semibold text-brand-900">{{ item.title }}</h2>
          <p class="mt-2 text-sm text-brand-900/70">{{ item.text }}</p>
        </div>
      </div>

      <div class="mt-14">
        <h2 class="font-display text-2xl font-semibold">Where we go</h2>
        <ul class="mt-5 flex flex-wrap gap-2">
          <li
            v-for="destination in DESTINATIONS"
            :key="destination"
            class="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-800"
          >
            {{ destination }}
          </li>
        </ul>
        <p class="mt-4 text-sm text-brand-900/60">
          Going somewhere else?
          <RouterLink :to="{ name: 'contact' }" class="font-semibold text-brand-700 underline underline-offset-2">
            Ask us for a quote
          </RouterLink>
        </p>
      </div>
    </section>
  </div>
</template>

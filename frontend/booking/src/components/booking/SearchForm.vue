<script setup lang="ts">
import { computed, reactive, useId, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { RouteType } from '@/api/booking';
import { SITE } from '@/config';
import { useBookingStore } from '@/stores/booking';
import { todayInCancun } from '@/utils/format';
import PassengerStepper from './PassengerStepper.vue';
import PlaceAutocomplete from './PlaceAutocomplete.vue';

const store = useBookingStore();
const router = useRouter();
const search = store.search;

const ROUTES: Array<{ value: RouteType; label: string }> = [
  { value: 'AIRPORT_HOTEL', label: 'Airport → Hotel' },
  { value: 'HOTEL_AIRPORT', label: 'Hotel → Airport' },
  { value: 'HOTEL_HOTEL', label: 'Hotel → Hotel' },
];

const errors = reactive<Record<string, string | null>>({});
const airportFieldId = useId();
const dateFieldId = useId();
const returnFieldId = useId();

const minDate = todayInCancun();

const labels = computed(() => {
  switch (search.route) {
    case 'AIRPORT_HOTEL':
      return { hotel: 'Drop-off hotel', date: 'Arrival date', returnDate: 'Departure date' };
    case 'HOTEL_AIRPORT':
      return { hotel: 'Pick-up hotel', date: 'Departure date', returnDate: 'Return date' };
    default:
      return { hotel: 'Pick-up hotel', date: 'Pick-up date', returnDate: 'Return date' };
  }
});

const involvesAirport = computed(() => search.route !== 'HOTEL_HOTEL');

// Al corregir un campo se quita su mensaje de error.
watch(() => search.hotel, () => (errors.hotel = null));
watch(() => search.secondHotel, () => (errors.secondHotel = null));
watch(() => search.date, () => (errors.date = null));
watch(() => search.returnDate, () => (errors.returnDate = null));

// Si la fecha de ida pasa a ser posterior al regreso, se limpia el regreso.
watch(
  () => search.date,
  (date) => {
    if (search.returnDate && date && search.returnDate < date) search.returnDate = '';
  },
);

function validate(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null;

  if (!search.hotel) errors.hotel = 'Select a hotel from the list.';
  if (search.route === 'HOTEL_HOTEL' && !search.secondHotel) errors.secondHotel = 'Select a hotel from the list.';
  if (!search.date) errors.date = 'Choose a date.';
  else if (search.date < minDate) errors.date = 'Date cannot be in the past.';
  if (search.tripType === 'ROUND_TRIP') {
    if (!search.returnDate) errors.returnDate = 'Choose a return date.';
    else if (search.returnDate < search.date) errors.returnDate = 'Must be on or after the first date.';
  }
  return Object.values(errors).every((message) => !message);
}

async function submit() {
  if (!validate()) return;
  if (await store.fetchQuote()) await router.push({ name: 'results' });
}

function goToContact(query: string) {
  router.push({ name: 'contact', query: query ? { hotel: query } : {} });
}
</script>

<template>
  <form class="rounded-3xl bg-white p-5 shadow-2xl shadow-brand-950/15 sm:p-7" novalidate @submit.prevent="submit">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="grid grid-cols-3 gap-1 rounded-2xl bg-brand-50 p-1" role="radiogroup" aria-label="Route">
        <button
          v-for="route in ROUTES"
          :key="route.value"
          type="button"
          role="radio"
          :aria-checked="search.route === route.value"
          class="rounded-xl px-2 py-2 text-xs font-semibold whitespace-nowrap transition sm:px-4 sm:text-sm"
          :class="
            search.route === route.value
              ? 'bg-white text-brand-900 shadow-sm'
              : 'text-brand-700/70 hover:text-brand-900'
          "
          @click="search.route = route.value"
        >
          {{ route.label }}
        </button>
      </div>

      <div class="flex gap-5 text-sm font-medium" role="radiogroup" aria-label="Trip type">
        <label v-for="option in [
            { value: 'ROUND_TRIP', label: 'Round trip' },
            { value: 'ONE_WAY', label: 'One way' },
          ] as const" :key="option.value" class="flex cursor-pointer items-center gap-2">
          <input v-model="search.tripType" type="radio" :value="option.value" class="size-4 accent-brand-600" />
          {{ option.label }}
        </label>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
      <!-- Aeropuerto fijo: siempre Cancún (origen o destino según la ruta) -->
      <div v-if="involvesAirport" class="lg:col-span-4" :class="search.route === 'HOTEL_AIRPORT' ? 'lg:order-2' : ''">
        <label :for="airportFieldId" class="mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase">
          {{ search.route === 'AIRPORT_HOTEL' ? 'Pick-up at' : 'Drop-off at' }}
        </label>
        <div class="relative">
          <svg
            class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-brand-500"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"
            />
          </svg>
          <input
            :id="airportFieldId"
            :value="SITE.airport.name"
            type="text"
            readonly
            class="h-12 w-full cursor-default truncate rounded-xl border border-brand-100 bg-brand-50 pr-3 pl-11 text-[15px] font-medium text-brand-900 outline-none"
          />
        </div>
      </div>

      <PlaceAutocomplete
        v-model="search.hotel"
        :class="[involvesAirport ? 'lg:col-span-6' : 'lg:col-span-5', search.route === 'HOTEL_AIRPORT' ? 'lg:order-1' : '']"
        :label="labels.hotel"
        :error="errors.hotel"
        @not-listed="goToContact"
      />

      <PlaceAutocomplete
        v-if="search.route === 'HOTEL_HOTEL'"
        v-model="search.secondHotel"
        class="lg:col-span-5"
        label="Drop-off hotel"
        :error="errors.secondHotel"
        @not-listed="goToContact"
      />

      <div class="lg:order-3 lg:col-span-2">
        <PassengerStepper v-model="search.passengers" :min="1" :max="SITE.maxPassengers" />
      </div>

      <div class="lg:order-4" :class="search.tripType === 'ROUND_TRIP' ? 'lg:col-span-4' : 'lg:col-span-8'">
        <label :for="dateFieldId" class="mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase">
          {{ labels.date }}
        </label>
        <input
          :id="dateFieldId"
          v-model="search.date"
          type="date"
          :min="minDate"
          class="h-12 w-full rounded-xl border bg-white px-3 text-[15px] shadow-sm outline-none focus:ring-4"
          :class="errors.date ? 'border-accent-500 focus:ring-accent-400/25' : 'border-brand-100 focus:border-brand-400 focus:ring-brand-300/30'"
        />
        <p v-if="errors.date" class="mt-1 text-xs font-medium text-accent-600">{{ errors.date }}</p>
      </div>

      <div v-if="search.tripType === 'ROUND_TRIP'" class="lg:order-5 lg:col-span-4">
        <label :for="returnFieldId" class="mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase">
          {{ labels.returnDate }}
        </label>
        <input
          :id="returnFieldId"
          v-model="search.returnDate"
          type="date"
          :min="search.date || minDate"
          class="h-12 w-full rounded-xl border bg-white px-3 text-[15px] shadow-sm outline-none focus:ring-4"
          :class="errors.returnDate ? 'border-accent-500 focus:ring-accent-400/25' : 'border-brand-100 focus:border-brand-400 focus:ring-brand-300/30'"
        />
        <p v-if="errors.returnDate" class="mt-1 text-xs font-medium text-accent-600">{{ errors.returnDate }}</p>
      </div>

      <div class="flex items-end md:col-span-2 lg:order-6 lg:col-span-4">
        <button
          type="submit"
          class="h-12 w-full rounded-xl bg-brand-600 px-6 text-[15px] font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
          :disabled="store.loading"
        >
          {{ store.loading ? 'Checking prices…' : 'See prices' }}
        </button>
      </div>
    </div>

    <p v-if="store.error" role="alert" class="mt-4 rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600">
      {{ store.error }}
    </p>

    <p class="mt-4 text-xs text-brand-900/60">
      Traveling with more than {{ SITE.maxPassengers }} people?
      <RouterLink :to="{ name: 'contact' }" class="font-semibold text-brand-700 underline underline-offset-2">
        Contact us for a group quote
      </RouterLink>
    </p>
  </form>
</template>

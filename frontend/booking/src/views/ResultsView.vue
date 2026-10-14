<script setup lang="ts">
import { computed } from 'vue';
import BookingForm from '@/components/booking/BookingForm.vue';
import ContactForm from '@/components/booking/ContactForm.vue';
import TripSummary from '@/components/booking/TripSummary.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { useBookingStore } from '@/stores/booking';

const store = useBookingStore();

// El guard de la ruta garantiza que hay cotización.
const quote = computed(() => store.quote!);

/** Hotel que quedó fuera de zona (para prellenar el formulario de contacto). */
const unservedHotel = computed(() => {
  const { origin, destination } = quote.value;
  const endpoint = !destination.zone ? destination : !origin.zone ? origin : destination;
  const place = [store.search.hotel, store.search.secondHotel].find((p) => p?.mainText === endpoint.name);
  return { name: endpoint.name, googlePlaceId: place?.googlePlaceId };
});

const contactCopy = computed(() =>
  quote.value.reason === 'OUT_OF_SERVICE_AREA'
    ? {
        title: 'This location is outside our online booking zones',
        intro: 'We can still take you there. Send us your details and we will reply with a personalized quote.',
      }
    : {
        title: 'We need to quote this route personally',
        intro: 'Online prices are not available for this route or group size yet. Send us your details and we will reply with a quote.',
      },
);
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <!-- Elección de vehículo, datos del pasajero y pago en una sola página; el resumen del viaje va en la columna del total. -->
      <BookingForm v-if="quote.serviceable && store.selectedOption" />

      <template v-else>
        <!-- Sin precio en línea: el resumen arriba explica qué lugar quedó fuera de zona. -->
        <TripSummary :quote="quote" :search="store.search" />
        <ContactForm
          class="mt-8"
          :title="contactCopy.title"
          :intro="contactCopy.intro"
          :hotel-name="unservedHotel.name"
          :google-place-id="unservedHotel.googlePlaceId"
          :arrival-date="store.search.date"
          :passengers="quote.passengers"
        />
      </template>
    </main>
  </div>
</template>

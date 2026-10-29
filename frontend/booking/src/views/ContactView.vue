<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ContactForm from '@/components/booking/ContactForm.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';

const route = useRoute();
const hotel = computed(() => (typeof route.query.hotel === 'string' ? route.query.hotel.slice(0, 190) : ''));
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <ContactForm
        title="Request a personalized quote"
        intro="Is your hotel not on the list, or do you have a large group or a special route? Tell us about your trip and we will reply by email."
        :hotel-name="hotel"
      />
    </main>
  </div>
</template>

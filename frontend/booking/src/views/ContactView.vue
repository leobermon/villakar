<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { trackWhatsAppClick } from '@/analytics';
import ContactForm from '@/components/booking/ContactForm.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import WhatsAppIcon from '@/components/layout/WhatsAppIcon.vue';
import { SITE } from '@/config';
import { useWhatsApp } from '@/utils/whatsapp';

const route = useRoute();
// El número es el teléfono de Configuración → Empresa; el botón aparece cuando ya se conoce.
const { url } = useWhatsApp();
const whatsappHref = computed(() => url(SITE.whatsapp.contactMessage));
const hotel = computed(() => (typeof route.query.hotel === 'string' ? route.query.hotel.slice(0, 190) : ''));
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <!-- Vía rápida: abre WhatsApp con el mensaje ya escrito. -->
      <div class="mb-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-display text-lg font-semibold text-brand-950">Prefer a quick answer?</h2>
          <p class="mt-1 text-sm text-brand-900/75">Message us on WhatsApp. Service hours: {{ SITE.serviceHours.label }}.</p>
        </div>
        <a
          v-if="whatsappHref"
          :href="whatsappHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#61d566] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-950/15 transition hover:bg-[#4fc355] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f9e44]"
          @click="trackWhatsAppClick"
        >
          <WhatsAppIcon class="h-5 w-5" />
          Message us on WhatsApp
        </a>
      </div>
      <ContactForm
        title="Request a personalized quote"
        intro="Is your hotel not on the list, or do you have a large group or a special route? Tell us about your trip and we will reply by email."
        :hotel-name="hotel"
      />
    </main>
  </div>
</template>

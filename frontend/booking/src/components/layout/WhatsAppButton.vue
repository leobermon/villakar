<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { analyticsEnabled, consent, trackWhatsAppClick } from '@/analytics';
import WhatsAppIcon from '@/components/layout/WhatsAppIcon.vue';
import { SITE } from '@/config';
import { useWhatsApp } from '@/utils/whatsapp';

/**
 * Abre un chat de WhatsApp con el negocio y el mensaje ya escrito; el cliente solo le da enviar.
 * En pantallas grandes trae el texto "Chat on WhatsApp" con una x para dejar solo el icono (ocupa menos);
 * la elección se recuerda en el navegador. En celular siempre es solo el icono.
 */
// El número es el teléfono de Configuración → Empresa; el botón aparece cuando ya se conoce.
const { url } = useWhatsApp();
const href = computed(() => url(SITE.whatsapp.message));

// En /contact ya hay un botón de WhatsApp dentro de la página.
const route = useRoute();

const COLLAPSED_KEY = 'whatsapp_collapsed';
const collapsed = ref(false);

// Se lee al montar (no en el prerenderizado) para que el HTML de Google y el del navegador coincidan.
onMounted(() => {
  try {
    collapsed.value = localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    // Sin localStorage: se queda abierto.
  }
});

function collapse(): void {
  collapsed.value = true;
  try {
    localStorage.setItem(COLLAPSED_KEY, '1');
  } catch {
    // La elección vale solo en esta visita.
  }
}
</script>

<template>
  <div
    v-if="route.name !== 'contact' && href"
    :class="analyticsEnabled && consent === null ? 'bottom-44 sm:bottom-36' : 'bottom-4'"
    class="fixed right-4 z-40 print:hidden"
  >
    <a
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      :class="collapsed ? 'sm:p-3.5' : 'sm:px-4 sm:py-3'"
      class="inline-flex items-center gap-2 rounded-full bg-[#61d566] p-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-950/25 transition hover:bg-[#4fc355] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f9e44]"
      @click="trackWhatsAppClick"
    >
      <WhatsAppIcon class="h-6 w-6 shrink-0" />
      <span v-if="!collapsed" class="hidden sm:inline">Chat on WhatsApp</span>
    </a>
    <button
      v-if="!collapsed"
      type="button"
      aria-label="Minimize WhatsApp button"
      class="absolute -top-2 -right-2 hidden h-6 w-6 place-items-center rounded-full border border-brand-100 bg-white text-brand-900/70 shadow-md hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:grid"
      @click="collapse"
    >
      <svg viewBox="0 0 12 12" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M2 2l8 8M10 2l-8 8" />
      </svg>
    </button>
  </div>
</template>

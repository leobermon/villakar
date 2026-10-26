<script setup lang="ts">
import { analyticsEnabled, consent, setConsent } from '@/analytics';
</script>

<template>
  <!-- Aviso de cookies de medición (Google Analytics). Sin elegir, GA4 no guarda cookies. -->
  <aside
    v-if="analyticsEnabled && consent === null"
    role="dialog"
    aria-label="Cookie notice"
    class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-brand-100 bg-white p-4 shadow-2xl shadow-brand-950/20 sm:bottom-5 sm:flex sm:items-center sm:gap-5 sm:p-5 print:hidden"
  >
    <p class="text-sm leading-relaxed text-brand-900/80">
      We use Google Analytics cookies to understand how visitors use our site and improve it. They are optional and do not
      affect your booking. Learn more in our
      <RouterLink :to="{ name: 'privacy' }" class="font-semibold underline underline-offset-2 hover:text-brand-800">Privacy Policy</RouterLink>.
    </p>
    <div class="mt-3 flex shrink-0 gap-2 sm:mt-0">
      <button
        type="button"
        class="h-10 flex-1 rounded-xl border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 hover:bg-brand-50 sm:flex-none"
        @click="setConsent('denied')"
      >
        Decline
      </button>
      <button
        type="button"
        class="h-10 flex-1 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white hover:bg-brand-800 sm:flex-none"
        @click="setConsent('granted')"
      >
        Accept
      </button>
    </div>
  </aside>
</template>

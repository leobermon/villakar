<script setup lang="ts">
import logoUrl from '@/assets/logo.png';
import { useRoute } from 'vue-router';
import { SITE } from '@/config';

defineProps<{ transparent?: boolean }>();

const route = useRoute();
</script>

<template>
  <header :class="transparent ? 'absolute inset-x-0 top-0 z-20 text-white' : 'border-b border-brand-100 bg-white text-brand-950'">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <RouterLink :to="{ name: 'home' }" class="flex items-center" :aria-label="`${SITE.name} home`">
        <img :src="logoUrl" :alt="SITE.name" width="958" height="410" class="h-14 w-auto" />
      </RouterLink>
      <nav class="flex items-center gap-1" aria-label="Main">
        <!-- En el home principal no hace falta: el botón aparece en todas las demás páginas. -->
        <RouterLink
          v-if="route.name !== 'home'"
          :to="{ name: 'home' }"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition"
          :class="transparent ? 'hover:bg-white/10' : 'text-brand-700 hover:bg-brand-50'"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
          </svg>
          Home
        </RouterLink>
        <RouterLink
          :to="{ name: 'faq' }"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition"
          :class="transparent ? 'hover:bg-white/10' : 'text-brand-700 hover:bg-brand-50'"
        >
          FAQ
        </RouterLink>
        <RouterLink
          :to="{ name: 'contact' }"
          class="rounded-lg px-3 py-2 text-sm font-semibold transition"
          :class="transparent ? 'hover:bg-white/10' : 'text-brand-700 hover:bg-brand-50'"
        >
          Contact
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

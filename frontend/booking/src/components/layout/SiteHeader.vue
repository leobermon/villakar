<script setup lang="ts">
import logoUrl from '@/assets/logo.png';
import { SITE } from '@/config';

defineProps<{ transparent?: boolean }>();
</script>

<template>
  <header :class="transparent ? 'absolute inset-x-0 top-0 z-20 text-white' : 'border-b border-brand-100 bg-white text-brand-950'">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <RouterLink :to="{ name: 'home' }" class="flex items-center" :aria-label="`${SITE.name} home`">
        <img :src="logoUrl" :alt="SITE.name" width="1000" height="436" class="h-14 w-auto" />
      </RouterLink>
      <nav class="flex items-center gap-1" aria-label="Main">
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

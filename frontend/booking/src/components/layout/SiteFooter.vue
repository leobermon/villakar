<script setup lang="ts">
import { SITE } from '@/config';

const year = new Date().getFullYear();
</script>

<template>
  <footer class="mt-auto border-t border-brand-100 bg-white">
    <div class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-brand-900/60 sm:flex-row sm:justify-between sm:px-6">
      <p>© {{ year }} {{ SITE.name }} · Cancun & Riviera Maya</p>
      <p>
        Prices in USD · Card, PayPal or cash ·
        <RouterLink :to="{ name: 'terms' }" class="underline underline-offset-2 hover:text-brand-800">Terms and Conditions</RouterLink>
      </p>
    </div>
  </footer>
</template>

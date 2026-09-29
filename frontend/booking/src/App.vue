<script setup lang="ts">
import SiteFooter from '@/components/layout/SiteFooter.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <RouterView />
    <SiteFooter />
  </div>
</template>

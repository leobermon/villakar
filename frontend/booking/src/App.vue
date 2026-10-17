<script setup lang="ts">
import PalmBackdrop from '@/components/layout/PalmBackdrop.vue';
import SiteFooter from '@/components/layout/SiteFooter.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- El fondo de palmeras queda detrás de la página (isolate) y no cubre el footer. -->
    <div class="relative isolate flex flex-1 flex-col">
      <PalmBackdrop />
      <RouterView />
    </div>
    <SiteFooter />
  </div>
</template>

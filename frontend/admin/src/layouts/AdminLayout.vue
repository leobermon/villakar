<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
</script>

<template>
  <div class="min-h-screen">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
    >
      Saltar al contenido
    </a>
    <AppSidebar />
    <!-- En pantallas grandes el menú es fijo: el contenido se desplaza su ancho (w-64). -->
    <div class="flex min-h-screen flex-col lg:pl-64">
      <AppHeader />
      <main id="main" tabindex="-1" class="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>

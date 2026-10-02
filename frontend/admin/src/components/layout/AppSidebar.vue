<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NAVIGATION } from '@/config/navigation';
import { PUBLIC_SITE_URL } from '@/config/site';
import { useUiStore } from '@/stores/ui';
import NavIcon from './NavIcon.vue';

const ui = useUiStore();
const route = useRoute();
const publicSiteUrl = PUBLIC_SITE_URL;

// En móvil el menú es un panel encima del contenido: se cierra al navegar o con Escape.
watch(() => route.fullPath, () => ui.closeSidebar());

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && ui.sidebarOpen) ui.closeSidebar();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <!-- Fondo oscuro detrás del menú en móvil; un clic lo cierra. -->
  <div
    v-if="ui.sidebarOpen"
    class="fixed inset-0 z-30 bg-brand-950/40 lg:hidden"
    aria-hidden="true"
    @click="ui.closeSidebar()"
  />

  <aside
    id="admin-sidebar"
    class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-white transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0"
    :class="ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    aria-label="Menú principal"
  >
    <div class="flex h-16 items-center gap-2.5 px-5">
      <img src="/favicon-192.png" alt="" class="size-8" />
      <div class="leading-tight">
        <p class="text-sm font-bold">VillaKar Transfers</p>
        <p class="text-xs text-white/60">Panel de administración</p>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <div v-for="group in NAVIGATION" :key="group.label" class="mb-6">
        <p class="px-3 text-xs font-medium text-white/45">{{ group.label }}</p>
        <ul class="mt-2 space-y-0.5">
          <li v-for="item in group.items" :key="item.name">
            <RouterLink
              :to="{ name: item.name }"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none"
              :class="
                route.name === item.name ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
              "
              :aria-current="route.name === item.name ? 'page' : undefined"
            >
              <NavIcon :name="item.icon" />
              <span class="flex-1">{{ item.label }}</span>
              <span v-if="!item.ready" class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                Pronto
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <a
      :href="publicSiteUrl"
      target="_blank"
      rel="noopener"
      class="m-3 rounded-lg border border-white/15 px-3 py-2 text-center text-xs font-semibold text-white/75 hover:bg-white/6 hover:text-white"
    >
      Ver sitio de reservas
    </a>
  </aside>
</template>

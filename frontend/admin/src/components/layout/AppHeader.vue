<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ROLE_LABEL, useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const initials = computed(() =>
  (auth.user?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('') || '··',
);

async function logout() {
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-fog-200 bg-white/90 px-4 backdrop-blur sm:px-6">
    <button
      type="button"
      class="grid size-9 place-items-center rounded-lg text-brand-900 hover:bg-fog-100 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none lg:hidden"
      aria-controls="admin-sidebar"
      :aria-expanded="ui.sidebarOpen"
      aria-label="Abrir menú"
      @click="ui.toggleSidebar()"
    >
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>

    <h1 class="flex-1 truncate text-lg font-bold text-brand-950">{{ route.meta.title }}</h1>

    <div v-if="auth.user" class="flex items-center gap-3">
      <span class="grid size-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white" aria-hidden="true">{{ initials }}</span>
      <span class="hidden leading-tight md:block">
        <span class="block text-sm font-medium text-brand-900">{{ auth.user.name }}</span>
        <span class="block text-xs text-brand-900/55">{{ ROLE_LABEL[auth.user.role] }}</span>
      </span>
      <button
        type="button"
        class="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-fog-100 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        @click="logout"
      >
        Salir
      </button>
    </div>
  </header>
</template>

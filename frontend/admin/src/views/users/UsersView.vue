<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import UserDrawer from '@/components/users/UserDrawer.vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { ROLE_LABEL, ROLE_TONE } from '@/config/users';
import { useAuthStore } from '@/stores/auth';
import { useUsersStore } from '@/stores/users';
import type { ManagedUser } from '@/types/user';
import { formatInstant } from '@/utils/format';

const store = useUsersStore();
const auth = useAuthStore();
onMounted(() => store.load());

const columns: DataTableColumn<ManagedUser>[] = [
  { key: 'name', label: 'Usuario', sortable: true, sortValue: (user) => user.name },
  { key: 'role', label: 'Rol', sortable: true, sortValue: (user) => ROLE_LABEL[user.role] },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (user) => (user.isActive ? 0 : 1) },
  { key: 'lastLogin', label: 'Último acceso', sortable: true, sortValue: (user) => user.lastLoginAt ?? '', hideBelow: 'md' },
];
const sort = ref<DataTableSort | null>({ key: 'name', direction: 'asc' });
const page = ref(1);

/** Panel lateral: 'new' = alta de un usuario; un número = editar a ese usuario. */
const drawer = ref<'new' | number | null>(null);
const youId = computed(() => auth.user?.id ?? -1);
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-3">
    <LoadErrorBanner :message="store.loadError" @retry="store.load(true)" />

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-brand-900/65">
        Personas que entran a este panel. Da de alta a tu equipo y elige su rol; las reglas de lo que puede hacer cada rol se definirán más adelante.
      </p>
      <button
        type="button"
        class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 sm:self-auto"
        @click="drawer = 'new'"
      >
        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nuevo usuario
      </button>
    </div>

    <div class="grid gap-2 sm:grid-cols-3">
      <div class="rounded-lg border border-fog-200 bg-white px-3 py-2">
        <p class="text-[11px] font-semibold text-brand-900/70">Usuarios</p>
        <p class="text-lg leading-tight font-bold tabular-nums">{{ store.users.length }}</p>
      </div>
      <div class="rounded-lg border border-fog-200 bg-white px-3 py-2">
        <p class="text-[11px] font-semibold text-brand-900/70">Activos</p>
        <p class="text-lg leading-tight font-bold tabular-nums">{{ store.activeCount }}</p>
      </div>
      <div class="rounded-lg border border-fog-200 bg-white px-3 py-2">
        <p class="text-[11px] font-semibold text-brand-900/70">Desactivados</p>
        <p class="text-lg leading-tight font-bold tabular-nums">{{ store.users.length - store.activeCount }}</p>
      </div>
    </div>

    <DataTable
      v-model:sort="sort"
      v-model:page="page"
      :columns="columns"
      :rows="store.users"
      :row-key="(user) => user.id"
      :loading="store.loading"
      caption="Usuarios del panel"
      compact
      row-clickable
      :row-label="(user) => `Editar a ${user.name}`"
      empty-title="Todavía no hay usuarios"
      empty-text="Crea el primero con el botón Nuevo usuario."
      @row-click="(user) => (drawer = user.id)"
    >
      <template #cell-name="{ row }">
        <p class="font-medium text-brand-950">
          {{ row.name }}<span v-if="row.id === youId" class="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Tú</span>
        </p>
        <p class="max-w-64 truncate text-xs text-brand-900/55">{{ row.email }}</p>
      </template>
      <template #cell-role="{ row }">
        <StatusBadge :label="ROLE_LABEL[row.role]" :tone="ROLE_TONE[row.role]" />
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="row.isActive ? 'Activo' : 'Desactivado'" :tone="row.isActive ? 'success' : 'neutral'" />
      </template>
      <template #cell-lastLogin="{ row }">
        <span v-if="row.lastLoginAt" class="whitespace-nowrap">{{ formatInstant(row.lastLoginAt) }}</span>
        <span v-else class="text-brand-900/50">Nunca ha entrado</span>
      </template>
    </DataTable>

    <UserDrawer :target="drawer" @close="drawer = null" />
  </div>
</template>

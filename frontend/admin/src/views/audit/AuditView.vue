<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { ApiError, api } from '@/api/client';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import { formatInstant } from '@/utils/format';

interface AuditItem {
  id: number;
  at: string;
  userId: number | null;
  userName: string;
  userEmail: string;
  action: string;
  orderCode: string | null;
  summary: string;
}
interface AuditResponse {
  total: number;
  items: AuditItem[];
  users: Array<{ id: number; name: string }>;
}

const ACTION_LABEL: Record<string, string> = {
  ORDER_STATUS: 'Estado de la orden',
  LEG_STATUS: 'Estado del tramo',
  LEG_DRIVER: 'Chofer',
  ORDER_NOTES: 'Notas internas',
  PAYMENT_MANUAL: 'Cobro registrado',
  PAYMENT_VERIFIED: 'Cobro confirmado',
  PAYMENT_REJECTED: 'Cobro rechazado',
  PAYMENT_LINK_CREATED: 'Link de pago creado',
  PAYMENT_LINK_CANCELLED: 'Link de pago cancelado',
};

/** Con cuántos movimientos se llena la tabla; si hay más, se afinan los filtros. */
const LIMIT = 100;

const filters = reactive({ userId: '', action: '', query: '', from: '', to: '' });
const items = ref<AuditItem[]>([]);
const users = ref<AuditResponse['users']>([]);
const total = ref(0);
const loading = ref(false);
const loadError = ref<string | null>(null);

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const params = new URLSearchParams({ pageSize: String(LIMIT) });
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) params.set(key === 'query' ? 'q' : key, value.trim());
    }
    const data = await api<AuditResponse>(`/admin/audit?${params}`);
    items.value = data.items;
    users.value = data.users;
    total.value = data.total;
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'No se pudo cargar el historial.';
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// Los filtros esperan a que se deje de escribir.
let timer: ReturnType<typeof setTimeout> | undefined;
watch(filters, () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
});
onBeforeUnmount(() => clearTimeout(timer));

const columns: DataTableColumn<AuditItem>[] = [
  { key: 'at', label: 'Fecha', sortable: true, sortValue: (row) => row.at },
  { key: 'user', label: 'Usuario', sortable: true, sortValue: (row) => row.userName },
  { key: 'action', label: 'Acción', hideBelow: 'md', sortable: true, sortValue: (row) => ACTION_LABEL[row.action] ?? row.action },
  { key: 'summary', label: 'Detalle' },
  { key: 'order', label: 'Orden', hideBelow: 'md', sortable: true, sortValue: (row) => row.orderCode },
];
const sort = ref<DataTableSort | null>({ key: 'at', direction: 'desc' });
const page = ref(1);
const pageSize = ref(25);
watch(items, () => (page.value = 1));

const ids = { search: useId(), user: useId(), action: useId(), from: useId(), to: useId() };
const fieldClass =
  'h-10 w-full rounded-lg border border-fog-200 bg-white px-3 text-sm text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-4">
    <LoadErrorBanner :message="loadError" @retry="load" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-brand-900/65">
        Movimientos hechos en el panel (órdenes y pagos): quién, qué y cuándo. Solo lo ven los superadministradores y no se puede editar.
      </p>
      <button type="button" class="h-10 rounded-lg border border-brand-300 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50" @click="load">
        Actualizar
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div class="lg:col-span-4">
        <label :for="ids.search" :class="labelClass">Buscar</label>
        <input :id="ids.search" v-model="filters.query" type="search" placeholder="Código de orden o texto" :class="fieldClass" />
      </div>
      <div class="lg:col-span-2">
        <label :for="ids.user" :class="labelClass">Usuario</label>
        <select :id="ids.user" v-model="filters.userId" :class="fieldClass">
          <option value="">Todos</option>
          <option v-for="user in users" :key="user.id" :value="String(user.id)">{{ user.name }}</option>
        </select>
      </div>
      <div class="lg:col-span-2">
        <label :for="ids.action" :class="labelClass">Acción</label>
        <select :id="ids.action" v-model="filters.action" :class="fieldClass">
          <option value="">Todas</option>
          <option v-for="(label, value) in ACTION_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="lg:col-span-2">
        <label :for="ids.from" :class="labelClass">Desde</label>
        <input :id="ids.from" v-model="filters.from" type="date" :class="fieldClass" />
      </div>
      <div class="lg:col-span-2">
        <label :for="ids.to" :class="labelClass">Hasta</label>
        <input :id="ids.to" v-model="filters.to" type="date" :class="fieldClass" />
      </div>
    </div>

    <p v-if="total > items.length" class="text-xs text-brand-900/60">
      Se muestran los {{ items.length }} movimientos más recientes de {{ total }}. Usa los filtros para acotar.
    </p>

    <DataTable
      v-model:sort="sort"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="items"
      :row-key="(row) => row.id"
      :loading="loading"
      caption="Historial de movimientos del panel"
      empty-title="Todavía no hay movimientos"
      empty-text="Aparecerán aquí cuando alguien cambie una orden o registre un pago."
    >
      <template #cell-at="{ row }">
        <span class="whitespace-nowrap">{{ formatInstant(row.at) }}</span>
      </template>
      <template #cell-user="{ row }">
        <p class="font-medium text-brand-950">{{ row.userName }}</p>
        <p class="max-w-52 truncate text-xs text-brand-900/55">{{ row.userEmail }}</p>
      </template>
      <template #cell-action="{ row }">
        <span class="text-xs font-semibold text-brand-900/75">{{ ACTION_LABEL[row.action] ?? row.action }}</span>
      </template>
      <template #cell-summary="{ row }">
        <p class="max-w-xl text-brand-950">{{ row.summary }}</p>
      </template>
      <template #cell-order="{ row }">
        <span v-if="row.orderCode" class="font-bold text-brand-700">{{ row.orderCode }}</span>
        <span v-else class="text-brand-900/50">—</span>
      </template>
    </DataTable>
  </div>
</template>

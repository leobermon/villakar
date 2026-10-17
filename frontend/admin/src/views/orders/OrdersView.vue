<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OrderDetailDrawer from '@/components/orders/OrderDetailDrawer.vue';
import OrderFilters from '@/components/orders/OrderFilters.vue';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { ORDER_STATUS, ORDER_STATUS_ORDER, ROUTE_CODE, ROUTE_LABEL, paymentSummary } from '@/config/orders';
import { useOrdersStore } from '@/stores/orders';
import type { Order } from '@/types/order';
import { exportOrdersToExcel } from '@/utils/exportOrders';
import { formatLocalDate, formatLocalTime, formatUsd } from '@/utils/format';

const store = useOrdersStore();
onMounted(() => store.load());

/** En la tabla el aeropuerto se muestra corto: "Cancun Airport". */
function shortPlace(name: string | undefined): string {
  return (name ?? '').replace(/Cancun International Airport(\s*\(CUN\))?/i, 'Cancun Airport');
}

const columns: DataTableColumn<Order>[] = [
  { key: 'code', label: 'Orden', sortable: true },
  {
    key: 'customer',
    label: 'Cliente',
    sortable: true,
    sortValue: (order) => `${order.customer.lastName} ${order.customer.firstName}`,
  },
  { key: 'pickup', label: 'Recogida', sortable: true, sortValue: (order) => order.legs[0]?.pickupAt },
  // Origen → destino: solo en pantallas muy anchas (también está en el detalle de la orden).
  { key: 'route', label: 'Servicio', hideBelow: '2xl' },
  { key: 'vehicle', label: 'Vehículo', hideBelow: 'lg', sortable: true, sortValue: (order) => order.vehicle.name },
  { key: 'total', label: 'Total', align: 'right', sortable: true, sortValue: (order) => order.total },
  { key: 'payment', label: 'Pago', hideBelow: 'md', sortable: true, sortValue: (order) => paymentSummary(order).label },
  {
    key: 'status',
    label: 'Estado',
    sortable: true,
    sortValue: (order) => ORDER_STATUS_ORDER.indexOf(order.status),
  },
];

// Por defecto, las próximas recogidas primero.
const sort = ref<DataTableSort | null>({ key: 'pickup', direction: 'asc' });
const page = ref(1);
const pageSize = ref(25);

// Al cambiar cualquier filtro se vuelve a la primera página.
watch(() => ({ ...store.filters }), () => (page.value = 1), { deep: true });

const selectedId = ref<number | null>(null);

// ---- Exportar a Excel ----
const exporting = ref(false);
const exportError = ref<string | null>(null);

/** Descarga las órdenes que cumplen los filtros actuales (todas las páginas), con las próximas recogidas primero. */
async function exportExcel() {
  if (exporting.value || !store.filtered.length) return;
  exporting.value = true;
  exportError.value = null;
  try {
    const rows = [...store.filtered].sort((a, b) => (a.legs[0]?.pickupAt ?? '').localeCompare(b.legs[0]?.pickupAt ?? ''));
    await exportOrdersToExcel(rows);
  } catch {
    exportError.value = 'No se pudo generar el archivo de Excel. Intenta de nuevo.';
  } finally {
    exporting.value = false;
  }
}

// ?order=<id> abre esa orden (p. ej. desde el módulo de Pagos).
const route = useRoute();
const router = useRouter();
watch(
  () => route.query.order,
  (value) => {
    const id = Number(value);
    if (value && Number.isInteger(id)) selectedId.value = id;
  },
  { immediate: true },
);

function closeDetail() {
  selectedId.value = null;
  if (route.query.order) router.replace({ query: { ...route.query, order: undefined } });
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-3">
    <LoadErrorBanner :message="store.loadError" @retry="store.load(true)" />
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-brand-900/65">
        Reservas de traslado. Abre una orden para ver sus datos, asignar chofer o cambiar su estado.
      </p>
      <button
        type="button"
        class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-brand-300 bg-white px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        :disabled="exporting || store.loading || !store.filtered.length"
        :title="store.filtered.length ? 'Descarga las órdenes con los filtros actuales' : 'No hay órdenes para exportar'"
        @click="exportExcel"
      >
        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />
        </svg>
        {{ exporting ? 'Generando…' : `Exportar a Excel (${store.filtered.length})` }}
      </button>
    </div>
    <p v-if="exportError" role="alert" class="text-sm font-medium text-accent-600">{{ exportError }}</p>

    <OrderFilters />

    <DataTable
      v-model:sort="sort"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="store.filtered"
      :row-key="(order) => order.id"
      :loading="store.loading"
      caption="Órdenes de traslado"
      compact
      row-clickable
      :row-label="(order) => `Abrir orden ${order.code} de ${order.customer.firstName} ${order.customer.lastName}`"
      empty-title="No hay órdenes con estos filtros"
      empty-text="Prueba con otro estado o quita los filtros."
      @row-click="(order) => (selectedId = order.id)"
    >
      <template #cell-code="{ row }">
        <p class="text-[10px] font-medium tracking-normal text-brand-950/70">{{ row.code }}</p>
        <p class="text-xs font-semibold text-brand-900/55" :title="ROUTE_LABEL[row.routeType]">
          {{ ROUTE_CODE[row.routeType] }}<span class="sr-only"> · {{ ROUTE_LABEL[row.routeType] }}</span>
        </p>
      </template>

      <template #cell-customer="{ row }">
        <p class="font-medium text-brand-950">{{ row.customer.firstName }} {{ row.customer.lastName }}</p>
        <p class="max-w-52 truncate text-xs text-brand-900/55">{{ row.customer.email }}</p>
      </template>

      <template #cell-pickup="{ row }">
        <template v-if="row.legs[0]">
          <p class="font-medium whitespace-nowrap text-brand-950">{{ formatLocalDate(row.legs[0].pickupAt) }}</p>
          <p class="text-xs whitespace-nowrap text-brand-900/55">
            {{ formatLocalTime(row.legs[0].pickupAt) }}
            <template v-if="row.legs[1]"> · regreso {{ formatLocalDate(row.legs[1].pickupAt) }}</template>
          </p>
        </template>
      </template>

      <template #cell-route="{ row }">
        <p class="max-w-64 truncate text-xs text-brand-950" :title="`${shortPlace(row.legs[0]?.originName)} → ${shortPlace(row.legs[0]?.destinationName)}`">
          {{ shortPlace(row.legs[0]?.originName) }}
        </p>
        <p class="max-w-64 truncate text-xs text-brand-900/55">→ {{ shortPlace(row.legs[0]?.destinationName) }}</p>
      </template>

      <template #cell-vehicle="{ row }">
        <p class="text-brand-950">{{ row.vehicle.name }}</p>
        <p class="text-xs text-brand-900/55">{{ row.passengers }} pax</p>
      </template>

      <template #cell-total="{ row }">
        <span class="font-semibold whitespace-nowrap tabular-nums">{{ formatUsd(row.total) }}</span>
      </template>

      <template #cell-payment="{ row }">
        <StatusBadge v-bind="paymentSummary(row)" />
      </template>

      <template #cell-status="{ row }">
        <StatusBadge v-bind="ORDER_STATUS[row.status]" />
      </template>
    </DataTable>

    <OrderDetailDrawer :order-id="selectedId" @close="closeDetail" />
  </div>
</template>

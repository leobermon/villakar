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
import { useOrdersStore, type OrderRow } from '@/stores/orders';
import type { OrderLeg, RouteType } from '@/types/order';
import { exportOrdersToExcel } from '@/utils/exportOrders';
import { formatInstantStamp, formatLocalStamp, formatUsd } from '@/utils/format';

const store = useOrdersStore();
// Cada vez que se abre Órdenes se vuelve a leer la base: las reservas nuevas aparecen sin recargar la página.
onMounted(() => store.load(true));

function isAirport(name: string): boolean {
  return /airport|aeropuerto/i.test(name);
}

/** Lugares que se muestran en "Servicio": solo el hotel en llegadas y salidas, los dos en hotel a hotel. */
function servicePlaces(leg: OrderLeg): string[] {
  if (isAirport(leg.originName) && !isAirport(leg.destinationName)) return [leg.destinationName];
  if (isAirport(leg.destinationName) && !isAirport(leg.originName)) return [leg.originName];
  return [leg.originName, leg.destinationName];
}

/** En la tabla el aeropuerto se muestra corto: "Cancun Airport". */
function shortPlace(name: string | undefined): string {
  return (name ?? '').replace(/Cancun International Airport(\s*\(CUN\))?/i, 'Cancun Airport');
}

const columns: DataTableColumn<OrderRow>[] = [
  { key: 'created', label: 'Creado', hideBelow: 'md', sortable: true, sortValue: (row) => Date.parse(row.order.createdAt) },
  {
    key: 'customer',
    label: 'Cliente',
    sortable: true,
    sortValue: (row) => `${row.order.customer.lastName} ${row.order.customer.firstName}`,
  },
  { key: 'type', label: 'Tipo', sortable: true, sortValue: (row) => ROUTE_CODE[legRoute(row)] },
  { key: 'pickup', label: 'Pickup date', sortable: true, sortValue: (row) => row.leg.pickupAt },
  { key: 'time', label: 'Pick up time', sortable: true, sortValue: (row) => row.leg.pickupAt.slice(11, 16) },
  // Origen → destino: solo en pantallas anchas (también está en el detalle de la orden).
  { key: 'route', label: 'Servicio', hideBelow: 'xl' },
  { key: 'vehicle', label: 'Vehículo', hideBelow: 'lg', sortable: true, sortValue: (row) => row.order.vehicle.name },
  { key: 'total', label: 'Total', align: 'right', sortable: true, sortValue: (row) => row.order.total },
  { key: 'payment', label: 'Pago', hideBelow: 'md', sortable: true, sortValue: (row) => paymentSummary(row.order).label },
  {
    key: 'status',
    label: 'Estado',
    sortable: true,
    sortValue: (row) => ORDER_STATUS_ORDER.indexOf(row.status),
  },
];

/** Tipo de servicio del tramo: el regreso de una llegada es una salida y al revés. */
function legRoute(row: OrderRow): RouteType {
  const { routeType } = row.order;
  if (row.leg.legNumber < 2) return routeType;
  return routeType === 'AIRPORT_HOTEL' ? 'HOTEL_AIRPORT' : routeType === 'HOTEL_AIRPORT' ? 'AIRPORT_HOTEL' : routeType;
}

/** "1/2" y "2/2" en las órdenes de ida y vuelta; nada en las de un solo tramo. */
function legTag(row: OrderRow): string | null {
  if (row.order.legs.length < 2) return null;
  return `${row.leg.legNumber}/${row.order.legs.length}`;
}

// Por defecto, las órdenes creadas más recientemente primero.
const sort = ref<DataTableSort | null>({ key: 'created', direction: 'desc' });
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
  <div class="mx-auto max-w-[110rem] space-y-3">
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
      :rows="store.rows"
      :row-key="(row) => row.key"
      :loading="store.loading"
      caption="Órdenes de traslado"
      compact
      row-clickable
      :row-label="(row) => `Abrir orden ${row.order.code} de ${row.order.customer.firstName} ${row.order.customer.lastName}`"
      empty-title="No hay órdenes con estos filtros"
      empty-text="Prueba con otro estado o quita los filtros."
      @row-click="(row) => (selectedId = row.order.id)"
    >
      <template #cell-created="{ row }">
        <p class="text-[11px] whitespace-nowrap text-brand-950/80">{{ formatInstantStamp(row.order.createdAt) }}</p>
        <p class="text-[10px] font-medium whitespace-nowrap tracking-normal text-brand-950/70">
          {{ row.order.code }}<template v-if="legTag(row)"> · {{ legTag(row) }}</template>
        </p>
      </template>

      <template #cell-type="{ row }">
        <span class="text-xs font-semibold text-brand-900/70" :title="ROUTE_LABEL[legRoute(row)]">
          {{ ROUTE_CODE[legRoute(row)] }}<span class="sr-only"> · {{ ROUTE_LABEL[legRoute(row)] }}</span>
        </span>
      </template>

      <template #cell-customer="{ row }">
        <p class="font-medium text-brand-950">{{ row.order.customer.firstName }} {{ row.order.customer.lastName }}</p>
        <p class="max-w-52 truncate text-xs text-brand-900/55">{{ row.order.customer.email }}</p>
      </template>

      <template #cell-pickup="{ row }">
        <p class="font-medium whitespace-nowrap text-brand-950">
          {{ formatLocalStamp(row.leg.pickupAt).slice(0, 11) }}
        </p>
      </template>

      <template #cell-time="{ row }">
        <p class="font-medium whitespace-nowrap text-brand-950">{{ row.leg.pickupAt.slice(11, 16) }}</p>
      </template>

      <template #cell-route="{ row }">
        <p
          v-for="(place, index) in servicePlaces(row.leg)"
          :key="index"
          class="max-w-64 truncate text-xs"
          :class="index === 0 ? 'text-brand-950' : 'text-brand-900/55'"
          :title="shortPlace(place)"
        >
          {{ index === 0 ? '' : '→ ' }}{{ shortPlace(place) }}
        </p>
      </template>

      <template #cell-vehicle="{ row }">
        <p class="text-brand-950">{{ row.order.vehicle.name }}</p>
        <p class="text-xs text-brand-900/55">{{ row.order.passengers }} pax</p>
      </template>

      <!-- El total es de toda la orden: en el regreso se avisa en vez de contarlo dos veces. -->
      <template #cell-total="{ row }">
        <span v-if="row.leg.legNumber === 1" class="font-semibold whitespace-nowrap tabular-nums">{{ formatUsd(row.order.total) }}</span>
        <span v-else class="text-xs whitespace-nowrap text-brand-900/50">incl. en la ida</span>
      </template>

      <template #cell-payment="{ row }">
        <StatusBadge v-bind="paymentSummary(row.order)" />
      </template>

      <template #cell-status="{ row }">
        <StatusBadge v-bind="ORDER_STATUS[row.status]" />
      </template>
    </DataTable>

    <OrderDetailDrawer :order-id="selectedId" @close="closeDetail" />
  </div>
</template>

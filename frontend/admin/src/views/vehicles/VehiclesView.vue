<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import TabBar from '@/components/ui/TabBar.vue';
import VehicleDrawer from '@/components/vehicles/VehicleDrawer.vue';
import VehicleImage from '@/components/vehicles/VehicleImage.vue';
import VehicleTypeDrawer from '@/components/vehicles/VehicleTypeDrawer.vue';
import { VEHICLE_STATUS } from '@/config/catalog';
import { useQueryTab } from '@/composables/useQueryTab';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import { useCatalogStore } from '@/stores/catalog';
import type { Vehicle, VehicleStatus } from '@/types/catalog';
import { inputClass, primaryButton } from '@/utils/formStyles';

const catalog = useCatalogStore();
onMounted(() => catalog.load());

const { tab, setTab } = useQueryTab(['types', 'fleet'] as const);
const tabs = computed(() => [
  { value: 'types' as const, label: 'Tipos de vehículo', count: catalog.vehicleTypes.length },
  { value: 'fleet' as const, label: 'Flota', count: catalog.vehicles.length },
]);

/** Unidades por tipo: cuántas están disponibles para asignar y cuántas hay en total. */
function unitsOf(typeId: number) {
  const units = catalog.vehicles.filter((vehicle) => vehicle.vehicleTypeId === typeId);
  return { active: units.filter((vehicle) => vehicle.status === 'ACTIVE').length, total: units.length };
}

function ratesOf(typeId: number) {
  return catalog.rates.filter((rate) => rate.vehicleTypeId === typeId && rate.isActive).length;
}

// ---- Flota ----
const fleetType = ref<number | 'ALL'>('ALL');
const fleetStatus = ref<VehicleStatus | 'ALL'>('ALL');
const fleetRows = computed(() =>
  catalog.vehicles.filter(
    (vehicle) =>
      (fleetType.value === 'ALL' || vehicle.vehicleTypeId === fleetType.value) &&
      (fleetStatus.value === 'ALL' || vehicle.status === fleetStatus.value),
  ),
);
const fleetColumns: DataTableColumn<Vehicle>[] = [
  { key: 'unitNumber', label: 'Unidad', sortable: true },
  { key: 'plate', label: 'Placas', sortable: true },
  { key: 'type', label: 'Tipo', sortable: true, value: (vehicle) => catalog.vehicleTypeById.get(vehicle.vehicleTypeId)?.name },
  {
    key: 'model',
    label: 'Marca / modelo',
    hideBelow: 'md',
    sortable: true,
    value: (vehicle) => [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' '),
  },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (vehicle) => VEHICLE_STATUS[vehicle.status].label },
  { key: 'notes', label: 'Notas', hideBelow: 'lg' },
];
const fleetSort = ref<DataTableSort | null>({ key: 'unitNumber', direction: 'asc' });
const fleetPage = ref(1);

const editingType = ref<number | 'new' | null>(null);
const editingVehicle = ref<number | 'new' | null>(null);
const ids = { type: useId(), status: useId() };
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-5">
    <LoadErrorBanner :message="catalog.loadError" @retry="catalog.load(true)" />
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-brand-900/65">
        Los <strong>tipos</strong> son lo que el cliente reserva y lo que tiene tarifa; la <strong>flota</strong> son las
        camionetas reales que se asignan.
      </p>
      <button
        type="button"
        :class="primaryButton"
        class="shrink-0"
        @click="tab === 'types' ? (editingType = 'new') : (editingVehicle = 'new')"
      >
        {{ tab === 'types' ? 'Nuevo tipo' : 'Nueva unidad' }}
      </button>
    </div>

    <TabBar :model-value="tab" :tabs="tabs" label="Secciones de vehículos" @update:model-value="setTab" />

    <!-- Tipos de vehículo: tarjetas con foto, como las ve el cliente. -->
    <section v-if="tab === 'types'" id="panel-types" role="tabpanel" aria-labelledby="tab-types">
      <p v-if="catalog.loading" class="py-10 text-center text-sm text-brand-900/60" role="status">Cargando vehículos…</p>
      <ul v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="type in catalog.sortedVehicleTypes" :key="type.id">
          <button
            type="button"
            class="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition hover:border-brand-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
            :class="type.isActive ? 'border-fog-200' : 'border-dashed border-fog-200 opacity-70'"
            :aria-label="`Editar ${type.name}`"
            @click="editingType = type.id"
          >
            <VehicleImage :image-url="type.imageUrl" />
            <div class="flex flex-1 flex-col gap-3 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-lg font-bold text-brand-950">{{ type.name }}</p>
                  <p class="text-xs text-brand-900/55">{{ type.code }} · {{ type.description ?? 'Sin descripción' }}</p>
                </div>
                <StatusBadge :label="type.isActive ? 'En venta' : 'Pausado'" :tone="type.isActive ? 'success' : 'neutral'" />
              </div>
              <dl class="grid grid-cols-3 gap-2 text-center text-sm">
                <div class="rounded-lg bg-fog-50 py-2">
                  <dt class="text-[11px] text-brand-900/55">Pasajeros</dt>
                  <dd class="font-bold">{{ type.maxPassengers }}</dd>
                </div>
                <div class="rounded-lg bg-fog-50 py-2">
                  <dt class="text-[11px] text-brand-900/55">Maletas</dt>
                  <dd class="font-bold">{{ type.maxLuggage }}</dd>
                </div>
                <div class="rounded-lg bg-fog-50 py-2">
                  <dt class="text-[11px] text-brand-900/55">Unidades</dt>
                  <dd class="font-bold">{{ unitsOf(type.id).active }}<span class="font-normal text-brand-900/50">/{{ unitsOf(type.id).total }}</span></dd>
                </div>
              </dl>
              <p class="text-xs text-brand-900/60">
                {{ ratesOf(type.id) }} tarifas activas<template v-if="unitsOf(type.id).active === 0"> · <span class="font-semibold text-accent-600">sin unidades disponibles</span></template>
              </p>
            </div>
          </button>
        </li>
      </ul>
    </section>

    <!-- Flota -->
    <section v-else id="panel-fleet" role="tabpanel" aria-labelledby="tab-fleet" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <label :for="ids.type" class="mb-1 block text-xs font-semibold text-brand-900/70">Tipo</label>
          <select :id="ids.type" v-model="fleetType" :class="inputClass()">
            <option value="ALL">Todos</option>
            <option v-for="type in catalog.sortedVehicleTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
          </select>
        </div>
        <div>
          <label :for="ids.status" class="mb-1 block text-xs font-semibold text-brand-900/70">Estado</label>
          <select :id="ids.status" v-model="fleetStatus" :class="inputClass()">
            <option value="ALL">Todos</option>
            <option v-for="(meta, value) in VEHICLE_STATUS" :key="value" :value="value">{{ meta.label }}</option>
          </select>
        </div>
      </div>
      <DataTable
        v-model:sort="fleetSort"
        v-model:page="fleetPage"
        :columns="fleetColumns"
        :rows="fleetRows"
        :row-key="(vehicle) => vehicle.id"
        :loading="catalog.loading"
        caption="Unidades de la flota"
        row-clickable
        :row-label="(vehicle) => `Editar unidad ${vehicle.unitNumber}`"
        empty-title="No hay unidades con estos filtros"
        @row-click="(vehicle) => (editingVehicle = vehicle.id)"
      >
        <template #cell-unitNumber="{ row }"><span class="font-bold">{{ row.unitNumber }}</span></template>
        <template #cell-status="{ row }"><StatusBadge v-bind="VEHICLE_STATUS[row.status]" /></template>
        <template #cell-notes="{ row }"><span class="block max-w-64 truncate text-xs text-brand-900/60">{{ row.notes ?? '—' }}</span></template>
      </DataTable>
    </section>

    <VehicleTypeDrawer :type-id="editingType" @close="editingType = null" />
    <VehicleDrawer :vehicle-id="editingVehicle" @close="editingVehicle = null" />
  </div>
</template>

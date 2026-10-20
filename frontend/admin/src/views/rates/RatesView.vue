<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import RateBulkAdjustDrawer from '@/components/rates/RateBulkAdjustDrawer.vue';
import RateCreateDrawer from '@/components/rates/RateCreateDrawer.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import { CatalogError, useCatalogStore } from '@/stores/catalog';
import type { AdjustableRate, RatePatch, RatePreset, Zone, ZoneRate } from '@/types/catalog';
import { formatLocalDate } from '@/utils/format';
import { ghostButton, inputClass, primaryButton, secondaryButton } from '@/utils/formStyles';

const catalog = useCatalogStore();
onMounted(async () => {
  await catalog.load();
  if (!originZoneId.value) originZoneId.value = catalog.zones.find((zone) => zone.isAirport)?.id ?? catalog.sortedZones[0]?.id ?? 0;
});

// ---- Filtros ----
const originZoneId = ref(0);
const vehicleFilter = ref<number | 'ALL'>('ALL');
const query = ref('');
const ids = { origin: useId(), vehicle: useId(), search: useId() };

interface RateRow {
  rate: ZoneRate;
  /** La otra zona del trayecto, vista desde el origen elegido. */
  other: Zone;
  /** La tarifa está guardada al revés (destino → origen) y aplica por ser bidireccional. */
  reversed: boolean;
}

/** Tarifas del origen elegido (y las bidireccionales que llegan a él). */
const rows = computed<RateRow[]>(() => {
  const origin = originZoneId.value;
  const text = normalize(query.value.trim());
  return catalog.rates
    .flatMap((rate): RateRow[] => {
      if (rate.originZoneId === origin) return [{ rate, other: catalog.zoneById.get(rate.destinationZoneId)!, reversed: false }];
      if (rate.destinationZoneId === origin && rate.isBidirectional) return [{ rate, other: catalog.zoneById.get(rate.originZoneId)!, reversed: true }];
      return [];
    })
    .filter((row) => row.other && (vehicleFilter.value === 'ALL' || row.rate.vehicleTypeId === vehicleFilter.value))
    .filter((row) => !text || normalize(row.other.name).includes(text))
    .sort(
      (a, b) =>
        a.other.sortOrder - b.other.sortOrder ||
        (catalog.vehicleTypeById.get(a.rate.vehicleTypeId)?.sortOrder ?? 0) - (catalog.vehicleTypeById.get(b.rate.vehicleTypeId)?.sortOrder ?? 0) ||
        a.rate.minPax - b.rate.minPax,
    );
});

/** Agrupa por zona destino para mostrar el nombre una sola vez por grupo. */
const groups = computed(() => {
  const result: Array<{ zone: Zone; rows: RateRow[] }> = [];
  for (const row of rows.value) {
    const last = result.at(-1);
    if (last?.zone.id === row.other.id) last.rows.push(row);
    else result.push({ zone: row.other, rows: [row] });
  }
  return result;
});

const missing = computed(() => (originZoneId.value ? catalog.missingRoutes(originZoneId.value) : []));
const showMissing = ref(false);

// ---- Cambios sin guardar ----
const drafts = reactive(new Map<number, RatePatch>());
const saving = ref(false);
const saveError = ref<string | null>(null);
const savedMessage = ref<string | null>(null);

type Field = keyof RatePatch;

function valueOf<F extends Field>(rate: ZoneRate, field: F): ZoneRate[F] {
  const draft = drafts.get(rate.id);
  return (draft && draft[field] !== undefined ? draft[field] : rate[field]) as ZoneRate[F];
}

function setValue<F extends Field>(rate: ZoneRate, field: F, value: ZoneRate[F]) {
  const patch: RatePatch = { ...drafts.get(rate.id), [field]: value };
  // Si el valor regresa al original, deja de contar como cambio.
  for (const key of Object.keys(patch) as Field[]) if (patch[key] === rate[key]) delete patch[key];
  if (Object.keys(patch).length) drafts.set(rate.id, patch);
  else drafts.delete(rate.id);
  savedMessage.value = null;
}

function onPriceInput(rate: ZoneRate, field: 'priceOneWay' | 'priceRoundTrip', event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  setValue(rate, field, raw === '' ? Number.NaN : Number(raw));
}

function isChanged(rate: ZoneRate, field: Field): boolean {
  return drafts.get(rate.id)?.[field] !== undefined;
}

function invalidPrice(rate: ZoneRate, field: 'priceOneWay' | 'priceRoundTrip'): boolean {
  const value = valueOf(rate, field);
  return !Number.isFinite(value) || value <= 0;
}

const hasInvalid = computed(() =>
  [...drafts.keys()].some((id) => {
    const rate = catalog.rates.find((candidate) => candidate.id === id);
    return rate && (invalidPrice(rate, 'priceOneWay') || invalidPrice(rate, 'priceRoundTrip'));
  }),
);

async function saveAll() {
  if (!drafts.size || hasInvalid.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    const count = drafts.size;
    await catalog.applyRatePatches(new Map(drafts));
    drafts.clear();
    savedMessage.value = `${count} ${count === 1 ? 'tarifa actualizada' : 'tarifas actualizadas'}.`;
  } catch (e) {
    saveError.value = e instanceof CatalogError ? e.message : 'No se pudieron guardar los cambios.';
  } finally {
    saving.value = false;
  }
}

function discardAll() {
  drafts.clear();
  saveError.value = null;
}

// No perder cambios al salir del módulo o cerrar la pestaña.
onBeforeRouteLeave(() => (drafts.size ? window.confirm('Tienes cambios de precios sin guardar. ¿Salir y descartarlos?') : true));
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (drafts.size) event.preventDefault();
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));

// Cambiar de origen con cambios pendientes: se conservan (son por tarifa), solo se avisa en la barra.
watch(originZoneId, () => (showMissing.value = false));

// ---- Paneles ----
const bulkOpen = ref(false);
const createPreset = ref<RatePreset | null>(null);

const adjustableRows = computed<AdjustableRate[]>(() =>
  rows.value.map(({ rate, other }) => ({
    id: rate.id,
    label: `${other.name} · ${catalog.vehicleTypeById.get(rate.vehicleTypeId)?.name} ${rate.minPax}–${rate.maxPax} pax`,
    priceOneWay: valueOf(rate, 'priceOneWay'),
    priceRoundTrip: valueOf(rate, 'priceRoundTrip'),
  })),
);

function applyBulk(changes: Array<{ id: number; priceOneWay: number; priceRoundTrip: number }>) {
  for (const change of changes) {
    const rate = catalog.rates.find((candidate) => candidate.id === change.id);
    if (!rate) continue;
    setValue(rate, 'priceOneWay', change.priceOneWay);
    setValue(rate, 'priceRoundTrip', change.priceRoundTrip);
  }
}

// ---- Borrar tarifa ----
const deletingId = ref<number | null>(null);
const deleteError = ref<string | null>(null);

async function removeRate(row: RateRow) {
  const vehicle = catalog.vehicleTypeById.get(row.rate.vehicleTypeId)?.name;
  const label = `${row.other.name} · ${vehicle} ${row.rate.minPax}–${row.rate.maxPax} pax`;
  const ok = window.confirm(
    `¿Eliminar la tarifa ${label}?\n\nNo se puede deshacer. Las reservas que ya la usaron conservan su precio.\nSi solo quieres dejar de venderla por un tiempo, mejor desactívala.`,
  );
  if (!ok) return;
  deletingId.value = row.rate.id;
  deleteError.value = null;
  savedMessage.value = null;
  try {
    await catalog.deleteRate(row.rate.id);
    drafts.delete(row.rate.id);
    savedMessage.value = `Tarifa eliminada: ${label}.`;
  } catch (e) {
    deleteError.value = e instanceof CatalogError ? e.message : 'No se pudo eliminar la tarifa.';
  } finally {
    deletingId.value = null;
  }
}

function openCreate(preset?: Partial<RatePreset>) {
  createPreset.value = { originZoneId: originZoneId.value, ...preset };
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const priceInputClass = (changed: boolean, invalid: boolean) =>
  [
    'h-9 w-24 rounded-lg border px-2 text-right text-sm tabular-nums outline-none focus:ring-4',
    invalid ? 'border-accent-500 bg-accent-50 focus:ring-accent-500/20' : changed ? 'border-amber-400 bg-amber-50 focus:ring-amber-300/40' : 'border-fog-200 bg-white focus:border-brand-400 focus:ring-brand-300/25',
  ].join(' ');
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-5 pb-24">
    <LoadErrorBanner :message="catalog.loadError" @retry="catalog.load(true)" />
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p class="text-sm text-brand-900/65">
        Precios por vehículo completo, en USD. Edita directo en la tabla y guarda todos los cambios juntos.
      </p>
      <div class="flex shrink-0 gap-2">
        <button type="button" :class="secondaryButton" :disabled="!rows.length" @click="bulkOpen = true">Ajuste masivo</button>
        <button type="button" :class="primaryButton" @click="openCreate()">Nueva tarifa</button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
      <div>
        <label :for="ids.origin" class="mb-1 block text-xs font-semibold text-brand-900/70">Desde</label>
        <select :id="ids.origin" v-model.number="originZoneId" :class="inputClass()">
          <option v-for="zone in catalog.sortedZones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
        </select>
      </div>
      <div>
        <label :for="ids.vehicle" class="mb-1 block text-xs font-semibold text-brand-900/70">Vehículo</label>
        <select :id="ids.vehicle" v-model="vehicleFilter" :class="inputClass()">
          <option value="ALL">Todos</option>
          <option v-for="type in catalog.sortedVehicleTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
        </select>
      </div>
      <div>
        <label :for="ids.search" class="mb-1 block text-xs font-semibold text-brand-900/70">Buscar destino</label>
        <input :id="ids.search" v-model="query" type="search" placeholder="Ej. Tulum" :class="inputClass()" />
      </div>
    </div>

    <!-- Rutas sin precio: el sitio responde "Contact us" en esos casos. -->
    <div v-if="missing.length" class="rounded-xl border border-amber-200 bg-amber-50/60">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
        :aria-expanded="showMissing"
        @click="showMissing = !showMissing"
      >
        <span>
          <strong class="text-amber-900">{{ missing.length }} {{ missing.length === 1 ? 'destino sin precio' : 'destinos sin precio' }}</strong>
          <span class="text-amber-900/80"> desde {{ catalog.zoneById.get(originZoneId)?.name }}: el sitio no puede cotizarlos y le pide al cliente que los contacte.</span>
        </span>
        <span class="shrink-0 font-semibold text-amber-900">{{ showMissing ? 'Ocultar' : 'Ver' }}</span>
      </button>
      <ul v-if="showMissing" class="divide-y divide-amber-200/70 border-t border-amber-200 text-sm">
        <li v-for="entry in missing" :key="entry.zone.id" class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <span>
            <strong>{{ entry.zone.name }}</strong>
            <span class="text-brand-900/65"> · sin {{ entry.vehicles.map((type) => type.name).join(', ') }}</span>
          </span>
          <button
            type="button"
            class="text-sm font-semibold text-brand-700 underline underline-offset-2"
            @click="openCreate({ destinationZoneId: entry.zone.id, vehicleTypeId: entry.vehicles[0]!.id })"
          >
            Agregar tarifa
          </button>
        </li>
      </ul>
    </div>

    <p v-if="savedMessage" role="status" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{{ savedMessage }}</p>
    <p v-if="deleteError" role="alert" class="rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-600">{{ deleteError }}</p>

    <div class="overflow-hidden rounded-xl border border-fog-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <caption class="sr-only">Tarifas desde {{ catalog.zoneById.get(originZoneId)?.name }}</caption>
          <thead class="border-b border-fog-200 bg-fog-50 text-left text-xs font-semibold text-brand-900/70">
            <tr>
              <th scope="col" class="px-4 py-3">Destino</th>
              <th scope="col" class="px-4 py-3">Vehículo</th>
              <th scope="col" class="px-4 py-3">Pasajeros</th>
              <th scope="col" class="px-4 py-3 text-right">Sencillo</th>
              <th scope="col" class="px-4 py-3 text-right">Redondo</th>
              <th scope="col" class="hidden px-4 py-3 lg:table-cell">Vigente desde</th>
              <th scope="col" class="px-4 py-3 text-center">Activa</th>
              <th scope="col" class="px-2 py-3"><span class="sr-only">Eliminar</span></th>
            </tr>
          </thead>
          <tbody v-if="catalog.loading">
            <tr v-for="n in 6" :key="n" class="border-b border-fog-100">
              <td v-for="c in 8" :key="c" class="px-4 py-3.5"><span class="block h-4 animate-pulse rounded bg-fog-100 motion-reduce:animate-none" /></td>
            </tr>
          </tbody>
          <tbody v-for="group in groups" v-else :key="group.zone.id" class="border-b border-fog-200 last:border-0">
            <tr
              v-for="(row, index) in group.rows"
              :key="row.rate.id"
              :class="[index < group.rows.length - 1 ? 'border-b border-fog-100' : '', valueOf(row.rate, 'isActive') ? '' : 'bg-fog-50 text-brand-900/50']"
            >
              <th v-if="index === 0" scope="rowgroup" :rowspan="group.rows.length" class="px-4 py-2.5 text-left align-top font-semibold">
                <span class="flex items-center gap-2">
                  <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: group.zone.color }" aria-hidden="true" />
                  {{ group.zone.name }}
                </span>
                <span v-if="!group.zone.isActive" class="mt-0.5 block text-xs font-normal text-accent-600">Zona inactiva</span>
              </th>
              <td class="px-4 py-2.5">
                {{ catalog.vehicleTypeById.get(row.rate.vehicleTypeId)?.name }}
                <span v-if="row.reversed" class="block text-[11px] text-brand-900/50" title="Tarifa guardada en sentido inverso; aplica por ser de ida y vuelta">
                  vía tarifa de regreso
                </span>
              </td>
              <td class="px-4 py-2.5 whitespace-nowrap tabular-nums">{{ row.rate.minPax }}–{{ row.rate.maxPax }}</td>
              <td class="px-4 py-2 text-right">
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputmode="decimal"
                  :value="Number.isFinite(valueOf(row.rate, 'priceOneWay')) ? valueOf(row.rate, 'priceOneWay') : ''"
                  :aria-label="`Sencillo ${group.zone.name} ${catalog.vehicleTypeById.get(row.rate.vehicleTypeId)?.name} ${row.rate.minPax}–${row.rate.maxPax} pasajeros`"
                  :aria-invalid="invalidPrice(row.rate, 'priceOneWay')"
                  :class="priceInputClass(isChanged(row.rate, 'priceOneWay'), invalidPrice(row.rate, 'priceOneWay'))"
                  @input="onPriceInput(row.rate, 'priceOneWay', $event)"
                />
              </td>
              <td class="px-4 py-2 text-right">
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputmode="decimal"
                  :value="Number.isFinite(valueOf(row.rate, 'priceRoundTrip')) ? valueOf(row.rate, 'priceRoundTrip') : ''"
                  :aria-label="`Redondo ${group.zone.name} ${catalog.vehicleTypeById.get(row.rate.vehicleTypeId)?.name} ${row.rate.minPax}–${row.rate.maxPax} pasajeros`"
                  :aria-invalid="invalidPrice(row.rate, 'priceRoundTrip')"
                  :class="priceInputClass(isChanged(row.rate, 'priceRoundTrip'), invalidPrice(row.rate, 'priceRoundTrip'))"
                  @input="onPriceInput(row.rate, 'priceRoundTrip', $event)"
                />
                <span
                  v-if="valueOf(row.rate, 'priceRoundTrip') < valueOf(row.rate, 'priceOneWay')"
                  class="mt-0.5 block text-[11px] font-medium text-amber-700"
                >
                  menor que el sencillo
                </span>
              </td>
              <td class="hidden px-4 py-2.5 whitespace-nowrap text-brand-900/65 lg:table-cell">{{ formatLocalDate(row.rate.validFrom) }}</td>
              <td class="px-4 py-2.5 text-center">
                <ToggleSwitch
                  :model-value="valueOf(row.rate, 'isActive')"
                  :label="`Tarifa activa: ${group.zone.name} ${catalog.vehicleTypeById.get(row.rate.vehicleTypeId)?.name}`"
                  @update:model-value="(value) => setValue(row.rate, 'isActive', value)"
                />
              </td>
              <td class="px-2 py-2.5 text-center">
                <button
                  type="button"
                  class="grid size-8 place-items-center rounded-lg text-brand-900/45 transition hover:bg-accent-50 hover:text-accent-600 disabled:opacity-40"
                  :disabled="deletingId === row.rate.id"
                  :aria-label="`Eliminar tarifa ${group.zone.name} ${catalog.vehicleTypeById.get(row.rate.vehicleTypeId)?.name} ${row.rate.minPax}–${row.rate.maxPax} pasajeros`"
                  title="Eliminar tarifa"
                  @click="removeRate(row)"
                >
                  <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!catalog.loading && !rows.length" class="px-6 py-14 text-center">
          <p class="font-semibold">No hay tarifas con estos filtros</p>
          <p class="mt-1 text-sm text-brand-900/60">Cambia el origen o crea una con Nueva tarifa.</p>
        </div>
      </div>
    </div>

    <!-- Barra fija de cambios sin guardar -->
    <div
      v-if="drafts.size"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-amber-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(2,62,138,0.08)] backdrop-blur lg:left-64"
      role="region"
      aria-label="Cambios sin guardar"
    >
      <div class="mx-auto flex max-w-[110rem] flex-wrap items-center justify-between gap-3">
        <p class="text-sm">
          <strong>{{ drafts.size }} {{ drafts.size === 1 ? 'tarifa con cambios' : 'tarifas con cambios' }}</strong>
          <span v-if="hasInvalid" class="ml-2 font-medium text-accent-600">Hay precios vacíos o en cero.</span>
          <span v-else-if="saveError" class="ml-2 font-medium text-accent-600" role="alert">{{ saveError }}</span>
        </p>
        <div class="flex gap-2">
          <button type="button" :class="ghostButton" @click="discardAll">Descartar</button>
          <button type="button" :class="primaryButton" :disabled="saving || hasInvalid" @click="saveAll">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

    <RateBulkAdjustDrawer :open="bulkOpen" :rows="adjustableRows" @close="bulkOpen = false" @apply="applyBulk" />
    <RateCreateDrawer :preset="createPreset" @close="createPreset = null" @created="savedMessage = 'Tarifa creada.'" />
  </div>
</template>

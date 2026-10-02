<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ZoneEditor from '@/components/zones/ZoneEditor.vue';
import ZoneMap from '@/components/zones/ZoneMap.vue';
import { AIRPORT_POINT, ZONE_COLORS } from '@/config/catalog';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import { CatalogError, useCatalogStore } from '@/stores/catalog';
import type { EditingZone, LngLat, ZoneDraft } from '@/types/catalog';
import { primaryButton, secondaryButton } from '@/utils/formStyles';
import { copyRing, zoneForPoint } from '@/utils/geo';

const catalog = useCatalogStore();
const map = ref<InstanceType<typeof ZoneMap> | null>(null);

onMounted(async () => {
  await catalog.load();
  await nextTick();
  map.value?.fitAll();
});

const selectedId = ref<number | null>(null);
const mode = ref<'view' | 'draw' | 'test'>('view');
const draft = ref<ZoneDraft | null>(null);
/** Área guardada al empezar a editar (para "deshacer cambios del área"). */
let originalBoundary: LngLat[] = [];
/** Sube para que el mapa recree el polígono editable. */
const revision = ref(0);
const saving = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

const editing = computed<EditingZone | null>(() =>
  draft.value && draft.value.boundary.length >= 3
    ? { key: `${draft.value.id ?? 'new'}-${revision.value}`, zoneId: draft.value.id, boundary: draft.value.boundary, color: draft.value.color }
    : null,
);

const boundaryChanged = computed(() => JSON.stringify(draft.value?.boundary) !== JSON.stringify(originalBoundary));

function edit(zoneId: number) {
  const zone = catalog.zoneById.get(zoneId);
  if (!zone) return;
  mode.value = 'view';
  selectedId.value = zoneId;
  // Copias simples: structuredClone no acepta los objetos reactivos (Proxy) del store.
  draft.value = { ...zone, boundary: copyRing(zone.boundary) };
  originalBoundary = copyRing(zone.boundary);
  revision.value++;
  error.value = null;
  notice.value = null;
  map.value?.focusZone(zoneId);
}

function startNew() {
  selectedId.value = null;
  const usedColors = new Set(catalog.zones.map((zone) => zone.color.toUpperCase()));
  draft.value = {
    id: null,
    name: '',
    slug: '',
    boundary: [],
    color: ZONE_COLORS.find((color) => !usedColors.has(color)) ?? ZONE_COLORS[0]!,
    priority: 10,
    isAirport: false,
    isActive: true,
    sortOrder: catalog.zones.length + 1,
  };
  originalBoundary = [];
  error.value = null;
  notice.value = null;
  mode.value = 'draw';
}

function onBoundary(boundary: LngLat[]) {
  if (!draft.value) return;
  const wasDrawing = mode.value === 'draw';
  draft.value.boundary = boundary;
  if (wasDrawing) {
    mode.value = 'view';
    revision.value++; // el trazo nuevo pasa a ser el polígono editable
  }
}

function redraw() {
  if (!draft.value) return;
  draft.value.boundary = [];
  mode.value = 'draw';
}

function resetBoundary() {
  if (!draft.value) return;
  draft.value.boundary = copyRing(originalBoundary);
  revision.value++;
}

function closeEditor() {
  draft.value = null;
  mode.value = 'view';
  error.value = null;
}

async function save() {
  if (!draft.value) return;
  saving.value = true;
  error.value = null;
  try {
    const { id, ...input } = draft.value;
    const zone = await catalog.saveZone(input, id ?? undefined);
    notice.value = `Zona "${zone.name}" guardada.`;
    draft.value = null;
    selectedId.value = zone.id;
    mode.value = 'view';
  } catch (e) {
    error.value = e instanceof CatalogError ? e.message : 'No se pudo guardar la zona.';
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!draft.value?.id) return;
  try {
    const name = draft.value.name;
    await catalog.deleteZone(draft.value.id);
    notice.value = `Zona "${name}" borrada.`;
    draft.value = null;
    selectedId.value = null;
  } catch (e) {
    error.value = e instanceof CatalogError ? e.message : 'No se pudo borrar la zona.';
  }
}

// ---- Probar ubicación: qué zona le toca a un punto (según las zonas guardadas) ----
const testPoint = ref<LngLat | null>(null);
const testResult = computed(() => (testPoint.value ? zoneForPoint(testPoint.value, catalog.zones) : null));

function toggleTest() {
  if (mode.value === 'test') {
    mode.value = 'view';
    testPoint.value = null;
  } else {
    closeEditor();
    mode.value = 'test';
  }
}

function ratesCount(zoneId: number): number {
  return catalog.ratesForZone(zoneId).filter((rate) => rate.isActive).length;
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4">
    <LoadErrorBanner :message="catalog.loadError" @retry="catalog.load(true)" />
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-brand-900/65">
        Cada hotel se cotiza según la zona donde cae. Dibuja y ajusta las zonas sobre el mapa.
      </p>
      <div class="flex shrink-0 gap-2">
        <button type="button" :class="secondaryButton" :aria-pressed="mode === 'test'" @click="toggleTest">
          {{ mode === 'test' ? 'Terminar prueba' : 'Probar ubicación' }}
        </button>
        <button type="button" :class="primaryButton" :disabled="mode === 'draw'" @click="startNew">Nueva zona</button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <!-- Panel: lista de zonas o editor -->
      <aside class="order-2 rounded-xl border border-fog-200 bg-white p-4 lg:order-1 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
        <ZoneEditor
          v-if="draft"
          v-model="draft"
          :saving="saving"
          :error="error"
          :boundary-changed="boundaryChanged"
          @save="save"
          @cancel="closeEditor"
          @redraw="redraw"
          @reset-boundary="resetBoundary"
          @delete="remove"
        />

        <template v-else>
          <p v-if="notice" role="status" class="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{{ notice }}</p>

          <!-- Resultado de la prueba de ubicación -->
          <div v-if="mode === 'test'" class="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm" aria-live="polite">
            <p class="font-semibold">Probar ubicación</p>
            <p v-if="!testResult" class="mt-1 text-brand-900/70">Haz clic en cualquier punto del mapa (por ejemplo, donde está un hotel).</p>
            <template v-else-if="testResult.winner">
              <p class="mt-1">
                Este punto se cotiza como <strong>{{ testResult.winner.name }}</strong>{{ ' ' }}<span class="text-brand-900/60">(prioridad {{ testResult.winner.priority }})</span>.
              </p>
              <p v-if="testResult.candidates.length > 1" class="mt-1 text-xs text-brand-900/65">
                También está dentro de: {{ testResult.candidates.slice(1).map((zone) => `${zone.name} (${zone.priority})`).join(', ') }}.
              </p>
            </template>
            <p v-else class="mt-1 font-medium text-accent-600">Fuera de todas las zonas activas: el sitio pedirá al cliente que los contacte.</p>
          </div>

          <p v-if="catalog.loading" class="py-6 text-center text-sm text-brand-900/60" role="status">Cargando zonas…</p>
          <ul v-else class="space-y-1">
            <li v-for="zone in catalog.sortedZones" :key="zone.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-fog-50 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                :class="selectedId === zone.id ? 'bg-brand-50' : ''"
                @click="edit(zone.id)"
              >
                <span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: zone.color }" aria-hidden="true" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold" :class="zone.isActive ? '' : 'text-brand-900/50'">{{ zone.name }}</span>
                  <span class="block text-xs text-brand-900/55">Prioridad {{ zone.priority }} · {{ ratesCount(zone.id) }} tarifas</span>
                </span>
                <StatusBadge v-if="zone.isAirport" label="Aeropuerto" tone="brand" />
                <StatusBadge v-else-if="!zone.isActive" label="Inactiva" tone="neutral" />
              </button>
            </li>
          </ul>
        </template>
      </aside>

      <!-- Mapa -->
      <div class="relative order-1 h-80 overflow-hidden rounded-xl border border-fog-200 bg-fog-100 sm:h-[28rem] lg:order-2 lg:h-[calc(100vh-11rem)] lg:min-h-[32rem]">
        <ZoneMap
          ref="map"
          :zones="catalog.zones"
          :selected-id="selectedId"
          :editing="editing"
          :mode="mode"
          :airport="AIRPORT_POINT"
          :test-point="testPoint"
          @select="edit"
          @update:boundary="onBoundary"
          @test-point="(point) => (testPoint = point)"
        />
        <p
          v-if="mode === 'draw'"
          class="pointer-events-none absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-brand-950/85 px-4 py-1.5 text-xs font-semibold text-white"
        >
          Marca las esquinas; clic en el primer punto para cerrar
        </p>
      </div>
    </div>
  </div>
</template>

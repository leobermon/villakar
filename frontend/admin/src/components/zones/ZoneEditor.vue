<script setup lang="ts">
import { computed, ref } from 'vue';
import FormField from '@/components/ui/FormField.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { ZONE_COLORS } from '@/config/catalog';
import { useCatalogStore } from '@/stores/catalog';
import type { LngLat, ZoneDraft } from '@/types/catalog';
import { formatUsd } from '@/utils/format';
import { ghostButton, inputClass, primaryButton } from '@/utils/formStyles';
import { pointInPolygon, polygonAreaKm2, slugify } from '@/utils/geo';

const props = defineProps<{ saving: boolean; error: string | null; boundaryChanged: boolean }>();
const draft = defineModel<ZoneDraft>({ required: true });
const emit = defineEmits<{ save: []; cancel: []; redraw: []; resetBoundary: []; delete: [] }>();

const catalog = useCatalogStore();
const slugTouched = ref(draft.value.id !== null);

function onNameInput() {
  // En zonas nuevas el identificador sigue al nombre hasta que se edite a mano.
  if (!slugTouched.value) draft.value.slug = slugify(draft.value.name);
}

const area = computed(() => polygonAreaKm2(draft.value.boundary));
const rateCount = computed(() => (draft.value.id === null ? 0 : catalog.ratesForZone(draft.value.id).length));
const confirmingDelete = ref(false);

/**
 * Zonas que se traslapan con el borrador (aproximado: algún vértice de una
 * dentro de la otra) y quién gana en el área común, con la regla del cotizador.
 */
const overlaps = computed(() => {
  const ring = draft.value.boundary;
  if (ring.length < 3) return [];
  const intersects = (a: LngLat[], b: LngLat[]) => a.some((point) => pointInPolygon(point, b)) || b.some((point) => pointInPolygon(point, a));
  return catalog.zones
    .filter((zone) => zone.id !== draft.value.id && zone.isActive && intersects(ring, zone.boundary))
    .map((zone) => {
      const draftWins =
        draft.value.priority > zone.priority || (draft.value.priority === zone.priority && area.value < polygonAreaKm2(zone.boundary));
      return { zone, draftWins };
    });
});

/** Tarifa más barata desde esta zona (referencia rápida). */
const cheapest = computed(() => {
  if (draft.value.id === null) return null;
  const prices = catalog.ratesForZone(draft.value.id).filter((rate) => rate.isActive).map((rate) => rate.priceOneWay);
  return prices.length ? Math.min(...prices) : null;
});
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="emit('save')">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-base font-bold">{{ draft.id === null ? 'Nueva zona' : `Editar ${draft.name || 'zona'}` }}</h2>
      <button type="button" class="text-sm font-semibold text-brand-700 underline underline-offset-2" @click="emit('cancel')">Volver a la lista</button>
    </div>

    <!-- Área en el mapa -->
    <div class="rounded-lg border border-fog-200 bg-fog-50 p-3 text-sm">
      <template v-if="draft.boundary.length >= 3">
        <p class="font-semibold">Área: {{ draft.boundary.length }} puntos · {{ area.toFixed(1) }} km²</p>
        <p class="mt-0.5 text-xs text-brand-900/65">Arrastra los puntos del mapa para ajustar el borde; arrastra el centro para mover la zona completa.</p>
        <div class="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
          <button v-if="props.boundaryChanged" type="button" class="text-brand-700 underline underline-offset-2" @click="emit('resetBoundary')">Deshacer cambios del área</button>
          <button type="button" class="text-brand-700 underline underline-offset-2" @click="emit('redraw')">Dibujar de nuevo</button>
        </div>
      </template>
      <p v-else class="font-medium text-brand-900">
        Haz clic en el mapa para marcar las esquinas de la zona. Para cerrarla, haz clic otra vez en el primer punto.
      </p>
    </div>

    <FormField v-slot="{ id }" label="Nombre">
      <input :id="id" v-model="draft.name" maxlength="100" :class="inputClass()" @input="onNameInput" />
    </FormField>
    <FormField v-slot="{ id, describedBy }" label="Identificador" hint="Interno, sin espacios. Ej. playa-del-carmen">
      <input :id="id" v-model="draft.slug" maxlength="100" :aria-describedby="describedBy" :class="inputClass()" @input="slugTouched = true" />
    </FormField>

    <fieldset>
      <legend class="mb-1 text-xs font-semibold text-brand-900/70">Color en el mapa</legend>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="color in ZONE_COLORS"
          :key="color"
          type="button"
          class="size-7 rounded-full ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
          :class="draft.color.toUpperCase() === color ? 'ring-2 ring-brand-950' : ''"
          :style="{ backgroundColor: color }"
          :aria-label="`Color ${color}`"
          :aria-pressed="draft.color.toUpperCase() === color"
          @click="draft.color = color"
        />
        <input v-model="draft.color" type="color" class="h-7 w-10 cursor-pointer rounded border border-fog-200" aria-label="Otro color" />
      </div>
    </fieldset>

    <div class="grid grid-cols-2 gap-3">
      <FormField v-slot="{ id, describedBy }" label="Prioridad" hint="Gana la mayor si se traslapan">
        <input :id="id" v-model.number="draft.priority" type="number" min="0" max="1000" :aria-describedby="describedBy" :class="inputClass()" />
      </FormField>
      <FormField v-slot="{ id }" label="Orden en listas">
        <input :id="id" v-model.number="draft.sortOrder" type="number" min="0" :class="inputClass()" />
      </FormField>
    </div>

    <div v-if="overlaps.length" class="rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-900">
      <p class="font-semibold">Se traslapa con:</p>
      <ul class="mt-1 space-y-0.5">
        <li v-for="{ zone, draftWins } in overlaps" :key="zone.id">
          <span class="font-semibold">{{ zone.name }}</span> (prioridad {{ zone.priority }}) —
          {{ draftWins ? 'en el área común gana esta zona' : `en el área común gana ${zone.name}` }}
        </li>
      </ul>
    </div>

    <div class="space-y-2 rounded-lg border border-fog-200 px-3 py-2.5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold">Es el aeropuerto</p>
          <p class="text-xs text-brand-900/60">Los viajes desde aquí se cotizan como llegadas.</p>
        </div>
        <ToggleSwitch v-model="draft.isAirport" label="Es el aeropuerto" />
      </div>
      <div class="flex items-center justify-between gap-4 border-t border-fog-100 pt-2">
        <div>
          <p class="text-sm font-semibold">Activa</p>
          <p class="text-xs text-brand-900/60">Inactiva: el sitio la ignora y sus hoteles piden cotización.</p>
        </div>
        <ToggleSwitch v-model="draft.isActive" label="Zona activa" />
      </div>
    </div>

    <p v-if="draft.id !== null" class="text-xs text-brand-900/60">
      {{ rateCount }} tarifas usan esta zona<template v-if="cheapest !== null"> · desde {{ formatUsd(cheapest) }}</template>.
    </p>

    <p v-if="props.error" role="alert" class="rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-600">{{ props.error }}</p>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-fog-200 pt-4">
      <div v-if="draft.id !== null">
        <template v-if="rateCount === 0">
          <span v-if="confirmingDelete" class="flex items-center gap-2 text-xs">
            ¿Borrar la zona?
            <button type="button" class="rounded-md bg-accent-600 px-2 py-1 font-semibold text-white" @click="emit('delete')">Sí, borrar</button>
            <button type="button" class="font-semibold" @click="confirmingDelete = false">No</button>
          </span>
          <button v-else type="button" class="text-sm font-semibold text-accent-600 hover:underline" @click="confirmingDelete = true">Borrar zona</button>
        </template>
        <span v-else class="text-xs text-brand-900/55">Con tarifas: desactívala en vez de borrarla.</span>
      </div>
      <div class="ml-auto flex gap-2">
        <button type="button" :class="ghostButton" @click="emit('cancel')">Cancelar</button>
        <button type="submit" :class="primaryButton" :disabled="props.saving">{{ props.saving ? 'Guardando…' : 'Guardar zona' }}</button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import FormField from '@/components/ui/FormField.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { CatalogError, useCatalogStore } from '@/stores/catalog';
import type { RatePreset } from '@/types/catalog';
import { ghostButton, inputClass, primaryButton } from '@/utils/formStyles';

/** preset: datos iniciales (p. ej. desde "rutas sin precio"); null = cerrado. */
const props = defineProps<{ preset: RatePreset | null }>();
const emit = defineEmits<{ close: []; created: [] }>();

const catalog = useCatalogStore();
const ROUND_TRIP_FACTOR = 1.85;

const form = reactive({
  originZoneId: 0,
  destinationZoneId: 0,
  vehicleTypeId: 0,
  minPax: 1,
  maxPax: 1,
  priceOneWay: '' as number | '',
  priceRoundTrip: '' as number | '',
  isBidirectional: true,
  validFrom: new Date().toISOString().slice(0, 10),
});
const roundTripTouched = ref(false);
const error = ref<string | null>(null);
const saving = ref(false);

const vehicle = computed(() => catalog.vehicleTypeById.get(form.vehicleTypeId));

watch(
  () => props.preset,
  (preset) => {
    if (!preset) return;
    error.value = null;
    roundTripTouched.value = false;
    const firstVehicle = catalog.sortedVehicleTypes.find((type) => type.isActive);
    Object.assign(form, {
      originZoneId: preset.originZoneId,
      destinationZoneId: preset.destinationZoneId ?? 0,
      vehicleTypeId: preset.vehicleTypeId ?? firstVehicle?.id ?? 0,
      minPax: 1,
      priceOneWay: '',
      priceRoundTrip: '',
      isBidirectional: true,
      validFrom: new Date().toISOString().slice(0, 10),
    });
    form.maxPax = catalog.vehicleTypeById.get(form.vehicleTypeId)?.maxPassengers ?? 1;
  },
  { immediate: true },
);

// Al cambiar de vehículo, el máximo de pasajeros se ajusta a su capacidad.
watch(() => form.vehicleTypeId, () => (form.maxPax = vehicle.value?.maxPassengers ?? form.maxPax));

// Redondo sugerido = sencillo × 1.85 (como las tarifas actuales), hasta que se escriba a mano.
watch(
  () => form.priceOneWay,
  (oneWay) => {
    if (!roundTripTouched.value && oneWay !== '') form.priceRoundTrip = Math.round(Number(oneWay) * ROUND_TRIP_FACTOR);
  },
);

async function save() {
  saving.value = true;
  error.value = null;
  try {
    await catalog.createRate({
      originZoneId: Number(form.originZoneId),
      destinationZoneId: Number(form.destinationZoneId),
      vehicleTypeId: Number(form.vehicleTypeId),
      minPax: Number(form.minPax),
      maxPax: Number(form.maxPax),
      priceOneWay: Number(form.priceOneWay),
      priceRoundTrip: Number(form.priceRoundTrip),
      isBidirectional: form.isBidirectional,
      validFrom: form.validFrom,
      validTo: null,
      isActive: true,
    });
    emit('created');
    emit('close');
  } catch (e) {
    error.value = e instanceof CatalogError ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseDrawer :open="props.preset !== null" title="Nueva tarifa" subtitle="Precio por vehículo completo, en USD." @close="emit('close')">
    <form id="rate-create-form" class="space-y-4" novalidate @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id }" label="Origen">
          <select :id="id" v-model.number="form.originZoneId" :class="inputClass()">
            <option v-for="zone in catalog.sortedZones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
          </select>
        </FormField>
        <FormField v-slot="{ id }" label="Destino">
          <select :id="id" v-model.number="form.destinationZoneId" :class="inputClass()">
            <option :value="0" disabled>Elige una zona</option>
            <option v-for="zone in catalog.sortedZones.filter((candidate) => candidate.id !== form.originZoneId)" :key="zone.id" :value="zone.id">
              {{ zone.name }}{{ zone.isActive ? '' : ' (inactiva)' }}
            </option>
          </select>
        </FormField>
      </div>

      <FormField v-slot="{ id }" label="Vehículo">
        <select :id="id" v-model.number="form.vehicleTypeId" :class="inputClass()">
          <option v-for="type in catalog.sortedVehicleTypes" :key="type.id" :value="type.id">
            {{ type.name }} · hasta {{ type.maxPassengers }} pasajeros
          </option>
        </select>
      </FormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id }" label="Pasajeros desde">
          <input :id="id" v-model.number="form.minPax" type="number" min="1" :max="vehicle?.maxPassengers" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id, describedBy }" label="Pasajeros hasta" :hint="vehicle ? `Máximo ${vehicle.maxPassengers} en ${vehicle.name}` : undefined">
          <input :id="id" v-model.number="form.maxPax" type="number" :min="form.minPax" :max="vehicle?.maxPassengers" :aria-describedby="describedBy" :class="inputClass()" />
        </FormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id }" label="Sencillo (USD)">
          <input :id="id" v-model.number="form.priceOneWay" type="number" min="1" step="1" inputmode="decimal" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id, describedBy }" label="Redondo (USD)" :hint="roundTripTouched ? undefined : 'Sugerido: sencillo × 1.85'">
          <input
            :id="id"
            v-model.number="form.priceRoundTrip"
            type="number"
            min="1"
            step="1"
            inputmode="decimal"
            :aria-describedby="describedBy"
            :class="inputClass()"
            @input="roundTripTouched = true"
          />
        </FormField>
      </div>

      <FormField v-slot="{ id, describedBy }" label="Vigente desde" hint="El cotizador usa la tarifa vigente en la fecha del servicio.">
        <input :id="id" v-model="form.validFrom" type="date" :aria-describedby="describedBy" :class="inputClass()" />
      </FormField>

      <div class="flex items-center justify-between gap-4 rounded-lg border border-fog-200 px-3 py-2.5">
        <div>
          <p class="text-sm font-semibold">Aplica en ambos sentidos</p>
          <p class="text-xs text-brand-900/60">El mismo precio sirve de destino a origen (p. ej. hotel → aeropuerto).</p>
        </div>
        <ToggleSwitch v-model="form.isBidirectional" label="Aplica en ambos sentidos" />
      </div>

      <p v-if="error" role="alert" class="rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" :class="ghostButton" @click="emit('close')">Cancelar</button>
        <button type="submit" form="rate-create-form" :class="primaryButton" :disabled="saving">{{ saving ? 'Guardando…' : 'Crear tarifa' }}</button>
      </div>
    </template>
  </BaseDrawer>
</template>

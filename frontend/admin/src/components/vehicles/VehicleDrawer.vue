<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import FormField from '@/components/ui/FormField.vue';
import { VEHICLE_STATUS } from '@/config/catalog';
import { CatalogError, useCatalogStore } from '@/stores/catalog';
import type { VehicleStatus } from '@/types/catalog';
import { ghostButton, inputClass, primaryButton } from '@/utils/formStyles';

/** `vehicleId`: null = cerrado, 'new' = alta, número = edición. */
const props = defineProps<{ vehicleId: number | 'new' | null }>();
const emit = defineEmits<{ close: [] }>();

const catalog = useCatalogStore();
const editing = computed(() => (typeof props.vehicleId === 'number' ? catalog.vehicles.find((vehicle) => vehicle.id === props.vehicleId) : undefined));

const form = reactive({
  vehicleTypeId: 0,
  unitNumber: '',
  plate: '',
  brand: '',
  model: '',
  year: '' as number | '',
  status: 'ACTIVE' as VehicleStatus,
  notes: '',
});
const error = ref<string | null>(null);
const saving = ref(false);

watch(
  () => props.vehicleId,
  () => {
    error.value = null;
    const vehicle = editing.value;
    Object.assign(
      form,
      vehicle
        ? { ...vehicle, brand: vehicle.brand ?? '', model: vehicle.model ?? '', year: vehicle.year ?? '', notes: vehicle.notes ?? '' }
        : { vehicleTypeId: catalog.sortedVehicleTypes[0]?.id ?? 0, unitNumber: '', plate: '', brand: '', model: '', year: '', status: 'ACTIVE', notes: '' },
    );
  },
  { immediate: true },
);

async function save() {
  saving.value = true;
  error.value = null;
  try {
    await catalog.saveVehicle(
      {
        vehicleTypeId: Number(form.vehicleTypeId),
        unitNumber: form.unitNumber,
        plate: form.plate,
        brand: form.brand,
        model: form.model,
        year: form.year === '' ? null : Number(form.year),
        status: form.status,
        notes: form.notes,
      },
      editing.value?.id,
    );
    emit('close');
  } catch (e) {
    error.value = e instanceof CatalogError ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseDrawer
    :open="props.vehicleId !== null"
    :title="editing ? `Unidad ${editing.unitNumber}` : 'Nueva unidad'"
    subtitle="Camioneta física de la flota: se asigna a los traslados."
    @close="emit('close')"
  >
    <form id="vehicle-form" class="space-y-4" novalidate @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id }" label="Número de unidad">
          <input :id="id" v-model="form.unitNumber" maxlength="20" placeholder="T-04" :class="[inputClass(), 'uppercase']" />
        </FormField>
        <FormField v-slot="{ id }" label="Placas">
          <input :id="id" v-model="form.plate" maxlength="20" :class="[inputClass(), 'uppercase']" />
        </FormField>
      </div>
      <FormField v-slot="{ id }" label="Tipo de vehículo">
        <select :id="id" v-model.number="form.vehicleTypeId" :class="inputClass()">
          <option v-for="type in catalog.sortedVehicleTypes" :key="type.id" :value="type.id">
            {{ type.name }} · hasta {{ type.maxPassengers }} pasajeros
          </option>
        </select>
      </FormField>
      <div class="grid gap-4 sm:grid-cols-3">
        <FormField v-slot="{ id }" label="Marca" optional>
          <input :id="id" v-model="form.brand" maxlength="60" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id }" label="Modelo" optional>
          <input :id="id" v-model="form.model" maxlength="60" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id }" label="Año" optional>
          <input :id="id" v-model.number="form.year" type="number" min="1990" :max="new Date().getFullYear() + 1" :class="inputClass()" />
        </FormField>
      </div>
      <FormField v-slot="{ id, describedBy }" label="Estado" hint="Solo las unidades activas se pueden asignar a traslados.">
        <select :id="id" v-model="form.status" :aria-describedby="describedBy" :class="inputClass()">
          <option v-for="(meta, value) in VEHICLE_STATUS" :key="value" :value="value">{{ meta.label }}</option>
        </select>
      </FormField>
      <FormField v-slot="{ id }" label="Notas" optional>
        <textarea
          :id="id"
          v-model="form.notes"
          rows="3"
          maxlength="255"
          class="w-full rounded-lg border border-fog-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25"
        />
      </FormField>

      <p v-if="error" role="alert" class="rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" :class="ghostButton" @click="emit('close')">Cancelar</button>
        <button type="submit" form="vehicle-form" :class="primaryButton" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </template>
  </BaseDrawer>
</template>

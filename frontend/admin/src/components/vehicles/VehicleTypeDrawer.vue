<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import FormField from '@/components/ui/FormField.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { VEHICLE_IMAGES } from '@/config/catalog';
import VehicleImage from './VehicleImage.vue';
import { CatalogError, useCatalogStore } from '@/stores/catalog';
import type { VehicleTypeInput } from '@/types/catalog';
import { ghostButton, inputClass, primaryButton } from '@/utils/formStyles';

/** `typeId`: null = cerrado, 'new' = alta, número = edición. */
const props = defineProps<{ typeId: number | 'new' | null }>();
const emit = defineEmits<{ close: [] }>();

const catalog = useCatalogStore();
const editing = computed(() => (typeof props.typeId === 'number' ? catalog.vehicleTypeById.get(props.typeId) : undefined));

const form = reactive({
  code: '',
  name: '',
  description: '',
  maxPassengers: 4,
  maxLuggage: 4,
  imageUrl: '',
  sortOrder: 1,
  isActive: true,
});
const error = ref<string | null>(null);
const saving = ref(false);

watch(
  () => props.typeId,
  () => {
    error.value = null;
    const type = editing.value;
    Object.assign(
      form,
      type
        ? { ...type, description: type.description ?? '', imageUrl: type.imageUrl ?? '' }
        : { code: '', name: '', description: '', maxPassengers: 4, maxLuggage: 4, imageUrl: '', sortOrder: catalog.vehicleTypes.length + 1, isActive: true },
    );
  },
  { immediate: true },
);

/** Unidades de la flota de este tipo (para avisar al desactivarlo). */
const unitCount = computed(() => (editing.value ? catalog.vehicles.filter((vehicle) => vehicle.vehicleTypeId === editing.value!.id).length : 0));

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const input: VehicleTypeInput = {
      code: form.code,
      name: form.name,
      description: form.description,
      maxPassengers: Number(form.maxPassengers),
      maxLuggage: Number(form.maxLuggage),
      imageUrl: form.imageUrl,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };
    await catalog.saveVehicleType(input, editing.value?.id);
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
    :open="props.typeId !== null"
    :title="editing ? `Editar ${editing.name}` : 'Nuevo tipo de vehículo'"
    subtitle="Es lo que el cliente elige al reservar; las tarifas se definen por tipo."
    @close="emit('close')"
  >
    <form id="vehicle-type-form" class="space-y-4" novalidate @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id }" label="Nombre (lo ve el cliente)">
          <input :id="id" v-model="form.name" maxlength="80" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id, describedBy }" label="Código" hint="Interno, en mayúsculas. Ej. SUV_LUJO">
          <input :id="id" v-model="form.code" maxlength="30" :aria-describedby="describedBy" :class="[inputClass(), 'uppercase']" />
        </FormField>
      </div>

      <FormField v-slot="{ id, describedBy }" label="Descripción" optional hint="Ej. Volkswagen Jetta or similar (en inglés, como el sitio)">
        <input :id="id" v-model="form.description" maxlength="255" :aria-describedby="describedBy" :class="inputClass()" />
      </FormField>

      <div class="grid gap-4 sm:grid-cols-3">
        <FormField v-slot="{ id }" label="Pasajeros máx.">
          <input :id="id" v-model.number="form.maxPassengers" type="number" min="1" max="50" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id }" label="Maletas máx.">
          <input :id="id" v-model.number="form.maxLuggage" type="number" min="0" max="50" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id, describedBy }" label="Orden" hint="Posición en el sitio">
          <input :id="id" v-model.number="form.sortOrder" type="number" min="0" :aria-describedby="describedBy" :class="inputClass()" />
        </FormField>
      </div>

      <FormField v-slot="{ id, describedBy }" label="Foto" optional hint="Las fotos viven en el sitio público. También acepta una URL completa.">
        <div class="space-y-2">
          <select :id="id" v-model="form.imageUrl" :aria-describedby="describedBy" :class="inputClass()">
            <option value="">Sin foto</option>
            <option v-for="image in VEHICLE_IMAGES" :key="image.path" :value="image.path">{{ image.label }}</option>
            <option v-if="form.imageUrl && !VEHICLE_IMAGES.some((image) => image.path === form.imageUrl)" :value="form.imageUrl">
              {{ form.imageUrl }}
            </option>
          </select>
          <div class="overflow-hidden rounded-lg">
            <VehicleImage :image-url="form.imageUrl || null" alt="Vista previa de la foto" />
          </div>
        </div>
      </FormField>

      <div class="flex items-center justify-between gap-4 rounded-lg border border-fog-200 px-3 py-2.5">
        <div>
          <p class="text-sm font-semibold">Disponible para reservar</p>
          <p class="text-xs text-brand-900/60">
            Si se desactiva, el sitio deja de ofrecerlo<template v-if="unitCount"> (sus {{ unitCount }} unidades siguen en la flota)</template>.
          </p>
        </div>
        <ToggleSwitch v-model="form.isActive" label="Disponible para reservar" />
      </div>

      <p v-if="error" role="alert" class="rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" :class="ghostButton" @click="emit('close')">Cancelar</button>
        <button type="submit" form="vehicle-type-form" :class="primaryButton" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </template>
  </BaseDrawer>
</template>

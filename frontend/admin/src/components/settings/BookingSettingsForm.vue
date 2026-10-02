<script setup lang="ts">
import { computed, onMounted } from 'vue';
import FormField from '@/components/ui/FormField.vue';
import { useSectionForm } from '@/composables/useSectionForm';
import { useCatalogStore } from '@/stores/catalog';
import { useSettingsStore } from '@/stores/settings';
import { inputClass } from '@/utils/formStyles';
import SectionActions from './SectionActions.vue';

const store = useSettingsStore();
const catalog = useCatalogStore();
onMounted(() => catalog.load());

const { form, dirty, saving, saved, reset, save, errorFor } = useSectionForm(
  () => store.settings?.booking,
  (values) => store.save('booking', values),
);
defineExpose({ dirty });

const hour = (h: number) => `${String(((Math.floor(h) % 24) + 24) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

/** Ejemplos en vivo de lo que significa cada valor. */
const examples = computed(() => {
  if (!form.value) return null;
  const notice = Number(form.value.minNoticeHours) || 0;
  const pickup = 10 + notice;
  const days = Math.floor(pickup / 24);
  const lead = Number(form.value.departurePickupLeadHours) || 0;
  const factor = Number(form.value.roundTripFactor) || 0;
  return {
    notice: `Si alguien reserva hoy a las 10:00, la recogida más temprana es ${days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`} a las ${hour(pickup)}.`,
    hold: `Una reserva sin pagar conserva su precio ${form.value.holdMinutes} minutos; después hay que reservar de nuevo.`,
    lead: `Vuelo a las 15:00 → el sitio sugiere recoger a las ${hour(15 - lead)}.`,
    factor: `Sencillo de USD 100 → redondo sugerido de USD ${Math.round(100 * factor)}.`,
  };
});

/** El vehículo más grande activo: más pasajeros en línea no tendrían con qué cotizarse. */
const largestCapacity = computed(() => Math.max(0, ...catalog.vehicleTypes.filter((type) => type.isActive).map((type) => type.maxPassengers)));
</script>

<template>
  <form v-if="form && examples" class="space-y-5" novalidate @submit.prevent="save">
    <p class="text-sm text-brand-900/65">Reglas que aplica el sitio al cotizar y reservar en línea.</p>

    <div class="grid gap-5 sm:grid-cols-2">
      <FormField v-slot="{ id, describedBy }" label="Anticipación mínima (horas)" :error="errorFor('minNoticeHours')" :hint="examples.notice">
        <input :id="id" v-model.number="form.minNoticeHours" type="number" min="0" max="168" step="1" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('minNoticeHours')))" />
      </FormField>
      <FormField v-slot="{ id, describedBy }" label="Apartar precio sin pagar (minutos)" :error="errorFor('holdMinutes')" :hint="examples.hold">
        <input :id="id" v-model.number="form.holdMinutes" type="number" min="30" max="1440" step="5" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('holdMinutes')))" />
      </FormField>
      <FormField
        v-slot="{ id, describedBy }"
        label="Máximo de pasajeros en línea"
        :error="errorFor('maxOnlinePassengers')"
        hint="Grupos más grandes se envían a cotización personal."
      >
        <input :id="id" v-model.number="form.maxOnlinePassengers" type="number" min="1" max="50" step="1" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('maxOnlinePassengers')))" />
      </FormField>
      <FormField v-slot="{ id, describedBy }" label="Recogida antes del vuelo (horas)" :error="errorFor('departurePickupLeadHours')" :hint="examples.lead">
        <input :id="id" v-model.number="form.departurePickupLeadHours" type="number" min="1" max="6" step="0.5" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('departurePickupLeadHours')))" />
      </FormField>
      <FormField v-slot="{ id, describedBy }" label="Factor del viaje redondo" :error="errorFor('roundTripFactor')" :hint="examples.factor">
        <input :id="id" v-model.number="form.roundTripFactor" type="number" min="1" max="2.5" step="0.05" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('roundTripFactor')))" />
      </FormField>
    </div>

    <p v-if="largestCapacity && form.maxOnlinePassengers > largestCapacity" class="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      El vehículo más grande lleva {{ largestCapacity }} pasajeros: los grupos de {{ largestCapacity + 1 }} a {{ form.maxOnlinePassengers }} podrán buscar pero no
      verán precios. Baja el máximo o agrega un vehículo más grande.
    </p>

    <SectionActions :dirty="dirty" :saving="saving" :saved="saved" :message="errorFor('form')" @save="save" @reset="reset" />
  </form>
</template>

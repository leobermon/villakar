<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import FormField from '@/components/ui/FormField.vue';
import type { AdjustableRate } from '@/types/catalog';
import { formatUsd } from '@/utils/format';
import { ghostButton, inputClass, primaryButton } from '@/utils/formStyles';

const props = defineProps<{ open: boolean; rows: AdjustableRate[] }>();
const emit = defineEmits<{ close: []; apply: [changes: Array<{ id: number; priceOneWay: number; priceRoundTrip: number }>] }>();

const form = reactive({
  mode: 'percent' as 'percent' | 'amount',
  value: 10 as number | '',
  target: 'both' as 'both' | 'oneWay' | 'roundTrip',
});

watch(
  () => props.open,
  (open) => open && Object.assign(form, { mode: 'percent', value: 10, target: 'both' }),
);

/** Aplica el ajuste y redondea al dólar; nunca baja de USD 1. */
function adjust(price: number): number {
  const value = Number(form.value) || 0;
  const next = form.mode === 'percent' ? price * (1 + value / 100) : price + value;
  return Math.max(1, Math.round(next));
}

const preview = computed(() =>
  props.rows.map((row) => ({
    ...row,
    nextOneWay: form.target === 'roundTrip' ? row.priceOneWay : adjust(row.priceOneWay),
    nextRoundTrip: form.target === 'oneWay' ? row.priceRoundTrip : adjust(row.priceRoundTrip),
  })),
);

const valid = computed(() => form.value !== '' && Number(form.value) !== 0 && props.rows.length > 0);

function apply() {
  if (!valid.value) return;
  emit(
    'apply',
    preview.value.map((row) => ({ id: row.id, priceOneWay: row.nextOneWay, priceRoundTrip: row.nextRoundTrip })),
  );
  emit('close');
}
</script>

<template>
  <BaseDrawer
    :open="props.open"
    title="Ajuste masivo de precios"
    :subtitle="`Se aplica a las ${props.rows.length} tarifas que tienes a la vista con los filtros actuales.`"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <fieldset>
        <legend class="mb-1 text-xs font-semibold text-brand-900/70">Tipo de ajuste</legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="option in [
              { value: 'percent', label: 'Porcentaje' },
              { value: 'amount', label: 'Monto fijo (USD)' },
            ] as const"
            :key="option.value"
            class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold"
            :class="form.mode === option.value ? 'border-brand-500 bg-brand-50' : 'border-fog-200'"
          >
            <input v-model="form.mode" type="radio" :value="option.value" class="accent-brand-600" />
            {{ option.label }}
          </label>
        </div>
      </fieldset>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id, describedBy }" :label="form.mode === 'percent' ? 'Porcentaje' : 'Monto (USD)'" hint="Usa negativo para bajar: -5">
          <input :id="id" v-model.number="form.value" type="number" step="1" :aria-describedby="describedBy" :class="inputClass()" />
        </FormField>
        <FormField v-slot="{ id }" label="Aplicar a">
          <select :id="id" v-model="form.target" :class="inputClass()">
            <option value="both">Sencillo y redondo</option>
            <option value="oneWay">Solo sencillo</option>
            <option value="roundTrip">Solo redondo</option>
          </select>
        </FormField>
      </div>

      <div>
        <p class="text-xs font-semibold text-brand-900/70">Vista previa · se redondea al dólar</p>
        <ul class="mt-2 max-h-72 divide-y divide-fog-100 overflow-y-auto rounded-lg border border-fog-200 text-sm">
          <li v-for="row in preview" :key="row.id" class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="min-w-0 truncate">{{ row.label }}</span>
            <span class="shrink-0 text-right text-xs tabular-nums">
              <span class="text-brand-900/50">{{ formatUsd(row.priceOneWay) }}</span> → <strong>{{ formatUsd(row.nextOneWay) }}</strong>
              <span class="mx-1 text-brand-900/30">|</span>
              <span class="text-brand-900/50">{{ formatUsd(row.priceRoundTrip) }}</span> → <strong>{{ formatUsd(row.nextRoundTrip) }}</strong>
            </span>
          </li>
        </ul>
      </div>

      <p class="text-xs text-brand-900/60">Los cambios quedan pendientes en la tabla: revísalos y pulsa Guardar cambios.</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" :class="ghostButton" @click="emit('close')">Cancelar</button>
        <button type="button" :class="primaryButton" :disabled="!valid" @click="apply">Aplicar a {{ props.rows.length }} tarifas</button>
      </div>
    </template>
  </BaseDrawer>
</template>

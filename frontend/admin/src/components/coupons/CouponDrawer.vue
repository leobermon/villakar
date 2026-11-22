<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import FormField from '@/components/ui/FormField.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useCouponsStore } from '@/stores/coupons';
import type { CouponUpdate } from '@/types/coupon';
import { inputClass, primaryButton, secondaryButton } from '@/utils/formStyles';

/** Alta ('new') o edición (id) de un cupón. El código no se cambia una vez creado. */
const props = defineProps<{ target: 'new' | number | null }>();
const emit = defineEmits<{ close: [] }>();

const store = useCouponsStore();

const isNew = computed(() => props.target === 'new');
const coupon = computed(() => (typeof props.target === 'number' ? store.find(props.target) : undefined));
const open = computed(() => isNew.value || Boolean(coupon.value));

/** Importes y límite se editan como texto para poder validar lo que escribe el usuario. */
const form = reactive({
  code: '',
  description: '',
  discountOneWay: '',
  discountRoundTrip: '',
  validFrom: '',
  validTo: '',
  limited: true,
  maxUses: '',
  isActive: true,
});
const errors = reactive<Record<string, string | null>>({});
const saving = ref(false);
const saveError = ref<string | null>(null);
const saved = ref(false);

function reset() {
  const current = coupon.value;
  Object.assign(form, {
    code: current?.code ?? '',
    description: current?.description ?? '',
    discountOneWay: current ? String(current.discountOneWay) : '',
    discountRoundTrip: current ? String(current.discountRoundTrip) : '',
    validFrom: current?.validFrom ?? '',
    validTo: current?.validTo ?? '',
    limited: current ? current.maxUses !== null : true,
    maxUses: current?.maxUses != null ? String(current.maxUses) : '',
    isActive: current?.isActive ?? true,
  });
  for (const key of Object.keys(errors)) errors[key] = null;
  saveError.value = null;
  saved.value = false;
}
watch(() => [props.target, Boolean(coupon.value)], reset, { immediate: true });

const MONEY = /^\d{1,5}(\.\d{1,2})?$/;

function validate(): boolean {
  errors.code = !isNew.value || /^[A-Za-z0-9_-]{3,30}$/.test(form.code.trim()) ? null : 'De 3 a 30 letras, números, guiones o guion bajo.';
  errors.discountOneWay = MONEY.test(form.discountOneWay.trim()) ? null : 'Escribe un monto en USD, por ejemplo 5 o 5.50.';
  errors.discountRoundTrip = MONEY.test(form.discountRoundTrip.trim()) ? null : 'Escribe un monto en USD, por ejemplo 10.';
  errors.validFrom = form.validFrom ? null : 'Elige cuándo empieza.';
  errors.validTo = !form.validTo ? 'Elige cuándo termina.' : form.validFrom && form.validTo <= form.validFrom ? 'Debe ser posterior al inicio.' : null;
  errors.maxUses = !form.limited || /^[1-9]\d{0,6}$/.test(form.maxUses.trim()) ? null : 'Escribe un número entero mayor que 0.';
  return !Object.values(errors).some(Boolean);
}

const dirty = computed(() => {
  const current = coupon.value;
  if (!current) return true;
  return (
    form.description.trim() !== (current.description ?? '') ||
    Number(form.discountOneWay) !== current.discountOneWay ||
    Number(form.discountRoundTrip) !== current.discountRoundTrip ||
    form.validFrom !== current.validFrom ||
    form.validTo !== current.validTo ||
    (form.limited ? Number(form.maxUses) : null) !== current.maxUses ||
    form.isActive !== current.isActive
  );
});

async function save() {
  if (saving.value || !validate()) return;
  saving.value = true;
  saveError.value = null;
  saved.value = false;
  const maxUses = form.limited ? Number(form.maxUses) : null;
  try {
    if (isNew.value) {
      await store.create({
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discountOneWay: Number(form.discountOneWay),
        discountRoundTrip: Number(form.discountRoundTrip),
        validFrom: form.validFrom,
        validTo: form.validTo,
        maxUses,
        isActive: form.isActive,
      });
      emit('close');
      return;
    }
    const current = coupon.value!;
    const changes: CouponUpdate = {};
    if (form.description.trim() !== (current.description ?? '')) changes.description = form.description.trim();
    if (Number(form.discountOneWay) !== current.discountOneWay) changes.discountOneWay = Number(form.discountOneWay);
    if (Number(form.discountRoundTrip) !== current.discountRoundTrip) changes.discountRoundTrip = Number(form.discountRoundTrip);
    if (form.validFrom !== current.validFrom) changes.validFrom = form.validFrom;
    if (form.validTo !== current.validTo) changes.validTo = form.validTo;
    if (maxUses !== current.maxUses) changes.maxUses = maxUses;
    if (form.isActive !== current.isActive) changes.isActive = form.isActive;
    await store.update(current.id, changes);
    saved.value = true;
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseDrawer
    :open="open"
    :title="isNew ? 'Nuevo cupón' : (coupon?.code ?? '')"
    :subtitle="isNew ? 'Descuento fijo en USD sobre el total de la reserva.' : `${coupon?.uses ?? 0} ${coupon?.uses === 1 ? 'uso' : 'usos'} hasta ahora`"
    @close="emit('close')"
  >
    <form class="space-y-4" novalidate @submit.prevent="save">
      <FormField
        label="Código"
        :error="errors.code"
        :hint="isNew ? 'Lo escribe el cliente al reservar. No distingue mayúsculas.' : 'El código no se puede cambiar.'"
        v-slot="{ id, describedBy, invalid }"
      >
        <input
          :id="id"
          v-model="form.code"
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          :disabled="!isNew"
          maxlength="30"
          autocomplete="off"
          :class="[inputClass(invalid), 'uppercase']"
        />
      </FormField>

      <FormField label="Descripción" optional hint="Solo para uso interno, por ejemplo la campaña." v-slot="{ id, describedBy }">
        <input :id="id" v-model="form.description" :aria-describedby="describedBy" maxlength="190" autocomplete="off" :class="inputClass()" />
      </FormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField label="Descuento One way (USD)" :error="errors.discountOneWay" v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.discountOneWay" :aria-describedby="describedBy" :aria-invalid="invalid" inputmode="decimal" autocomplete="off" :class="inputClass(invalid)" />
        </FormField>
        <FormField label="Descuento Round trip (USD)" :error="errors.discountRoundTrip" v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.discountRoundTrip" :aria-describedby="describedBy" :aria-invalid="invalid" inputmode="decimal" autocomplete="off" :class="inputClass(invalid)" />
        </FormField>
      </div>
      <p class="-mt-2 text-xs text-brand-900/55">Es un monto por reserva completa, no por tramo ni por pasajero. El total nunca baja de 0.</p>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField label="Válido desde" :error="errors.validFrom" v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.validFrom" type="datetime-local" :aria-describedby="describedBy" :aria-invalid="invalid" :class="inputClass(invalid)" />
        </FormField>
        <FormField label="Válido hasta" :error="errors.validTo" v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.validTo" type="datetime-local" :aria-describedby="describedBy" :aria-invalid="invalid" :class="inputClass(invalid)" />
        </FormField>
      </div>
      <p class="-mt-2 text-xs text-brand-900/55">Hora de Cancún.</p>

      <div class="space-y-3 rounded-xl border border-fog-200 p-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-brand-950">Limitar usos totales</p>
            <p class="text-xs text-brand-900/60">Cada correo puede usar el cupón una sola vez.</p>
          </div>
          <ToggleSwitch v-model="form.limited" label="Limitar usos totales" />
        </div>
        <FormField v-if="form.limited" label="Máximo de usos" :error="errors.maxUses" v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.maxUses" :aria-describedby="describedBy" :aria-invalid="invalid" inputmode="numeric" autocomplete="off" :class="inputClass(invalid)" />
        </FormField>
      </div>

      <div class="flex items-center justify-between gap-4 rounded-xl border border-fog-200 p-4">
        <div>
          <p class="text-sm font-semibold text-brand-950">Cupón activo</p>
          <p class="text-xs text-brand-900/60">Si lo desactivas, el código deja de funcionar de inmediato.</p>
        </div>
        <ToggleSwitch v-model="form.isActive" label="Cupón activo" />
      </div>

      <p v-if="saveError" role="alert" class="text-sm font-medium text-accent-600">{{ saveError }}</p>
      <p v-else-if="saved && !dirty" role="status" class="text-sm font-medium text-emerald-700">Cambios guardados.</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" :class="secondaryButton" @click="emit('close')">{{ isNew ? 'Cancelar' : 'Cerrar' }}</button>
        <button type="button" :class="primaryButton" :disabled="saving || !dirty" @click="save">
          {{ saving ? 'Guardando…' : isNew ? 'Crear cupón' : 'Guardar cambios' }}
        </button>
      </div>
    </template>
  </BaseDrawer>
</template>

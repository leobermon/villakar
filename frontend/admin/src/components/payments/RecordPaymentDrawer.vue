<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import OrderPicker from '@/components/orders/OrderPicker.vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import { useOrdersStore } from '@/stores/orders';
import { usePaymentsStore } from '@/stores/payments';
import type { NewManualPayment } from '@/types/payment';
import { formatUsd } from '@/utils/format';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; openPayment: [id: number] }>();

const payments = usePaymentsStore();
const orders = useOrdersStore();

const form = reactive({
  orderId: null as number | null,
  provider: 'CASH' as NewManualPayment['provider'],
  amount: '',
  reference: '',
  receivedBy: '',
  note: '',
});
const errors = reactive<Record<string, string | null>>({});
const saving = ref(false);
const done = ref<string | null>(null);
const ids = { amount: useId(), reference: useId(), receivedBy: useId(), note: useId() };

// Solo órdenes activas con saldo por cobrar.
const payableOrders = computed(() =>
  orders.orders.filter((order) => !['CANCELLED', 'NO_SHOW'].includes(order.status) && payments.balanceOf(order.id) > 0),
);
const order = computed(() => (form.orderId === null ? undefined : orders.find(form.orderId)));
const balance = computed(() => (order.value ? payments.balanceOf(order.value.id) : 0));

/** Si ya hay un pago pendiente del mismo medio, lo correcto es verificarlo, no duplicarlo. */
const duplicatePending = computed(() =>
  order.value ? payments.pendingFor(order.value.id).find((payment) => payment.provider === form.provider) : undefined,
);

function reset() {
  Object.assign(form, { orderId: null, provider: 'CASH', amount: '', reference: '', receivedBy: '', note: '' });
  for (const key of Object.keys(errors)) errors[key] = null;
  done.value = null;
}

watch(() => props.open, (open) => open && reset());

// Al elegir la orden se propone cobrar el saldo completo y, en efectivo, al chofer de la ida.
watch(
  () => form.orderId,
  () => {
    errors.orderId = null;
    if (!order.value) return;
    form.amount = balance.value.toFixed(2);
    if (form.provider === 'CASH' && !form.receivedBy) form.receivedBy = order.value.legs[0]?.driverName ?? '';
  },
);

function validate(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null;
  const amount = Number(form.amount);
  if (!order.value) errors.orderId = 'Elige la orden que se está pagando.';
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Escribe un monto mayor a cero.';
  else if (order.value && amount > balance.value) errors.amount = `No puede ser mayor al saldo (${formatUsd(balance.value)}).`;
  if (form.provider === 'TRANSFER' && !form.reference.trim()) errors.reference = 'La referencia bancaria es obligatoria.';
  if (form.provider === 'CASH' && !form.receivedBy.trim()) errors.receivedBy = 'Indica quién recibió el efectivo.';
  return Object.values(errors).every((message) => !message);
}

async function save() {
  if (!validate() || !order.value) return;
  saving.value = true;
  try {
    const payment = await payments.recordManual({
      orderId: order.value.id,
      provider: form.provider,
      amount: Number(form.amount),
      reference: form.reference.trim() || null,
      receivedBy: form.receivedBy.trim() || null,
      note: form.note.trim() || null,
    });
    const remaining = payments.balanceOf(payment.orderId);
    done.value = `Pago de ${formatUsd(payment.amount)} registrado en ${payment.orderCode}. ${remaining === 0 ? 'La orden quedó pagada.' : `Saldo pendiente: ${formatUsd(remaining)}.`}`;
    form.orderId = null;
    form.amount = '';
    form.reference = '';
    form.note = '';
  } catch (e) {
    errors.form = e instanceof Error ? e.message : 'No se pudo registrar el pago.';
  } finally {
    saving.value = false;
  }
}

const inputClass = (error?: string | null) =>
  [
    'h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-4',
    error ? 'border-accent-500 focus:ring-accent-500/20' : 'border-fog-200 focus:border-brand-400 focus:ring-brand-300/25',
  ].join(' ');
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
</script>

<template>
  <BaseDrawer :open="props.open" title="Registrar pago" subtitle="Efectivo o transferencia que ya se recibió." @close="emit('close')">
    <form id="record-payment" class="space-y-5" novalidate @submit.prevent="save">
      <p v-if="done" role="status" class="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">{{ done }}</p>

      <OrderPicker
        v-model="form.orderId"
        label="Orden"
        :orders="payableOrders"
        :hint="(candidate) => `Saldo ${formatUsd(payments.balanceOf(candidate.id))}`"
        :error="errors.orderId"
      />

      <p v-if="order" class="text-sm text-brand-900/70">
        Total {{ formatUsd(order.total) }} · cobrado {{ formatUsd(payments.paidAmount(order.id)) }} ·
        <strong class="text-brand-950">saldo {{ formatUsd(balance) }}</strong>
      </p>

      <fieldset>
        <legend :class="labelClass">Medio de pago</legend>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="option in [
              { value: 'CASH', label: 'Efectivo' },
              { value: 'TRANSFER', label: 'Transferencia' },
            ] as const"
            :key="option.value"
            class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold"
            :class="form.provider === option.value ? 'border-brand-500 bg-brand-50' : 'border-fog-200 hover:border-brand-200'"
          >
            <input v-model="form.provider" type="radio" name="provider" :value="option.value" class="accent-brand-600" />
            {{ option.label }}
          </label>
        </div>
      </fieldset>

      <div v-if="duplicatePending" class="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        Esta orden ya tiene un pago pendiente en {{ form.provider === 'CASH' ? 'efectivo' : 'transferencia' }} por
        {{ formatUsd(duplicatePending.amount) }}. Para no duplicarlo, verifica ese pago.
        <button type="button" class="font-semibold underline underline-offset-2" @click="emit('openPayment', duplicatePending.id)">
          Ir al pago pendiente
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label :for="ids.amount" :class="labelClass">Monto (USD)</label>
          <input :id="ids.amount" v-model="form.amount" type="number" min="0.01" step="0.01" inputmode="decimal" :class="inputClass(errors.amount)" />
          <p v-if="errors.amount" class="mt-1 text-xs font-medium text-accent-600">{{ errors.amount }}</p>
        </div>
        <div>
          <label :for="ids.receivedBy" :class="labelClass">{{ form.provider === 'CASH' ? 'Lo recibió' : 'Verificó' }}</label>
          <input :id="ids.receivedBy" v-model="form.receivedBy" maxlength="120" :class="inputClass(errors.receivedBy)" />
          <p v-if="errors.receivedBy" class="mt-1 text-xs font-medium text-accent-600">{{ errors.receivedBy }}</p>
        </div>
      </div>

      <div>
        <label :for="ids.reference" :class="labelClass">
          Referencia <span v-if="form.provider === 'CASH'" class="font-normal">(opcional, p. ej. folio del recibo)</span>
        </label>
        <input :id="ids.reference" v-model="form.reference" maxlength="120" :class="inputClass(errors.reference)" />
        <p v-if="errors.reference" class="mt-1 text-xs font-medium text-accent-600">{{ errors.reference }}</p>
      </div>

      <div>
        <label :for="ids.note" :class="labelClass">Nota <span class="font-normal">(opcional)</span></label>
        <input :id="ids.note" v-model="form.note" maxlength="255" :class="inputClass()" />
      </div>

      <p v-if="errors.form" role="alert" class="text-sm font-medium text-accent-600">{{ errors.form }}</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" class="h-10 rounded-lg px-4 text-sm font-semibold text-brand-900 hover:bg-fog-100" @click="emit('close')">
          Cerrar
        </button>
        <button
          type="submit"
          form="record-payment"
          class="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          :disabled="saving || Boolean(duplicatePending)"
        >
          {{ saving ? 'Guardando…' : 'Registrar pago' }}
        </button>
      </div>
    </template>
  </BaseDrawer>
</template>

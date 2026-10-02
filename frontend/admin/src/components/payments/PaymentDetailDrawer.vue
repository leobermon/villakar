<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { PAYMENT_STATUS, PAYMENT_TYPE_LABEL, PROVIDER_LABEL } from '@/config/payments';
import { useOrdersStore } from '@/stores/orders';
import { usePaymentsStore } from '@/stores/payments';
import { formatInstant, formatUsd } from '@/utils/format';

const props = defineProps<{ paymentId: number | null }>();
const emit = defineEmits<{ close: [] }>();

const store = usePaymentsStore();
const orders = useOrdersStore();
const payment = computed(() => store.payments.find((candidate) => candidate.id === props.paymentId));
const order = computed(() => (payment.value ? orders.find(payment.value.orderId) : undefined));

const form = reactive({ receivedBy: '', reference: '', note: '', rejectReason: '' });
const mode = ref<'verify' | 'reject'>('verify');
const saving = ref(false);
const error = ref<string | null>(null);
const done = ref<string | null>(null);
const ids = { receivedBy: useId(), reference: useId(), note: useId(), reason: useId() };

watch(
  () => props.paymentId,
  () => {
    const current = payment.value;
    mode.value = 'verify';
    error.value = null;
    done.value = null;
    if (!current) return;
    // Efectivo: por defecto lo recibió el chofer de la ida. Transferencia: la oficina.
    form.receivedBy = current.receivedBy ?? (current.provider === 'CASH' ? (order.value?.legs[0]?.driverName ?? '') : 'Oficina');
    form.reference = current.reference ?? '';
    form.note = '';
    form.rejectReason = '';
  },
  { immediate: true },
);

const isPending = computed(() => payment.value?.status === 'PENDING');

async function confirm() {
  const current = payment.value;
  if (!current) return;
  if (current.provider === 'TRANSFER' && !form.reference.trim()) {
    error.value = 'Escribe la referencia bancaria que viste en el estado de cuenta.';
    return;
  }
  if (current.provider === 'CASH' && !form.receivedBy.trim()) {
    error.value = 'Indica quién recibió el efectivo.';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await store.verify(current.id, {
      receivedBy: form.receivedBy.trim() || null,
      reference: form.reference.trim() || null,
      note: form.note.trim() || null,
    });
    done.value = `Pago confirmado. La orden ${current.orderCode} quedó ${store.balanceOf(current.orderId) === 0 ? 'pagada' : `con saldo de ${formatUsd(store.balanceOf(current.orderId))}`}.`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}

async function reject() {
  const current = payment.value;
  if (!current) return;
  if (!form.rejectReason.trim()) {
    error.value = 'Escribe el motivo para dejar constancia.';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await store.reject(current.id, form.rejectReason.trim());
    done.value = 'Pago marcado como no recibido.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}

const inputClass =
  'h-10 w-full rounded-lg border border-fog-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
</script>

<template>
  <BaseDrawer
    :open="Boolean(payment)"
    :title="payment ? `${PAYMENT_TYPE_LABEL[payment.type]} · ${formatUsd(payment.amount)}` : ''"
    :subtitle="payment ? `${PROVIDER_LABEL[payment.provider]} · registrado ${formatInstant(payment.createdAt)}` : undefined"
    @close="emit('close')"
  >
    <template v-if="payment" #header>
      <div class="mt-2"><StatusBadge v-bind="PAYMENT_STATUS[payment.status]" /></div>
    </template>

    <div v-if="payment" class="space-y-6">
      <dl class="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-xs text-brand-900/60">Orden</dt>
          <dd>
            <RouterLink
              :to="{ name: 'orders', query: { order: payment.orderId } }"
              class="font-bold text-brand-700 underline underline-offset-2"
            >
              {{ payment.orderCode }}
            </RouterLink>
            <span class="text-brand-900/65"> · {{ payment.customerName }}</span>
          </dd>
        </div>
        <div v-if="order">
          <dt class="text-xs text-brand-900/60">Total de la orden · saldo</dt>
          <dd class="font-medium">{{ formatUsd(order.total) }} · {{ formatUsd(store.balanceOf(order.id)) }} por cobrar</dd>
        </div>
        <div v-if="payment.reference">
          <dt class="text-xs text-brand-900/60">Referencia</dt>
          <dd class="font-medium break-all">{{ payment.reference }}</dd>
        </div>
        <div v-if="payment.receivedBy">
          <dt class="text-xs text-brand-900/60">Recibió</dt>
          <dd class="font-medium">{{ payment.receivedBy }}</dd>
        </div>
        <div v-if="payment.paidAt">
          <dt class="text-xs text-brand-900/60">Fecha de pago</dt>
          <dd class="font-medium">{{ formatInstant(payment.paidAt) }}</dd>
        </div>
        <div v-if="payment.note" class="sm:col-span-2">
          <dt class="text-xs text-brand-900/60">Nota</dt>
          <dd>{{ payment.note }}</dd>
        </div>
      </dl>

      <p v-if="done" role="status" class="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">{{ done }}</p>

      <!-- Verificación: solo para pagos pendientes (efectivo del chofer, transferencias). -->
      <section v-if="isPending" class="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div>
          <h3 class="text-sm font-bold">Verificar pago</h3>
          <p class="text-xs text-brand-900/65">
            {{
              payment.provider === 'CASH'
                ? 'Confírmalo cuando el chofer entregue el efectivo en la oficina.'
                : 'Confírmalo cuando veas el depósito en el estado de cuenta del banco.'
            }}
          </p>
        </div>

        <div class="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-fog-200" role="group" aria-label="Resultado de la verificación">
          <button
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 text-sm font-semibold"
            :class="mode === 'verify' ? 'bg-brand-600 text-white' : 'text-brand-900/70 hover:text-brand-950'"
            :aria-pressed="mode === 'verify'"
            @click="(mode = 'verify'), (error = null)"
          >
            Sí se recibió
          </button>
          <button
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 text-sm font-semibold"
            :class="mode === 'reject' ? 'bg-accent-600 text-white' : 'text-brand-900/70 hover:text-brand-950'"
            :aria-pressed="mode === 'reject'"
            @click="(mode = 'reject'), (error = null)"
          >
            No se recibió
          </button>
        </div>

        <template v-if="mode === 'verify'">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label :for="ids.receivedBy" :class="labelClass">{{ payment.provider === 'CASH' ? 'Lo recibió' : 'Verificó' }}</label>
              <input :id="ids.receivedBy" v-model="form.receivedBy" maxlength="120" :class="inputClass" />
            </div>
            <div>
              <label :for="ids.reference" :class="labelClass">
                Referencia <span v-if="payment.provider !== 'TRANSFER'" class="font-normal">(opcional)</span>
              </label>
              <input :id="ids.reference" v-model="form.reference" maxlength="120" :class="inputClass" />
            </div>
          </div>
          <div>
            <label :for="ids.note" :class="labelClass">Nota <span class="font-normal">(opcional)</span></label>
            <input :id="ids.note" v-model="form.note" maxlength="255" :class="inputClass" />
          </div>
        </template>
        <div v-else>
          <label :for="ids.reason" :class="labelClass">Motivo</label>
          <input :id="ids.reason" v-model="form.rejectReason" maxlength="255" placeholder="Ej. el depósito no aparece en el banco" :class="inputClass" />
        </div>

        <p v-if="error" role="alert" class="text-sm font-medium text-accent-600">{{ error }}</p>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" class="h-10 rounded-lg px-4 text-sm font-semibold text-brand-900 hover:bg-fog-100" @click="emit('close')">
          Cerrar
        </button>
        <button
          v-if="isPending"
          type="button"
          class="h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
          :class="mode === 'verify' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-accent-600 hover:bg-accent-500'"
          :disabled="saving"
          @click="mode === 'verify' ? confirm() : reject()"
        >
          {{ saving ? 'Guardando…' : mode === 'verify' ? 'Confirmar pago recibido' : 'Marcar como no recibido' }}
        </button>
      </div>
    </template>
  </BaseDrawer>
</template>

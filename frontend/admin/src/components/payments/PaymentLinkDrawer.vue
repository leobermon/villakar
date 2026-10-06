<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId, watch } from 'vue';
import OrderPicker from '@/components/orders/OrderPicker.vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import CopyButton from '@/components/ui/CopyButton.vue';
import { LINK_VALIDITY_OPTIONS } from '@/config/payments';
import { useOrdersStore } from '@/stores/orders';
import { usePaymentsStore } from '@/stores/payments';
import { useSettingsStore } from '@/stores/settings';
import type { PaymentLink } from '@/types/payment';
import { formatInstant, formatUsd } from '@/utils/format';
import { paymentLinkEmailUrl, paymentLinkWhatsappUrl } from '@/utils/paymentLinkShare';
import { formatPhone, isInternationalPhone } from '@/utils/phone';

const props = defineProps<{ open: boolean; presetOrderId?: number | null }>();
const emit = defineEmits<{ close: [] }>();

const payments = usePaymentsStore();
const orders = useOrdersStore();
const settings = useSettingsStore();
onMounted(() => settings.load());
/** Idioma del mensaje al cliente (Configuración → Notificaciones). */
const linkLanguage = computed(() => settings.settings?.notifications.paymentLinkLanguage ?? 'en');

type Mode = 'order' | 'free';
const mode = ref<Mode>('order');
const form = reactive({
  orderId: null as number | null,
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  description: '',
  amount: '',
  validHours: 48,
});
const errors = reactive<Record<string, string | null>>({});
const saving = ref(false);
const created = ref<PaymentLink | null>(null);
const ids = { name: useId(), email: useId(), phone: useId(), description: useId(), amount: useId(), validity: useId() };

const payableOrders = computed(() =>
  orders.orders.filter((order) => !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(order.status) && payments.balanceOf(order.id) > 0),
);
const order = computed(() => (form.orderId === null ? undefined : orders.find(form.orderId)));

function reset() {
  Object.assign(form, { orderId: null, customerName: '', customerEmail: '', customerPhone: '', description: '', amount: '', validHours: 48 });
  for (const key of Object.keys(errors)) errors[key] = null;
  created.value = null;
  mode.value = 'order';
  if (props.presetOrderId) {
    form.orderId = props.presetOrderId;
    prefillFromOrder();
  }
}

/** Para una orden: saldo y datos del cliente de la orden (editables). */
function prefillFromOrder() {
  errors.orderId = null;
  const current = order.value;
  if (!current) return;
  form.customerName = `${current.customer.firstName} ${current.customer.lastName}`;
  form.customerEmail = current.customer.email;
  form.customerPhone = formatPhone(current.customer.phone);
  form.description = `Private transfer ${current.code}`;
  form.amount = payments.balanceOf(current.id).toFixed(2);
}

// immediate: el panel puede crearse ya abierto (p. ej. al llegar desde el detalle de una orden).
watch(
  () => props.open,
  (open) => open && reset(),
  { immediate: true },
);

/** Cobros pendientes de la orden (efectivo/transferencia): el link podría cobrar dos veces. */
const pendingForOrder = computed(() => (order.value ? payments.pendingFor(order.value.id) : []));

watch(() => form.orderId, prefillFromOrder);

watch(mode, (value) => {
  if (value === 'free') {
    Object.assign(form, { orderId: null, customerName: '', customerEmail: '', customerPhone: '', description: '', amount: '' });
  }
  for (const key of Object.keys(errors)) errors[key] = null;
});

function validate(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null;
  const amount = Number(form.amount);
  if (mode.value === 'order' && !order.value) errors.orderId = 'Elige la orden a cobrar.';
  if (!form.customerName.trim()) errors.customerName = 'Escribe el nombre del cliente.';
  if (!form.description.trim()) errors.description = 'Describe qué se está cobrando.';
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Escribe un monto mayor a cero.';
  else if (order.value && amount > payments.balanceOf(order.value.id)) {
    errors.amount = `No puede ser mayor al saldo de la orden (${formatUsd(payments.balanceOf(order.value.id))}).`;
  }
  if (form.customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) errors.customerEmail = 'Email no válido.';
  if (form.customerPhone.trim() && !isInternationalPhone(form.customerPhone)) {
    errors.customerPhone = 'Número no válido. Escríbelo con la clave de país: +52 998 123 4567.';
  }
  return Object.values(errors).every((message) => !message);
}

async function create() {
  if (!validate()) return;
  saving.value = true;
  try {
    created.value = await payments.createLink({
      orderId: mode.value === 'order' ? form.orderId : null,
      customerName: form.customerName,
      customerEmail: form.customerEmail || null,
      customerPhone: form.customerPhone || null,
      description: form.description,
      amount: Number(form.amount),
      validHours: form.validHours,
    });
  } catch (e) {
    errors.form = e instanceof Error ? e.message : 'No se pudo crear el link.';
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
  <BaseDrawer :open="props.open" title="Nuevo link de pago" subtitle="El cliente paga con tarjeta o PayPal desde el link." @close="emit('close')">
    <!-- Resultado: el link listo para copiar o compartir. -->
    <div v-if="created" class="space-y-5">
      <div class="rounded-xl bg-emerald-50 p-4">
        <p class="text-sm font-bold text-emerald-800">Link creado</p>
        <p class="mt-0.5 text-sm text-emerald-900/80">
          {{ formatUsd(created.amount) }} · {{ created.customerName }} · vence {{ formatInstant(created.expiresAt) }}
        </p>
      </div>

      <div>
        <label :for="`link-url-${created.id}`" :class="labelClass">Link</label>
        <div class="flex gap-2">
          <input :id="`link-url-${created.id}`" :value="created.url" readonly class="h-10 min-w-0 flex-1 rounded-lg border border-fog-200 bg-fog-50 px-3 text-sm" @focus="($event.target as HTMLInputElement).select()" />
          <CopyButton :text="created.url" />
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <a
          :href="paymentLinkWhatsappUrl(created, linkLanguage)"
          target="_blank"
          rel="noopener"
          class="flex h-10 items-center justify-center rounded-lg border border-emerald-600 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          Enviar por WhatsApp
        </a>
        <a
          v-if="created.customerEmail"
          :href="paymentLinkEmailUrl(created, linkLanguage)"
          class="flex h-10 items-center justify-center rounded-lg border border-fog-200 text-sm font-semibold text-brand-800 hover:bg-fog-50"
        >
          Enviar por correo
        </a>
      </div>

      <p class="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
        Vista previa con datos de prueba: el link todavía no abre una página de pago. Funcionará cuando conectemos el
        backend y la página de pago del sitio.
      </p>

      <button type="button" class="text-sm font-semibold text-brand-700 underline underline-offset-2" @click="reset">
        Crear otro link
      </button>
    </div>

    <form v-else id="payment-link-form" class="space-y-5" novalidate @submit.prevent="create">
      <div class="flex gap-1 rounded-lg bg-fog-100 p-1" role="group" aria-label="Tipo de cobro">
        <button
          v-for="option in [
            { value: 'order', label: 'Para una orden' },
            { value: 'free', label: 'Cobro libre' },
          ] as const"
          :key="option.value"
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 text-sm font-semibold"
          :class="mode === option.value ? 'bg-white text-brand-950 shadow-sm' : 'text-brand-900/65 hover:text-brand-950'"
          :aria-pressed="mode === option.value"
          @click="mode = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <OrderPicker
        v-if="mode === 'order'"
        v-model="form.orderId"
        label="Orden"
        :orders="payableOrders"
        :hint="(candidate) => `Saldo ${formatUsd(payments.balanceOf(candidate.id))}`"
        :error="errors.orderId"
      />
      <p v-else class="text-sm text-brand-900/65">Para cargos que no son una reserva: paradas extra, anticipos de grupos, etc.</p>

      <p v-if="mode === 'order' && pendingForOrder.length" class="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        Esta orden ya tiene {{ pendingForOrder.length === 1 ? 'un cobro pendiente' : 'cobros pendientes' }}
        ({{ pendingForOrder.map((payment) => `${payment.provider === 'CASH' ? 'efectivo' : 'transferencia'} ${formatUsd(payment.amount)}`).join(', ') }}).
        Si el cliente paga con el link, marca ese cobro como no recibido para no cobrar dos veces.
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label :for="ids.name" :class="labelClass">Cliente</label>
          <input :id="ids.name" v-model="form.customerName" maxlength="120" :class="inputClass(errors.customerName)" />
          <p v-if="errors.customerName" class="mt-1 text-xs font-medium text-accent-600">{{ errors.customerName }}</p>
        </div>
        <div>
          <label :for="ids.email" :class="labelClass">Email <span class="font-normal">(opcional)</span></label>
          <input :id="ids.email" v-model="form.customerEmail" type="email" maxlength="190" :class="inputClass(errors.customerEmail)" />
          <p v-if="errors.customerEmail" class="mt-1 text-xs font-medium text-accent-600">{{ errors.customerEmail }}</p>
        </div>
        <div>
          <label :for="ids.phone" :class="labelClass">WhatsApp <span class="font-normal">(opcional)</span></label>
          <input :id="ids.phone" v-model="form.customerPhone" type="tel" maxlength="30" placeholder="+52 998 123 4567" :class="inputClass(errors.customerPhone)" />
          <p v-if="errors.customerPhone" class="mt-1 text-xs font-medium text-accent-600">{{ errors.customerPhone }}</p>
        </div>
        <div class="sm:col-span-2">
          <label :for="ids.description" :class="labelClass">Concepto <span class="font-normal">(lo ve el cliente)</span></label>
          <input :id="ids.description" v-model="form.description" maxlength="140" :class="inputClass(errors.description)" />
          <p v-if="errors.description" class="mt-1 text-xs font-medium text-accent-600">{{ errors.description }}</p>
        </div>
        <div>
          <label :for="ids.amount" :class="labelClass">Monto (USD)</label>
          <input :id="ids.amount" v-model="form.amount" type="number" min="0.01" step="0.01" inputmode="decimal" :class="inputClass(errors.amount)" />
          <p v-if="errors.amount" class="mt-1 text-xs font-medium text-accent-600">{{ errors.amount }}</p>
        </div>
        <div>
          <label :for="ids.validity" :class="labelClass">Vigencia</label>
          <select :id="ids.validity" v-model.number="form.validHours" :class="inputClass()">
            <option v-for="option in LINK_VALIDITY_OPTIONS" :key="option.hours" :value="option.hours">{{ option.label }}</option>
          </select>
        </div>
      </div>

      <p v-if="errors.form" role="alert" class="text-sm font-medium text-accent-600">{{ errors.form }}</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" class="h-10 rounded-lg px-4 text-sm font-semibold text-brand-900 hover:bg-fog-100" @click="emit('close')">
          {{ created ? 'Listo' : 'Cancelar' }}
        </button>
        <button
          v-if="!created"
          type="submit"
          form="payment-link-form"
          class="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? 'Creando…' : 'Crear link' }}
        </button>
      </div>
    </template>
  </BaseDrawer>
</template>

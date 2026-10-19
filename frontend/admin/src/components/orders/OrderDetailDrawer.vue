<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId, watch } from 'vue';
import OrderEmailsSection from '@/components/orders/OrderEmailsSection.vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { ORDER_STATUS, ROUTE_LABEL, SOURCE_LABEL, STATUS_TRANSITIONS, paymentSummary } from '@/config/orders';
import { PAYMENT_STATUS, PAYMENT_TYPE_LABEL, PROVIDER_LABEL } from '@/config/payments';
import { useOrdersStore } from '@/stores/orders';
import { usePaymentsStore } from '@/stores/payments';
import type { OrderStatus } from '@/types/order';
import { formatInstant, formatLocalDateTime, formatUsd } from '@/utils/format';
import { countryLabel, formatPhone, phoneDigits } from '@/utils/phone';

const props = defineProps<{ orderId: number | null }>();
const emit = defineEmits<{ close: [] }>();

const store = useOrdersStore();
const payments = usePaymentsStore();
// Los pagos se cargan aparte (módulo Pagos); aquí solo se consultan.
onMounted(() => payments.load());
const order = computed(() => (props.orderId === null ? undefined : store.find(props.orderId)));
const orderPayments = computed(() =>
  order.value ? payments.payments.filter((payment) => payment.orderId === order.value!.id) : [],
);
/** Se puede pedir pago si la orden sigue activa y tiene saldo. */
const canRequestPayment = computed(
  () => Boolean(order.value) && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(order.value!.status) && payments.balanceOf(order.value!.id) > 0,
);

// Copia editable: los cambios no tocan la orden hasta guardar.
const form = reactive({
  status: 'PENDING' as OrderStatus,
  internalNotes: '',
  drivers: [] as Array<{ legNumber: number; driverName: string; driverPhone: string }>,
});
const saving = ref(false);
const saved = ref(false);
const saveError = ref<string | null>(null);
const ids = { status: useId(), notes: useId() };

function resetForm() {
  const current = order.value;
  if (!current) return;
  form.status = current.status;
  form.internalNotes = current.internalNotes ?? '';
  form.drivers = current.legs.map((leg) => ({
    legNumber: leg.legNumber,
    driverName: leg.driverName ?? '',
    driverPhone: leg.driverPhone ?? '',
  }));
  saved.value = false;
  saveError.value = null;
}

// También cuando la orden llega del backend después de abrir el panel (enlace ?order=).
watch(() => [props.orderId, Boolean(order.value)], resetForm, { immediate: true });

const statusOptions = computed(() => {
  const current = order.value?.status;
  return current ? [current, ...STATUS_TRANSITIONS[current]] : [];
});

const dirty = computed(() => {
  const current = order.value;
  if (!current) return false;
  return (
    form.status !== current.status ||
    form.internalNotes !== (current.internalNotes ?? '') ||
    form.drivers.some((driver, index) => {
      const leg = current.legs[index]!;
      return driver.driverName !== (leg.driverName ?? '') || driver.driverPhone !== (leg.driverPhone ?? '');
    })
  );
});

/** Ya no hay validaciones por estado: el chofer es opcional. */
const validationError = computed<string | null>(() => null);

// Si se edita algo después de guardar, el aviso "Guardado" se quita.
watch(
  () => [form.status, form.internalNotes, JSON.stringify(form.drivers)],
  () => {
    if (dirty.value) saved.value = false;
    saveError.value = null;
  },
);

async function save() {
  const current = order.value;
  if (!current || !dirty.value || validationError.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    await store.update(current.id, {
      status: form.status,
      internalNotes: form.internalNotes.trim() || null,
      legs: form.drivers.map((driver) => ({
        legNumber: driver.legNumber,
        driverName: driver.driverName.trim() || null,
        driverPhone: driver.driverPhone.trim() || null,
      })),
    });
    resetForm();
    saved.value = true;
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudieron guardar los cambios.';
  } finally {
    saving.value = false;
  }
}

/** Enlace de WhatsApp a partir del teléfono (solo dígitos). */
function whatsappUrl(phone: string): string {
  return `https://wa.me/${phoneDigits(phone)}`;
}

const inputClass =
  'h-10 w-full rounded-lg border border-fog-200 bg-white px-3 text-base text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-sm font-semibold text-brand-900/70';
const sectionTitle = 'text-base font-bold text-brand-950';
</script>

<template>
  <BaseDrawer
    size="lg"
    :open="Boolean(order)"
    :title="order ? `Orden ${order.code}` : ''"
    :subtitle="order ? `Creada ${formatInstant(order.createdAt)} · ${SOURCE_LABEL[order.source]}` : undefined"
    @close="emit('close')"
  >
    <template v-if="order" #header>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <StatusBadge v-bind="ORDER_STATUS[order.status]" />
        <StatusBadge v-bind="paymentSummary(order)" />
      </div>
    </template>

    <div v-if="order" class="space-y-6">
      <section>
        <h3 :class="sectionTitle">Cliente</h3>
        <dl class="mt-2 grid gap-x-4 gap-y-2 text-base sm:grid-cols-2">
          <div>
            <dt class="text-sm text-brand-900/60">Nombre</dt>
            <dd class="font-medium">{{ order.customer.firstName }} {{ order.customer.lastName }}</dd>
          </div>
          <div>
            <dt class="text-sm text-brand-900/60">Email</dt>
            <dd><a :href="`mailto:${order.customer.email}`" class="font-medium break-all text-brand-700 underline underline-offset-2">{{ order.customer.email }}</a></dd>
          </div>
          <div>
            <dt class="text-sm text-brand-900/60">Teléfono</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <a :href="`tel:+${phoneDigits(order.customer.phone)}`" class="font-medium text-brand-700 underline underline-offset-2">{{ formatPhone(order.customer.phone) }}</a>
              <a :href="whatsappUrl(order.customer.phone)" target="_blank" rel="noopener" class="text-sm font-semibold text-emerald-700 hover:underline">WhatsApp</a>
            </dd>
          </div>
          <div v-if="order.customer.countryCode">
            <dt class="text-sm text-brand-900/60">País</dt>
            <dd class="font-medium">{{ countryLabel(order.customer.countryCode) }}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 :class="sectionTitle">Servicio</h3>
        <dl class="mt-2 grid gap-x-4 gap-y-2 text-base sm:grid-cols-3">
          <div>
            <dt class="text-sm text-brand-900/60">Ruta</dt>
            <dd class="font-medium">{{ ROUTE_LABEL[order.routeType] }}</dd>
          </div>
          <div>
            <dt class="text-sm text-brand-900/60">Vehículo</dt>
            <dd class="font-medium">{{ order.vehicle.name }} · {{ order.passengers }} pax</dd>
          </div>
          <div>
            <dt class="text-sm text-brand-900/60">Total</dt>
            <dd class="font-medium">{{ formatUsd(order.total) }}</dd>
          </div>
        </dl>
        <p v-if="order.specialRequests" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-base text-amber-900">
          <span class="font-semibold">Petición del cliente:</span> {{ order.specialRequests }}
        </p>
      </section>

      <!-- Pagos de la orden: cobrado, saldo y acceso a crear un link de pago. -->
      <section>
        <div class="flex items-center justify-between gap-3">
          <h3 :class="sectionTitle">Pagos</h3>
          <RouterLink
            v-if="canRequestPayment"
            :to="{ name: 'payments', query: { tab: 'links', linkFor: order.id } }"
            class="text-sm font-semibold text-brand-700 underline underline-offset-2"
          >
            Crear link de pago
          </RouterLink>
        </div>
        <p class="mt-1 text-base text-brand-900/70">
          Cobrado {{ formatUsd(payments.paidAmount(order.id)) }} ·
          <strong class="text-brand-950">saldo {{ formatUsd(payments.balanceOf(order.id)) }}</strong>
        </p>
        <ul v-if="orderPayments.length" class="mt-2 divide-y divide-fog-100 rounded-lg border border-fog-200 text-base">
          <li v-for="payment in orderPayments" :key="payment.id" class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="min-w-0">
              <span class="font-medium">{{ PAYMENT_TYPE_LABEL[payment.type] }} · {{ PROVIDER_LABEL[payment.provider] }}</span>
              <span class="block text-sm text-brand-900/55">{{ formatInstant(payment.paidAt ?? payment.createdAt) }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span class="font-semibold tabular-nums" :class="payment.type === 'REFUND' ? 'text-accent-600' : ''">
                {{ payment.type === 'REFUND' ? '−' : '' }}{{ formatUsd(payment.amount) }}
              </span>
              <StatusBadge v-bind="PAYMENT_STATUS[payment.status]" />
            </span>
          </li>
        </ul>
        <p v-else class="mt-2 text-base text-brand-900/60">Todavía no hay pagos registrados.</p>
      </section>

      <!-- Un bloque por tramo, con su chofer. -->
      <section class="space-y-3">
        <h3 :class="sectionTitle">{{ order.legs.length > 1 ? 'Tramos' : 'Tramo' }}</h3>
        <article v-for="(leg, index) in order.legs" :key="leg.legNumber" class="rounded-xl border border-fog-200 p-4">
          <p class="text-sm font-semibold text-brand-600">
            {{ order.legs.length > 1 ? (leg.legNumber === 1 ? 'Ida' : 'Regreso') : 'Traslado' }} ·
            {{ formatLocalDateTime(leg.pickupAt) }}
          </p>
          <p class="mt-1 text-base font-semibold">{{ leg.originName }} → {{ leg.destinationName }}</p>
          <p v-if="leg.flightNumber" class="mt-0.5 text-sm text-brand-900/65">
            Vuelo {{ leg.airline }} {{ leg.flightNumber }}<template v-if="leg.terminal"> · Terminal {{ leg.terminal.slice(1) }}</template>
          </p>
          <div v-if="form.drivers[index]" class="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label :for="`driver-${order.id}-${leg.legNumber}`" :class="labelClass">Chofer</label>
              <input :id="`driver-${order.id}-${leg.legNumber}`" v-model="form.drivers[index].driverName" maxlength="120" placeholder="Sin asignar" :class="inputClass" />
            </div>
            <div>
              <label :for="`driver-phone-${order.id}-${leg.legNumber}`" :class="labelClass">Teléfono del chofer</label>
              <input
                :id="`driver-phone-${order.id}-${leg.legNumber}`"
                v-model="form.drivers[index].driverPhone"
                type="tel"
                maxlength="30"
                placeholder="+52 998 …"
                :class="inputClass"
              />
            </div>
          </div>
        </article>
      </section>

      <!-- Historial de correos al cliente: reserva recibida, confirmación, agradecimiento y cancelación. -->
      <section>
        <h3 :class="[sectionTitle, 'mb-3']">Correos al cliente</h3>
        <OrderEmailsSection :order-id="order.id" :status="order.status" :customer-email="order.customer.email" />
      </section>

      <section class="space-y-3">
        <h3 :class="sectionTitle">Gestión</h3>
        <div>
          <label :for="ids.status" :class="labelClass">Estado</label>
          <select :id="ids.status" v-model="form.status" :class="inputClass" :disabled="statusOptions.length <= 1">
            <option v-for="status in statusOptions" :key="status" :value="status">{{ ORDER_STATUS[status].label }}</option>
          </select>
          <p v-if="statusOptions.length <= 1" class="mt-1 text-sm text-brand-900/60">Esta orden ya está cerrada; su estado no se puede cambiar.</p>
          <p v-else-if="validationError" class="mt-1 text-sm font-medium text-accent-600" role="alert">{{ validationError }}</p>
          <p v-else-if="form.status === 'CANCELLED' && order.status !== 'CANCELLED'" class="mt-1 text-sm font-medium text-accent-600">
            Al guardar, la orden quedará cancelada. Si ya estaba pagada, el reembolso se gestiona en Pagos.
          </p>
        </div>
        <div>
          <label :for="ids.notes" :class="labelClass">Notas internas <span class="font-normal">(no las ve el cliente)</span></label>
          <textarea
            :id="ids.notes"
            v-model="form.internalNotes"
            rows="3"
            maxlength="2000"
            class="w-full rounded-lg border border-fog-200 px-3 py-2 text-base outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25"
          />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <p v-if="saveError" class="mr-auto text-base font-medium text-accent-600" role="alert">{{ saveError }}</p>
        <p v-else-if="saved" class="mr-auto text-base font-medium text-emerald-700" role="status">Cambios guardados</p>
        <button type="button" class="h-10 rounded-lg px-4 text-base font-semibold text-brand-900 hover:bg-fog-100" @click="emit('close')">
          Cerrar
        </button>
        <button
          type="button"
          class="h-10 rounded-lg bg-brand-600 px-4 text-base font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          :disabled="!dirty || saving || Boolean(validationError)"
          @click="save"
        >
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </template>
  </BaseDrawer>
</template>

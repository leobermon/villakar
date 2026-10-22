<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import OrderEmailsSection from '@/components/orders/OrderEmailsSection.vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { LEG_CLOSE_OPTIONS, ORDER_STATUS, ROUTE_LABEL, SOURCE_LABEL, STATUS_TRANSITIONS, legDisplayStatus, paymentSummary } from '@/config/orders';
import { PAYMENT_STATUS, PAYMENT_TYPE_LABEL, PROVIDER_LABEL } from '@/config/payments';
import { useOrdersStore } from '@/stores/orders';
import { usePaymentsStore } from '@/stores/payments';
import type { OrderStatus } from '@/types/order';

/** Cómo se cierra un tramo desde el panel; '' = sigue abierto. */
type LegClose = 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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
  drivers: [] as Array<{ legNumber: number; driverName: string; driverPhone: string; closeAs: LegClose | '' }>,
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
    closeAs: '',
  }));
  saved.value = false;
  saveError.value = null;
}

// También cuando la orden llega del backend después de abrir el panel (enlace ?order=).
watch(() => [props.orderId, Boolean(order.value)], resetForm, { immediate: true });

// El estado de la orden se elige aquí solo mientras está pendiente (confirmar o cancelar). Ya confirmada,
// cada tramo se completa o cancela por separado y la orden se cierra sola cuando el último tramo se cierra.
const statusOptions = computed(() => {
  const current = order.value?.status;
  if (!current) return [];
  if (current === 'PENDING') return [current, ...STATUS_TRANSITIONS[current]];
  // Confirmada: "Completado" se ve pero queda bloqueado hasta que todos los tramos estén completados.
  return current === 'CONFIRMED' ? [current, 'COMPLETED' as OrderStatus] : [current];
});

/** Un tramo solo se completa con el cobro hecho. */
const isPaid = computed(() => order.value?.paymentStatus === 'PAID');

/** Un tramo se puede cerrar si la orden está confirmada y el tramo sigue abierto. */
function canCloseLeg(index: number): boolean {
  const current = order.value;
  const leg = current?.legs[index];
  return Boolean(current && leg && current.status === 'CONFIRMED' && legDisplayStatus(current, leg) === 'CONFIRMED');
}

const dirty = computed(() => {
  const current = order.value;
  if (!current) return false;
  return (
    form.status !== current.status ||
    form.internalNotes !== (current.internalNotes ?? '') ||
    form.drivers.some((driver, index) => {
      const leg = current.legs[index]!;
      return driver.driverName !== (leg.driverName ?? '') || driver.driverPhone !== (leg.driverPhone ?? '') || driver.closeAs !== '';
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
        ...(driver.closeAs ? { status: driver.closeAs } : {}),
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

// ---- Copiar el número de orden ----
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(copiedTimer));

async function copyCode() {
  const code = order.value?.code;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Sin permiso del portapapeles (p. ej. http): copia con un campo temporal.
    const field = document.createElement('textarea');
    field.value = code;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 2000);
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
    size="xl"
    :open="Boolean(order)"
    :title="order ? `Orden ${order.code}` : ''"
    :subtitle="order ? `Creada ${formatInstant(order.createdAt)} · ${SOURCE_LABEL[order.source]}` : undefined"
    @close="emit('close')"
  >
    <template v-if="order" #title-extra>
      <button
        type="button"
        class="grid size-7 shrink-0 place-items-center rounded-md text-brand-900/60 hover:bg-fog-100 hover:text-brand-950 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        aria-label="Copiar número de orden"
        title="Copiar número de orden"
        @click="copyCode"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      </button>
      <span v-if="copied" role="status" class="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        Número de orden copiado
      </span>
    </template>

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
            :to="{ name: 'payments', query: { order: order.code } }"
            class="ml-auto text-sm font-semibold text-brand-700 underline underline-offset-2"
          >
            Gestionar pago
          </RouterLink>
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
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold text-brand-600">
              {{ order.legs.length > 1 ? (leg.legNumber === 1 ? 'Ida' : 'Regreso') : 'Traslado' }} ·
              {{ formatLocalDateTime(leg.pickupAt) }}
            </p>
            <StatusBadge v-bind="ORDER_STATUS[legDisplayStatus(order, leg)]" />
          </div>
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
          <div v-if="form.drivers[index] && canCloseLeg(index)" class="mt-3">
            <label :for="`leg-status-${order.id}-${leg.legNumber}`" :class="labelClass">Estado del tramo</label>
            <select :id="`leg-status-${order.id}-${leg.legNumber}`" v-model="form.drivers[index].closeAs" :class="inputClass">
              <option value="">{{ ORDER_STATUS.CONFIRMED.label }}</option>
              <option v-for="status in LEG_CLOSE_OPTIONS" :key="status" :value="status" :disabled="status === 'COMPLETED' && !isPaid">
                {{ ORDER_STATUS[status].label }}
              </option>
            </select>
            <p v-if="!isPaid" class="mt-1 text-sm text-brand-900/60">
              No se puede completar hasta que el pago esté cobrado.
            </p>
            <p v-if="form.drivers[index].closeAs === 'CANCELLED'" class="mt-1 text-sm font-medium text-accent-600">
              Solo se cancela este tramo{{ order.legs.length > 1 ? '; el otro sigue su curso' : '' }}. El reembolso, si aplica, se gestiona en Pagos.
            </p>
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
            <option
              v-for="status in statusOptions"
              :key="status"
              :value="status"
              :disabled="status === 'COMPLETED' && order.status === 'CONFIRMED'"
            >
              {{ ORDER_STATUS[status].label }}
            </option>
          </select>
          <p v-if="order.status === 'CONFIRMED'" class="mt-1 text-sm text-brand-900/60">
            No se puede pasar a Completado mientras los tramos no estén completados. Cambia el estado de cada tramo arriba; la orden se cierra sola cuando todos están completados.
          </p>
          <p v-else-if="statusOptions.length <= 1" class="mt-1 text-sm text-brand-900/60">Esta orden ya está cerrada; su estado no se puede cambiar.</p>
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

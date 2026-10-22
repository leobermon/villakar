<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PaymentDetailDrawer from '@/components/payments/PaymentDetailDrawer.vue';
import PaymentLinkDrawer from '@/components/payments/PaymentLinkDrawer.vue';
import RecordPaymentDrawer from '@/components/payments/RecordPaymentDrawer.vue';
import CopyButton from '@/components/ui/CopyButton.vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import TabBar from '@/components/ui/TabBar.vue';
import { useQueryTab } from '@/composables/useQueryTab';
import { LINK_STATUS, PAYMENT_STATUS, PAYMENT_TYPE_LABEL, PROVIDER_LABEL } from '@/config/payments';
import { usePaymentsStore } from '@/stores/payments';
import type { Payment, PaymentLink } from '@/types/payment';
import { formatInstant, formatUsd } from '@/utils/format';

const store = usePaymentsStore();
const route = useRoute();
const router = useRouter();
onMounted(() => store.load());

// La pestaña vive en la URL (?tab=links) para poder compartir o recargar sin perderla.
const { tab, setTab } = useQueryTab(['movements', 'links'] as const);
const tabs = computed(() => [
  { value: 'movements' as const, label: 'Movimientos' },
  { value: 'links' as const, label: 'Links de pago', count: store.summary.activeLinks },
]);

// ---- Resumen ----
function showPending(provider: 'CASH' | 'TRANSFER') {
  store.resetFilters();
  store.filters.provider = provider;
  store.filters.status = 'PENDING';
  setTab('movements');
}

// ---- Movimientos ----
const movementColumns: DataTableColumn<Payment>[] = [
  { key: 'date', label: 'Fecha', sortable: true, sortValue: (payment) => payment.paidAt ?? payment.createdAt },
  { key: 'order', label: 'Orden', sortable: true, sortValue: (payment) => payment.orderCode },
  { key: 'provider', label: 'Medio', sortable: true, sortValue: (payment) => PROVIDER_LABEL[payment.provider], hideBelow: 'md' },
  { key: 'reference', label: 'Referencia / recibió', hideBelow: 'xl' },
  { key: 'amount', label: 'Monto', align: 'right', sortable: true, sortValue: (payment) => (payment.type === 'REFUND' ? -payment.amount : payment.amount) },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (payment) => PAYMENT_STATUS[payment.status].label },
];
const movementSort = ref<DataTableSort | null>({ key: 'date', direction: 'desc' });
const movementPage = ref(1);
const movementPageSize = ref(25);
watch(() => ({ ...store.filters }), () => (movementPage.value = 1), { deep: true });

// ---- Links ----
const linkColumns: DataTableColumn<PaymentLink>[] = [
  // La fecha de creación solo en pantallas muy anchas: para operar importa más cuándo vence.
  { key: 'created', label: 'Creado', sortable: true, sortValue: (link) => link.createdAt, hideBelow: '2xl' },
  { key: 'description', label: 'Concepto', sortable: true, sortValue: (link) => link.description },
  { key: 'customer', label: 'Cliente', sortable: true, sortValue: (link) => link.customerName, hideBelow: 'md' },
  { key: 'amount', label: 'Monto', align: 'right', sortable: true, sortValue: (link) => link.amount },
  { key: 'expires', label: 'Vence', sortable: true, sortValue: (link) => link.expiresAt, hideBelow: 'lg' },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (link) => LINK_STATUS[store.linkStatus(link)].label },
  { key: 'actions', label: 'Acciones', srOnlyLabel: true, align: 'right' },
];
const linkSort = ref<DataTableSort | null>({ key: 'created', direction: 'desc' });
const linkPage = ref(1);

/** Cancelación en dos pasos, en la misma fila (sin ventanas emergentes). */
const confirmingCancel = ref<number | null>(null);
async function cancelLink(id: number) {
  await store.cancelLink(id);
  confirmingCancel.value = null;
}

// ---- Paneles laterales ----
const selectedPaymentId = ref<number | null>(null);
const recordOpen = ref(false);
const linkOpen = ref(false);

// ?linkFor=<id de orden> abre "Nuevo link de pago" con esa orden (desde el detalle de la orden).
const linkPresetOrderId = ref<number | null>(null);
watch(
  () => route.query.linkFor,
  (value) => {
    const id = Number(value);
    if (!value || !Number.isInteger(id)) return;
    linkPresetOrderId.value = id;
    linkOpen.value = true;
    router.replace({ query: { ...route.query, linkFor: undefined } });
  },
  { immediate: true },
);

// ?order=<código> muestra solo los movimientos de esa orden (desde el detalle de la orden).
watch(
  () => route.query.order,
  (value) => {
    if (typeof value !== 'string' || !value) return;
    store.resetFilters();
    store.filters.query = value;
    router.replace({ query: { ...route.query, order: undefined, tab: undefined } });
  },
  { immediate: true },
);

function closeLinkDrawer() {
  linkOpen.value = false;
  linkPresetOrderId.value = null;
}

function openPaymentFromRecord(id: number) {
  recordOpen.value = false;
  selectedPaymentId.value = id;
}

const ids = { search: useId(), provider: useId(), status: useId(), type: useId() };
const fieldClass =
  'h-8 w-full rounded-lg border border-fog-200 bg-white px-2.5 text-xs text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-0.5 block text-[11px] font-semibold text-brand-900/70';
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-3">
    <LoadErrorBanner :message="store.loadError" @retry="store.load(true)" />
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-brand-900/65">Verifica cobros pendientes, registra pagos recibidos y envía links de pago.</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="h-7 rounded-md border border-brand-300 bg-white px-2.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
          @click="recordOpen = true"
        >
          Registrar pago
        </button>
        <button type="button" class="h-7 rounded-md bg-brand-600 px-2.5 text-[11px] font-semibold text-white hover:bg-brand-700" @click="linkOpen = true">
          Nuevo link de pago
        </button>
      </div>
    </div>

    <!-- Resumen: lo que requiere atención primero. -->
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <button
        type="button"
        class="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-left transition hover:border-amber-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        @click="showPending('CASH')"
      >
        <p class="text-[11px] font-semibold text-amber-800">Efectivo por cobrar</p>
        <p class="text-base leading-tight font-bold tabular-nums">{{ formatUsd(store.summary.pendingCash.amount) }}</p>
        <p class="text-[10px] leading-tight text-brand-900/60">{{ store.summary.pendingCash.count }} cobros con choferes · ver lista</p>
      </button>
      <button
        type="button"
        class="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-left transition hover:border-amber-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        @click="showPending('TRANSFER')"
      >
        <p class="text-[11px] font-semibold text-amber-800">Transferencias por verificar</p>
        <p class="text-base leading-tight font-bold tabular-nums">{{ formatUsd(store.summary.pendingTransfers.amount) }}</p>
        <p class="text-[10px] leading-tight text-brand-900/60">{{ store.summary.pendingTransfers.count }} por revisar en el banco · ver lista</p>
      </button>
      <div class="rounded-lg border border-fog-200 bg-white px-2.5 py-1.5">
        <p class="text-[11px] font-semibold text-brand-900/70">Cobrado · últimos 30 días</p>
        <p class="text-base leading-tight font-bold tabular-nums">{{ formatUsd(store.summary.collected30d) }}</p>
        <p class="text-[10px] leading-tight text-brand-900/60">Neto, ya descontados los reembolsos</p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-fog-200 bg-white px-2.5 py-1.5 text-left transition hover:border-brand-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        @click="setTab('links')"
      >
        <p class="text-[11px] font-semibold text-brand-900/70">Links de pago activos</p>
        <p class="text-base leading-tight font-bold tabular-nums">{{ store.summary.activeLinks }}</p>
        <p class="text-[10px] leading-tight text-brand-900/60">Esperando que el cliente pague · ver links</p>
      </button>
    </div>

    <TabBar :model-value="tab" :tabs="tabs" label="Secciones de pagos" @update:model-value="setTab" />

    <!-- Movimientos -->
    <section v-if="tab === 'movements'" id="panel-movements" role="tabpanel" aria-labelledby="tab-movements" class="space-y-2.5">
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div class="sm:col-span-2 lg:col-span-5">
          <label :for="ids.search" :class="labelClass">Buscar</label>
          <input :id="ids.search" v-model="store.filters.query" type="search" placeholder="Orden, cliente, referencia o quién recibió" :class="fieldClass" />
        </div>
        <div class="lg:col-span-3">
          <label :for="ids.provider" :class="labelClass">Medio</label>
          <select :id="ids.provider" v-model="store.filters.provider" :class="fieldClass">
            <option value="ALL">Todos</option>
            <option v-for="(label, value) in PROVIDER_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div class="lg:col-span-2">
          <label :for="ids.status" :class="labelClass">Estado</label>
          <select :id="ids.status" v-model="store.filters.status" :class="fieldClass">
            <option value="ALL">Todos</option>
            <option v-for="(meta, value) in PAYMENT_STATUS" :key="value" :value="value">{{ meta.label }}</option>
          </select>
        </div>
        <div class="lg:col-span-2">
          <label :for="ids.type" :class="labelClass">Tipo</label>
          <select :id="ids.type" v-model="store.filters.type" :class="fieldClass">
            <option value="ALL">Todos</option>
            <option v-for="(label, value) in PAYMENT_TYPE_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
      </div>
      <button
        v-if="store.hasActiveFilters"
        type="button"
        class="text-xs font-semibold text-brand-700 underline underline-offset-2"
        @click="store.resetFilters()"
      >
        Quitar filtros
      </button>

      <DataTable
        v-model:sort="movementSort"
        v-model:page="movementPage"
        v-model:page-size="movementPageSize"
        :columns="movementColumns"
        :rows="store.filtered"
        :row-key="(payment) => payment.id"
        :loading="store.loading"
        caption="Movimientos de pago"
        compact
        row-clickable
        :row-label="(payment) => `Abrir pago de ${payment.orderCode} por ${formatUsd(payment.amount)}`"
        empty-title="No hay movimientos con estos filtros"
        @row-click="(payment) => (selectedPaymentId = payment.id)"
      >
        <template #cell-date="{ row }">
          <span class="whitespace-nowrap">{{ formatInstant(row.paidAt ?? row.createdAt) }}</span>
        </template>
        <template #cell-order="{ row }">
          <p class="font-bold text-brand-950">{{ row.orderCode }}</p>
          <p class="max-w-48 truncate text-xs text-brand-900/55">{{ row.customerName }}</p>
        </template>
        <template #cell-provider="{ row }">
          <p class="text-brand-950">{{ PROVIDER_LABEL[row.provider] }}</p>
          <p class="text-xs text-brand-900/55">{{ PAYMENT_TYPE_LABEL[row.type] }}</p>
        </template>
        <template #cell-reference="{ row }">
          <p class="max-w-52 truncate text-xs text-brand-900/70">{{ row.reference ?? '—' }}</p>
          <p v-if="row.receivedBy" class="text-xs text-brand-900/55">{{ row.receivedBy }}</p>
        </template>
        <template #cell-amount="{ row }">
          <span class="font-semibold whitespace-nowrap tabular-nums" :class="row.type === 'REFUND' ? 'text-accent-600' : ''">
            {{ row.type === 'REFUND' ? '−' : '' }}{{ formatUsd(row.amount) }}
          </span>
        </template>
        <template #cell-status="{ row }">
          <StatusBadge v-bind="PAYMENT_STATUS[row.status]" />
        </template>
      </DataTable>
    </section>

    <!-- Links de pago -->
    <section v-else id="panel-links" role="tabpanel" aria-labelledby="tab-links">
      <DataTable
        v-model:sort="linkSort"
        v-model:page="linkPage"
        :columns="linkColumns"
        :rows="store.links"
        :row-key="(link) => link.id"
        :loading="store.loading"
        caption="Links de pago"
        compact
        empty-title="Todavía no hay links de pago"
        empty-text="Crea uno con el botón Nuevo link de pago."
      >
        <template #cell-created="{ row }">
          <span class="whitespace-nowrap">{{ formatInstant(row.createdAt) }}</span>
        </template>
        <template #cell-description="{ row }">
          <p class="max-w-64 truncate font-medium text-brand-950">{{ row.description }}</p>
          <p class="text-xs text-brand-900/55">{{ row.orderCode ?? 'Cobro libre' }}</p>
        </template>
        <template #cell-customer="{ row }">
          <p class="text-brand-950">{{ row.customerName }}</p>
          <p class="max-w-48 truncate text-xs text-brand-900/55">{{ row.customerEmail ?? row.customerPhone ?? '' }}</p>
        </template>
        <template #cell-amount="{ row }">
          <span class="font-semibold whitespace-nowrap tabular-nums">{{ formatUsd(row.amount) }}</span>
        </template>
        <template #cell-expires="{ row }">
          <span class="whitespace-nowrap">{{ formatInstant(row.expiresAt) }}</span>
        </template>
        <template #cell-status="{ row }">
          <StatusBadge v-bind="LINK_STATUS[store.linkStatus(row)]" />
        </template>
        <template #cell-actions="{ row }">
          <div v-if="store.linkStatus(row) === 'ACTIVE'" class="flex justify-end gap-2">
            <template v-if="confirmingCancel === row.id">
              <span class="self-center text-xs text-brand-900/70">¿Cancelar link?</span>
              <button type="button" class="h-8 rounded-lg bg-accent-600 px-2.5 text-xs font-semibold text-white" @click="cancelLink(row.id)">
                Sí, cancelar
              </button>
              <button type="button" class="h-8 rounded-lg px-2.5 text-xs font-semibold text-brand-900 hover:bg-fog-100" @click="confirmingCancel = null">
                No
              </button>
            </template>
            <template v-else>
              <CopyButton :text="row.url" size="sm" label="Copiar link" />
              <button
                type="button"
                class="h-8 rounded-lg px-2.5 text-xs font-semibold text-accent-600 hover:bg-accent-50"
                :aria-label="`Cancelar link de ${row.customerName}`"
                @click="confirmingCancel = row.id"
              >
                Cancelar
              </button>
            </template>
          </div>
          <span v-else-if="row.paidAt" class="text-xs text-brand-900/60">Pagado {{ formatInstant(row.paidAt) }}</span>
        </template>
      </DataTable>
    </section>

    <PaymentDetailDrawer :payment-id="selectedPaymentId" @close="selectedPaymentId = null" />
    <RecordPaymentDrawer :open="recordOpen" @close="recordOpen = false" @open-payment="openPaymentFromRecord" />
    <PaymentLinkDrawer :open="linkOpen" :preset-order-id="linkPresetOrderId" @close="closeLinkDrawer" />
  </div>
</template>

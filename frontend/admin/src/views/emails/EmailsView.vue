<script setup lang="ts">
import { onMounted, reactive, ref, useId, watch } from 'vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { EMAIL_KIND_LABEL, EMAIL_STATUS } from '@/config/messages';
import { useMessagesStore } from '@/stores/messages';
import type { EmailLog } from '@/types/messages';
import { formatInstant } from '@/utils/format';

const store = useMessagesStore();
onMounted(() => store.loadEmails());

const columns: DataTableColumn<EmailLog>[] = [
  { key: 'date', label: 'Fecha', sortable: true, sortValue: (email) => email.createdAt },
  { key: 'to', label: 'Destinatario', sortable: true, sortValue: (email) => email.toEmail },
  { key: 'subject', label: 'Correo', hideBelow: 'xl' },
  { key: 'order', label: 'Orden', sortable: true, sortValue: (email) => email.reservationCode, hideBelow: 'md' },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (email) => EMAIL_STATUS[email.status].label },
  { key: 'actions', label: 'Acciones', srOnlyLabel: true, align: 'right' },
];
const sort = ref<DataTableSort | null>({ key: 'date', direction: 'desc' });
const page = ref(1);
const pageSize = ref(10);
watch(() => ({ ...store.emailFilters }), () => (page.value = 1), { deep: true });

/** Reenvío fila por fila: qué orden se está enviando y cómo salió el último intento. */
const resending = ref<number | null>(null);
const results = reactive<Record<number, { ok: boolean; text: string }>>({});

async function resend(email: EmailLog) {
  if (email.reservationId === null || resending.value !== null) return;
  resending.value = email.id;
  try {
    const outcome = await store.resendConfirmation(email.reservationId);
    results[email.id] = outcome.sent
      ? { ok: true, text: `Reenviado a ${email.toEmail}.` }
      : { ok: false, text: outcome.error ?? 'No se pudo enviar.' };
  } catch (e) {
    results[email.id] = { ok: false, text: e instanceof Error ? e.message : 'No se pudo enviar.' };
  } finally {
    resending.value = null;
  }
}

const ids = { search: useId(), status: useId() };
const fieldClass =
  'h-10 w-full rounded-lg border border-fog-200 bg-white px-3 text-sm text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <LoadErrorBanner :message="store.emailsError" @retry="store.loadEmails(true)" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="max-w-2xl text-sm text-brand-900/65">
        Correos que envía el sistema a los clientes. Si alguien dice que no le llegó su confirmación, revisa aquí si salió y reenvíala.
      </p>
      <button
        type="button"
        class="h-10 rounded-lg border border-brand-300 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        @click="store.loadEmails(true)"
      >
        Actualizar
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-fog-200 bg-white p-4">
        <p class="text-xs font-semibold text-brand-900/70">Correos registrados</p>
        <p class="mt-1 text-2xl font-bold tabular-nums">{{ store.emails.length }}</p>
      </div>
      <div class="rounded-xl border border-fog-200 bg-white p-4">
        <p class="text-xs font-semibold text-brand-900/70">Enviados</p>
        <p class="mt-1 text-2xl font-bold tabular-nums">{{ store.emails.length - store.failedEmails }}</p>
      </div>
      <button
        type="button"
        class="rounded-xl border bg-white p-4 text-left transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        :class="store.failedEmails ? 'border-accent-500/40' : 'border-fog-200'"
        @click="store.emailFilters.status = 'FAILED'"
      >
        <p class="text-xs font-semibold" :class="store.failedEmails ? 'text-accent-600' : 'text-brand-900/70'">Fallaron</p>
        <p class="mt-1 text-2xl font-bold tabular-nums">{{ store.failedEmails }}</p>
        <p class="text-xs text-brand-900/60">{{ store.failedEmails ? 'Ver cuáles' : 'Todo salió bien' }}</p>
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div class="sm:col-span-2 lg:col-span-8">
        <label :for="ids.search" :class="labelClass">Buscar</label>
        <input :id="ids.search" v-model="store.emailFilters.query" type="search" placeholder="Correo, cliente, código de orden o asunto" :class="fieldClass" />
      </div>
      <div class="lg:col-span-4">
        <label :for="ids.status" :class="labelClass">Estado</label>
        <select :id="ids.status" v-model="store.emailFilters.status" :class="fieldClass">
          <option value="ALL">Todos</option>
          <option v-for="(meta, value) in EMAIL_STATUS" :key="value" :value="value">{{ meta.label }}</option>
        </select>
      </div>
    </div>

    <DataTable
      v-model:sort="sort"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="store.filteredEmails"
      :row-key="(email) => email.id"
      :loading="store.emailsLoading"
      caption="Correos enviados por el sistema"
      empty-title="Todavía no hay correos registrados"
      empty-text="Aparecerán aquí cuando el sistema envíe confirmaciones de reserva."
    >
      <template #cell-date="{ row }">
        <span class="whitespace-nowrap">{{ formatInstant(row.createdAt) }}</span>
      </template>
      <template #cell-to="{ row }">
        <p class="max-w-52 truncate font-medium text-brand-950">{{ row.toEmail }}</p>
        <p v-if="row.customerName" class="max-w-52 truncate text-xs text-brand-900/55">{{ row.customerName }}</p>
      </template>
      <template #cell-subject="{ row }">
        <p class="text-brand-950">{{ EMAIL_KIND_LABEL[row.kind] }}</p>
        <p class="max-w-64 truncate text-xs text-brand-900/55">{{ row.subject }}</p>
      </template>
      <template #cell-order="{ row }">
        <RouterLink
          v-if="row.reservationId !== null"
          :to="{ name: 'orders', query: { order: row.reservationId } }"
          class="font-bold text-brand-700 underline underline-offset-2"
        >
          {{ row.reservationCode }}
        </RouterLink>
        <span v-else class="text-brand-900/50">—</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge v-bind="EMAIL_STATUS[row.status]" />
        <p v-if="row.error" class="mt-1 max-w-56 truncate text-xs text-accent-600" :title="row.error">{{ row.error }}</p>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex flex-col items-end gap-1">
          <button
            v-if="row.reservationId !== null"
            type="button"
            class="h-8 rounded-lg border border-brand-300 bg-white px-3 text-xs font-semibold whitespace-nowrap text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            :disabled="resending !== null"
            :aria-label="`Reenviar confirmación a ${row.toEmail}`"
            @click="resend(row)"
          >
            {{ resending === row.id ? 'Enviando…' : 'Reenviar' }}
          </button>
          <p
            v-if="results[row.id]"
            role="status"
            class="max-w-40 text-right text-xs leading-tight"
            :class="results[row.id]!.ok ? 'text-emerald-700' : 'text-accent-600'"
          >
            {{ results[row.id]!.text }}
          </p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

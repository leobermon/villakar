<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue';
import ContactDetailDrawer from '@/components/contacts/ContactDetailDrawer.vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { CONTACT_STATUS } from '@/config/messages';
import { useMessagesStore } from '@/stores/messages';
import type { ContactRequest } from '@/types/messages';
import { formatInstant, formatLocalDate } from '@/utils/format';

const store = useMessagesStore();
onMounted(() => store.loadContacts());

const columns: DataTableColumn<ContactRequest>[] = [
  { key: 'date', label: 'Recibida', sortable: true, sortValue: (contact) => contact.createdAt },
  { key: 'name', label: 'Cliente', sortable: true, sortValue: (contact) => contact.name },
  { key: 'hotel', label: 'Hotel o lugar', sortable: true, sortValue: (contact) => contact.hotelName, hideBelow: 'md' },
  { key: 'trip', label: 'Llegada', hideBelow: 'lg' },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (contact) => CONTACT_STATUS[contact.status].label },
];
const sort = ref<DataTableSort | null>({ key: 'date', direction: 'desc' });
const page = ref(1);
const pageSize = ref(10);
watch(() => ({ ...store.contactFilters }), () => (page.value = 1), { deep: true });

const selectedId = ref<number | null>(null);

const ids = { search: useId(), status: useId() };
const fieldClass =
  'h-10 w-full rounded-lg border border-fog-200 bg-white px-3 text-sm text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-6">
    <LoadErrorBanner :message="store.contactsError" @retry="store.loadContacts(true)" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="min-w-0 text-xs text-brand-900/65 sm:truncate">
        Solicitudes del formulario "Contact us" del sitio. Responde desde tu correo o WhatsApp y marca el avance aquí.
      </p>
      <button
        type="button"
        class="h-10 rounded-lg border border-brand-300 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        @click="store.loadContacts(true)"
      >
        Actualizar
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        :class="store.newContacts ? 'border-amber-300' : 'border-fog-200'"
        :title="store.newContacts ? 'Ver solicitudes nuevas' : 'Nada pendiente'"
        @click="store.contactFilters.status = 'NEW'"
      >
        <span class="text-xs font-semibold" :class="store.newContacts ? 'text-amber-800' : 'text-brand-900/70'">Por atender</span>
        <span class="text-lg leading-none font-bold tabular-nums">{{ store.newContacts }}</span>
      </button>
      <div class="flex items-center gap-2 rounded-lg border border-fog-200 bg-white px-3 py-1.5">
        <span class="text-xs font-semibold text-brand-900/70">Atendidas</span>
        <span class="text-lg leading-none font-bold tabular-nums">{{ store.contacts.filter((contact) => contact.status === 'CONTACTED').length }}</span>
      </div>
      <div class="flex items-center gap-2 rounded-lg border border-fog-200 bg-white px-3 py-1.5">
        <span class="text-xs font-semibold text-brand-900/70">Total recibidas</span>
        <span class="text-lg leading-none font-bold tabular-nums">{{ store.contacts.length }}</span>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div class="sm:col-span-2 lg:col-span-8">
        <label :for="ids.search" :class="labelClass">Buscar</label>
        <input :id="ids.search" v-model="store.contactFilters.query" type="search" placeholder="Nombre, correo, teléfono, hotel o mensaje" :class="fieldClass" />
      </div>
      <div class="lg:col-span-4">
        <label :for="ids.status" :class="labelClass">Estado</label>
        <select :id="ids.status" v-model="store.contactFilters.status" :class="fieldClass">
          <option value="ALL">Todos</option>
          <option v-for="(meta, value) in CONTACT_STATUS" :key="value" :value="value">{{ meta.label }}</option>
        </select>
      </div>
    </div>

    <DataTable
      v-model:sort="sort"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="store.filteredContacts"
      :row-key="(contact) => contact.id"
      :loading="store.contactsLoading"
      caption="Solicitudes del formulario de contacto"
      row-clickable
      :row-label="(contact) => `Abrir solicitud de ${contact.name}`"
      empty-title="No hay solicitudes con estos filtros"
      empty-text="Las solicitudes del formulario Contact us del sitio aparecerán aquí."
      @row-click="(contact) => (selectedId = contact.id)"
    >
      <template #cell-date="{ row }">
        <span class="whitespace-nowrap">{{ formatInstant(row.createdAt) }}</span>
      </template>
      <template #cell-name="{ row }">
        <p class="max-w-56 truncate font-medium text-brand-950">{{ row.name }}</p>
        <p class="max-w-56 truncate text-xs text-brand-900/55">{{ row.email }}</p>
      </template>
      <template #cell-hotel="{ row }">
        <p class="max-w-64 truncate text-brand-950">{{ row.hotelName }}</p>
      </template>
      <template #cell-trip="{ row }">
        <p v-if="row.arrivalDate" class="whitespace-nowrap text-brand-950">{{ formatLocalDate(row.arrivalDate) }}</p>
        <p v-if="row.passengers" class="text-xs text-brand-900/55">{{ row.passengers }} pasajeros</p>
        <span v-if="!row.arrivalDate && !row.passengers" class="text-brand-900/50">—</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge v-bind="CONTACT_STATUS[row.status]" />
      </template>
    </DataTable>

    <ContactDetailDrawer :contact-id="selectedId" @close="selectedId = null" />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { ORDER_STATUS, ORDER_STATUS_ORDER, PAYMENT_METHOD_LABEL } from '@/config/orders';
import { useOrdersStore } from '@/stores/orders';
import { openNativePicker } from '@/utils/picker';

const store = useOrdersStore();
const filters = store.filters;
const ids = { search: useId(), payment: useId(), method: useId(), from: useId(), to: useId() };

const STATUS_TABS = [{ value: 'ALL' as const, label: 'Todas' }, ...ORDER_STATUS_ORDER.map((value) => ({ value, label: ORDER_STATUS[value].label }))];

const fieldClass =
  'h-8 w-full rounded-lg border border-fog-200 bg-white px-2.5 text-xs text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-0.5 block text-[11px] font-semibold text-brand-900/70';
</script>

<template>
  <div class="space-y-2.5">
    <!-- Pestañas por estado: el número es cuántas órdenes hay con los demás filtros aplicados. -->
    <div class="-mx-1 overflow-x-auto px-1 pb-1">
      <div class="flex gap-1" role="group" aria-label="Filtrar por estado">
        <button
          v-for="tab in STATUS_TABS"
          :key="tab.value"
          type="button"
          :aria-pressed="filters.status === tab.value"
          class="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
          :class="
            filters.status === tab.value
              ? 'bg-brand-600 text-white'
              : 'bg-white text-brand-900/75 ring-1 ring-fog-200 hover:text-brand-950 hover:ring-brand-200'
          "
          @click="filters.status = tab.value"
        >
          {{ tab.label }}
          <span
            class="rounded px-1 text-[11px] tabular-nums"
            :class="filters.status === tab.value ? 'bg-white/20' : 'bg-fog-100 text-brand-900/60'"
          >
            {{ store.countsByStatus[tab.value] ?? 0 }}
          </span>
        </button>
      </div>
    </div>

    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div class="sm:col-span-2 lg:col-span-4">
        <label :for="ids.search" :class="labelClass">Buscar</label>
        <div class="relative">
          <svg viewBox="0 0 24 24" class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-brand-900/40" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>
          <input
            :id="ids.search"
            v-model="filters.query"
            type="search"
            placeholder="Código, cliente, email, hotel o vuelo"
            :class="[fieldClass, 'pl-8']"
          />
        </div>
      </div>

      <div class="lg:col-span-2">
        <label :for="ids.payment" :class="labelClass">Pago</label>
        <select :id="ids.payment" v-model="filters.payment" :class="fieldClass">
          <option value="ALL">Todos</option>
          <option value="PAID">Pagado</option>
          <option value="UNPAID">Sin pagar / por cobrar</option>
          <option value="REFUNDED">Reembolsado</option>
        </select>
      </div>

      <div class="lg:col-span-2">
        <label :for="ids.method" :class="labelClass">Método</label>
        <select :id="ids.method" v-model="filters.method" :class="fieldClass">
          <option value="ALL">Todos</option>
          <option v-for="(label, value) in PAYMENT_METHOD_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>

      <div class="lg:col-span-2">
        <label :for="ids.from" :class="labelClass">Recogida desde</label>
        <input :id="ids.from" v-model="filters.from" type="date" :max="filters.to || undefined" :class="[fieldClass, 'cursor-pointer']" @click="openNativePicker" />
      </div>

      <div class="lg:col-span-2">
        <label :for="ids.to" :class="labelClass">Hasta</label>
        <input :id="ids.to" v-model="filters.to" type="date" :min="filters.from || undefined" :class="[fieldClass, 'cursor-pointer']" @click="openNativePicker" />
      </div>
    </div>

    <button
      v-if="store.hasActiveFilters"
      type="button"
      class="text-xs font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
      @click="store.resetFilters()"
    >
      Quitar filtros
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import type { Order } from '@/types/order';
import { formatLocalDate } from '@/utils/format';

/**
 * Buscador de órdenes (combobox). El padre decide qué órdenes se pueden elegir
 * (p. ej. solo las que tienen saldo) y qué dato extra mostrar en cada opción.
 */
const props = defineProps<{
  label: string;
  orders: Order[];
  /** Texto a la derecha de cada opción (p. ej. el saldo). */
  hint?: (order: Order) => string;
  error?: string | null;
}>();

const model = defineModel<number | null>({ required: true });

const inputId = useId();
const listId = `${inputId}-list`;
const query = ref('');
const open = ref(false);
const activeIndex = ref(-1);

const selected = computed(() => props.orders.find((order) => order.id === model.value) ?? null);

const MAX_OPTIONS = 8;
const options = computed(() => {
  const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
  return props.orders
    .filter((order) => {
      if (!words.length) return true;
      const haystack = normalize(`${order.code} ${order.customer.firstName} ${order.customer.lastName} ${order.customer.email}`);
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, MAX_OPTIONS);
});

function choose(order: Order) {
  model.value = order.id;
  query.value = '';
  open.value = false;
  activeIndex.value = -1;
}

function clear() {
  model.value = null;
  open.value = true;
}

function onKeydown(event: KeyboardEvent) {
  const count = options.value.length;
  if (event.key === 'ArrowDown' && count) {
    event.preventDefault();
    open.value = true;
    activeIndex.value = (activeIndex.value + 1) % count;
  } else if (event.key === 'ArrowUp' && count) {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + count) % count;
  } else if (event.key === 'Enter' && open.value && activeIndex.value >= 0) {
    event.preventDefault();
    choose(options.value[activeIndex.value]!);
  } else if (event.key === 'Escape' && open.value) {
    // No cierra el panel lateral: solo la lista.
    event.stopPropagation();
    open.value = false;
  }
}

function onBlur() {
  setTimeout(() => (open.value = false), 150);
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
</script>

<template>
  <div class="relative">
    <label :for="inputId" class="mb-1 block text-xs font-semibold text-brand-900/70">{{ props.label }}</label>

    <!-- Orden elegida -->
    <div v-if="selected" class="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
      <div class="min-w-0 text-sm">
        <p class="font-bold text-brand-950">{{ selected.code }}</p>
        <p class="truncate text-xs text-brand-900/65">
          {{ selected.customer.firstName }} {{ selected.customer.lastName }}
          <template v-if="selected.legs[0]"> · {{ formatLocalDate(selected.legs[0].pickupAt) }}</template>
        </p>
      </div>
      <button type="button" class="shrink-0 text-xs font-semibold text-brand-700 underline underline-offset-2" @click="clear">
        Cambiar
      </button>
    </div>

    <template v-else>
      <input
        :id="inputId"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined"
        :aria-invalid="Boolean(props.error)"
        placeholder="Código o nombre del cliente"
        class="h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-4"
        :class="props.error ? 'border-accent-500 focus:ring-accent-500/20' : 'border-fog-200 focus:border-brand-400 focus:ring-brand-300/25'"
        @focus="open = true"
        @input="(open = true), (activeIndex = -1)"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <ul
        v-if="open"
        :id="listId"
        role="listbox"
        class="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-fog-200 bg-white py-1 shadow-lg"
      >
        <li v-if="!options.length" class="px-3 py-2.5 text-sm text-brand-900/60">No hay órdenes que coincidan.</li>
        <li
          v-for="(order, index) in options"
          :id="`${listId}-${index}`"
          :key="order.id"
          role="option"
          :aria-selected="index === activeIndex"
          class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2"
          :class="index === activeIndex ? 'bg-brand-50' : 'hover:bg-fog-50'"
          @mousedown.prevent="choose(order)"
        >
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-brand-950">{{ order.code }}</span>
            <span class="block truncate text-xs text-brand-900/60">{{ order.customer.firstName }} {{ order.customer.lastName }}</span>
          </span>
          <span v-if="props.hint" class="shrink-0 text-xs font-semibold text-brand-800">{{ props.hint(order) }}</span>
        </li>
      </ul>
    </template>
    <p v-if="props.error" class="mt-1 text-xs font-medium text-accent-600">{{ props.error }}</p>
  </div>
</template>

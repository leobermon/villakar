<script setup lang="ts">
import 'flag-icons/css/flag-icons.min.css';
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { FEATURED_COUNTRIES, OTHER_COUNTRIES, countryOption, flagClass, type CountryCode, type CountryOption } from '@/utils/phone';

/**
 * Selector de clave de país con banderas (imágenes SVG: los emojis de bandera
 * no se ven en Windows). Botón con bandera y clave; al abrirlo, buscador y
 * lista navegable con teclado (patrón combobox + listbox).
 */
const model = defineModel<CountryCode>({ required: true });

const open = ref(false);
const query = ref('');
const activeIndex = ref(0);
const root = ref<HTMLElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const listId = useId();

const selected = computed(() => countryOption(model.value));

/** Sin búsqueda: los destacados primero y luego el resto. Con búsqueda: por nombre, clave o código. */
const options = computed<CountryOption[]>(() => {
  const all = [...FEATURED_COUNTRIES, ...OTHER_COUNTRIES];
  const text = normalize(query.value.trim());
  if (!text) return all;
  const digits = text.replace(/\D/g, '');
  return all.filter(
    (country) =>
      normalize(country.name).includes(text) ||
      country.code.toLowerCase() === text ||
      (digits !== '' && country.dialCode.slice(1).startsWith(digits)),
  );
});

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function toggle() {
  if (open.value) return close();
  open.value = true;
  query.value = '';
  activeIndex.value = Math.max(0, options.value.findIndex((country) => country.code === model.value));
  await nextTick();
  search.value?.focus();
  scrollActiveIntoView();
}

function close(refocus = false) {
  open.value = false;
  if (refocus) root.value?.querySelector<HTMLButtonElement>('button')?.focus();
}

function choose(country: CountryOption) {
  model.value = country.code;
  close(true);
}

function onKeydown(event: KeyboardEvent) {
  const count = options.value.length;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (count === 0) return;
    activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
    scrollActiveIntoView();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const country = options.value[activeIndex.value];
    if (country) choose(country);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close(true);
  } else if (event.key === 'Tab') {
    close();
  }
}

function scrollActiveIntoView() {
  void nextTick(() => list.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }));
}

watch(query, () => (activeIndex.value = 0));

// Cierra al hacer clic fuera.
function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close();
}
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onPointerDown);
  else document.removeEventListener('pointerdown', onPointerDown);
});
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown));
</script>

<template>
  <div ref="root" class="relative shrink-0">
    <button
      type="button"
      class="flex h-11 items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30"
      :aria-label="`Country code: ${selected.name} ${selected.dialCode}`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
    >
      <span :class="[flagClass(selected.code), 'rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]']" aria-hidden="true" />
      <span class="font-medium text-brand-950">{{ selected.dialCode }}</span>
      <svg viewBox="0 0 12 12" class="size-3 text-brand-700 transition" :class="open ? 'rotate-180' : ''" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute top-full left-0 z-30 mt-1.5 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-brand-100 bg-white shadow-lg"
    >
      <div class="border-b border-brand-100 p-2">
        <input
          ref="search"
          v-model="query"
          type="search"
          role="combobox"
          aria-label="Search country"
          aria-autocomplete="list"
          :aria-controls="listId"
          aria-expanded="true"
          :aria-activedescendant="options[activeIndex] ? `${listId}-${options[activeIndex]!.code}` : undefined"
          placeholder="Search country or code"
          autocomplete="off"
          class="h-9 w-full rounded-lg border border-brand-100 px-2.5 text-sm outline-none focus:border-brand-400"
          @keydown="onKeydown"
        />
      </div>
      <ul :id="listId" ref="list" role="listbox" aria-label="Countries" class="max-h-64 overflow-y-auto py-1">
        <li
          v-for="(country, index) in options"
          :id="`${listId}-${country.code}`"
          :key="country.code"
          role="option"
          :aria-selected="country.code === model"
          :data-active="index === activeIndex"
          class="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm"
          :class="[
            index === activeIndex ? 'bg-brand-50' : '',
            !query && index === FEATURED_COUNTRIES.length ? 'border-t border-brand-100' : '',
          ]"
          @pointerenter="activeIndex = index"
          @click="choose(country)"
        >
          <span :class="[flagClass(country.code), 'shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]']" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate text-brand-950" :class="country.code === model ? 'font-semibold' : ''">{{ country.name }}</span>
          <span class="shrink-0 text-brand-900/60">{{ country.dialCode }}</span>
        </li>
        <li v-if="options.length === 0" class="px-3 py-3 text-sm text-brand-900/60">No countries found.</li>
      </ul>
    </div>
  </div>
</template>

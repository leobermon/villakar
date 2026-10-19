<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { fetchPlaceSuggestions, type PlaceSuggestion } from '@/api/booking';
import type { SelectedPlace } from '@/stores/booking';
import { randomUuid } from '@/utils/uuid';

const props = defineProps<{
  label: string;
  placeholder?: string;
  error?: string | null;
}>();

const model = defineModel<SelectedPlace | null>({ required: true });

const emit = defineEmits<{
  /** "Can't find your hotel?": el sitio abre "Contact us" con lo que se escribió. */
  notListed: [query: string];
}>();

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

const inputId = useId();
const listId = `${inputId}-list`;

const query = ref(model.value?.mainText ?? '');
const suggestions = ref<PlaceSuggestion[]>([]);
const open = ref(false);
const loading = ref(false);
const searchError = ref<string | null>(null);
const activeIndex = ref(-1);

// Un token por sesión de búsqueda: se renueva después de elegir un lugar.
let sessionToken = randomUuid();
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let inFlight: AbortController | undefined;

const showPanel = computed(() => open.value && query.value.trim().length >= MIN_CHARS);

watch(model, (place) => {
  if (!place) return;
  query.value = place.mainText;
});

function onInput() {
  // Si el usuario edita el texto, la selección anterior deja de ser válida.
  if (model.value) model.value = null;
  open.value = true;
  activeIndex.value = -1;
  clearTimeout(debounceTimer);

  const text = query.value.trim();
  if (text.length < MIN_CHARS) {
    suggestions.value = [];
    return;
  }
  debounceTimer = setTimeout(() => search(text), DEBOUNCE_MS);
}

async function search(text: string) {
  inFlight?.abort();
  inFlight = new AbortController();
  loading.value = true;
  searchError.value = null;
  try {
    suggestions.value = await fetchPlaceSuggestions(text, sessionToken, inFlight.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    suggestions.value = [];
    searchError.value = 'Search is not available right now.';
  } finally {
    loading.value = false;
  }
}

function choose(suggestion: PlaceSuggestion) {
  model.value = { ...suggestion, sessionToken };
  sessionToken = randomUuid();
  open.value = false;
  suggestions.value = [];
}

function onKeydown(event: KeyboardEvent) {
  if (!showPanel.value) return;
  const count = suggestions.value.length;
  if (event.key === 'ArrowDown' && count) {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % count;
  } else if (event.key === 'ArrowUp' && count) {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + count) % count;
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault();
    choose(suggestions.value[activeIndex.value]!);
  } else if (event.key === 'Escape') {
    open.value = false;
  }
}

const inputRef = ref<HTMLInputElement | null>(null);

/** Botón X: borra lo escrito y el hotel elegido, y deja el cursor listo para escribir otro. */
function clear() {
  clearTimeout(debounceTimer);
  inFlight?.abort();
  query.value = '';
  model.value = null;
  suggestions.value = [];
  activeIndex.value = -1;
  searchError.value = null;
  inputRef.value?.focus();
}

function onBlur() {
  // Espera un momento para que el clic en una sugerencia se registre.
  setTimeout(() => (open.value = false), 150);
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
  inFlight?.abort();
});
</script>

<template>
  <div class="relative">
    <label :for="inputId" class="mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase">
      {{ props.label }}
    </label>
    <div class="relative">
      <svg
        class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-brand-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      <input
        :id="inputId"
        ref="inputRef"
        v-model="query"
        type="text"
        autocomplete="off"
        role="combobox"
        :aria-expanded="showPanel"
        :aria-controls="listId"
        :aria-activedescendant="activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined"
        :aria-invalid="Boolean(props.error)"
        :placeholder="props.placeholder ?? 'Search your hotel, condo or rental'"
        class="h-12 w-full rounded-xl border bg-white pl-11 text-[15px] shadow-sm transition outline-none placeholder:text-brand-900/40 focus:ring-4"
        :class="[
          props.error
            ? 'border-accent-500 focus:ring-accent-400/25'
            : 'border-brand-100 focus:border-brand-400 focus:ring-brand-300/30',
          query ? 'pr-11' : 'pr-3',
        ]"
        @input="onInput"
        @focus="open = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <!-- mousedown.prevent: el input no pierde el foco, así no se cierra/abre el panel de golpe. -->
      <button
        v-if="query"
        type="button"
        class="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-brand-900/50 transition hover:bg-brand-50 hover:text-brand-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
        :aria-label="`Clear ${props.label.toLowerCase()}`"
        @mousedown.prevent
        @click="clear"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
    <p v-if="props.error" class="mt-1 text-xs font-medium text-accent-600">{{ props.error }}</p>

    <div
      v-if="showPanel"
      class="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-brand-100 bg-white shadow-xl shadow-brand-900/10"
    >
      <ul :id="listId" role="listbox" class="max-h-72 overflow-y-auto py-1">
        <li v-if="loading && !suggestions.length" class="px-4 py-3 text-sm text-brand-900/60">Searching…</li>
        <li v-else-if="searchError" class="px-4 py-3 text-sm text-accent-600">{{ searchError }}</li>
        <li v-else-if="!suggestions.length" class="px-4 py-3 text-sm text-brand-900/60">No places found. Try the name of your hotel, condo or rental.</li>
        <li
          v-for="(suggestion, index) in suggestions"
          :id="`${listId}-${index}`"
          :key="suggestion.googlePlaceId"
          role="option"
          :aria-selected="index === activeIndex"
          class="cursor-pointer px-4 py-2.5"
          :class="index === activeIndex ? 'bg-brand-50' : 'hover:bg-brand-50/60'"
          @mousedown.prevent="choose(suggestion)"
        >
          <p class="text-sm font-semibold text-brand-950">{{ suggestion.mainText }}</p>
          <p v-if="suggestion.secondaryText" class="truncate text-xs text-brand-900/60">
            {{ suggestion.secondaryText }}
          </p>
        </li>
      </ul>
      <button
        type="button"
        class="flex w-full items-center justify-between border-t border-brand-100 bg-mist-50 px-4 py-3 text-left text-sm"
        @mousedown.prevent="emit('notListed', query.trim())"
      >
        <span class="text-brand-900/70">Can't find your hotel?</span>
        <span class="font-semibold text-accent-600">Contact us →</span>
      </button>
    </div>
  </div>
</template>

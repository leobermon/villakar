<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { useTable } from '@/composables/useTable';
import { readCell, type DataTableColumn, type DataTableSort } from './dataTable';

/**
 * Tabla base del panel: orden por columna, paginación, estado de carga, estado
 * vacío y filas clicables. Cada celda se puede personalizar con el slot
 * `cell-<key>` (recibe `row`); sin slot muestra el valor de la columna.
 */
const props = withDefaults(
  defineProps<{
    columns: DataTableColumn<T>[];
    rows: T[];
    /** Identificador único de cada fila. */
    rowKey: (row: T) => string | number;
    /** Descripción de la tabla para lectores de pantalla. */
    caption: string;
    loading?: boolean;
    /** Si es true, las filas se pueden abrir con clic o Enter (emite row-click). */
    rowClickable?: boolean;
    /** Etiqueta accesible de cada fila clicable. */
    rowLabel?: (row: T) => string;
    pageSizes?: number[];
    emptyTitle?: string;
    emptyText?: string;
  }>(),
  {
    loading: false,
    rowClickable: false,
    rowLabel: undefined,
    pageSizes: () => [10, 25, 50],
    emptyTitle: 'Sin resultados',
    emptyText: 'No hay registros que coincidan.',
  },
);

const emit = defineEmits<{ rowClick: [row: T] }>();

const page = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 10 });
const sort = defineModel<DataTableSort | null>('sort', { default: null });

const { pageRows, pageCount, range, toggleSort } = useTable<T>({
  rows: () => props.rows,
  columns: () => props.columns,
  sort,
  page,
  pageSize,
});

const HIDE_BELOW: Record<NonNullable<DataTableColumn<T>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

function columnClass(column: DataTableColumn<T>): string {
  return [ALIGN[column.align ?? 'left'], column.hideBelow ? HIDE_BELOW[column.hideBelow] : '', column.class ?? ''].join(' ');
}

function ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.sortable) return undefined;
  if (sort.value?.key !== column.key) return 'none';
  return sort.value.direction === 'asc' ? 'ascending' : 'descending';
}

function display(column: DataTableColumn<T>, row: T): string {
  const value = readCell(column, row);
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function onRowKeydown(event: KeyboardEvent, row: T) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('rowClick', row);
  }
}

const skeletonRows = computed(() => Math.min(pageSize.value, 8));
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-fog-200 bg-white">
    <div class="overflow-x-auto">
      <table class="w-full min-w-max text-sm">
        <caption class="sr-only">{{ props.caption }}</caption>
        <thead class="border-b border-fog-200 bg-fog-50 text-xs font-semibold text-brand-900/70">
          <tr>
            <th
              v-for="column in props.columns"
              :key="column.key"
              scope="col"
              class="px-4 py-3 whitespace-nowrap"
              :class="columnClass(column)"
              :aria-sort="ariaSort(column)"
            >
              <span v-if="column.srOnlyLabel" class="sr-only">{{ column.label }}</span>
              <button
                v-else-if="column.sortable"
                type="button"
                class="inline-flex items-center gap-1 rounded hover:text-brand-950 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                :class="column.align === 'right' ? 'flex-row-reverse' : ''"
                @click="toggleSort(column.key)"
              >
                {{ column.label }}
                <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true">
                  <path
                    d="M6 2 9 5H3l3-3Z"
                    :class="sort?.key === column.key && sort.direction === 'asc' ? 'fill-brand-600' : 'fill-current opacity-30'"
                  />
                  <path
                    d="M6 10 3 7h6l-3 3Z"
                    :class="sort?.key === column.key && sort.direction === 'desc' ? 'fill-brand-600' : 'fill-current opacity-30'"
                  />
                </svg>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
          </tr>
        </thead>

        <!-- Cargando: filas grises del mismo alto para que la tabla no brinque. -->
        <tbody v-if="props.loading" aria-busy="true">
          <tr v-for="n in skeletonRows" :key="n" class="border-b border-fog-100 last:border-0">
            <td v-for="column in props.columns" :key="column.key" class="px-4 py-3.5" :class="columnClass(column)">
              <span class="block h-4 animate-pulse rounded bg-fog-100 motion-reduce:animate-none" />
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="pageRows.length">
          <tr
            v-for="row in pageRows"
            :key="props.rowKey(row)"
            class="border-b border-fog-100 last:border-0"
            :class="
              props.rowClickable
                ? 'cursor-pointer transition hover:bg-brand-50/60 focus-visible:bg-brand-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400'
                : ''
            "
            :tabindex="props.rowClickable ? 0 : undefined"
            :aria-label="props.rowClickable && props.rowLabel ? props.rowLabel(row) : undefined"
            @click="props.rowClickable && emit('rowClick', row)"
            @keydown="props.rowClickable && onRowKeydown($event, row)"
          >
            <td v-for="column in props.columns" :key="column.key" class="px-4 py-3 align-middle" :class="columnClass(column)">
              <slot :name="`cell-${column.key}`" :row="row">{{ display(column, row) }}</slot>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!props.loading && !pageRows.length" class="px-6 py-14 text-center">
        <slot name="empty">
          <p class="font-semibold text-brand-950">{{ props.emptyTitle }}</p>
          <p class="mt-1 text-sm text-brand-900/60">{{ props.emptyText }}</p>
        </slot>
      </div>
    </div>

    <footer
      v-if="!props.loading && range.total > 0"
      class="flex flex-col gap-3 border-t border-fog-200 px-4 py-3 text-sm text-brand-900/70 sm:flex-row sm:items-center sm:justify-between"
    >
      <p aria-live="polite">Mostrando {{ range.from }}–{{ range.to }} de {{ range.total }}</p>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2">
          <span>Filas</span>
          <select
            v-model.number="pageSize"
            class="h-8 rounded-lg border border-fog-200 bg-white px-2 text-sm text-brand-950"
            @change="page = 1"
          >
            <option v-for="size in props.pageSizes" :key="size" :value="size">{{ size }}</option>
          </select>
        </label>
        <nav class="flex items-center gap-1" aria-label="Paginación">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg border border-fog-200 hover:bg-fog-50 disabled:opacity-40"
            :disabled="page <= 1"
            aria-label="Página anterior"
            @click="page--"
          >
            ‹
          </button>
          <span class="min-w-16 text-center">{{ page }} / {{ pageCount }}</span>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg border border-fog-200 hover:bg-fog-50 disabled:opacity-40"
            :disabled="page >= pageCount"
            aria-label="Página siguiente"
            @click="page++"
          >
            ›
          </button>
        </nav>
      </div>
    </footer>
  </div>
</template>

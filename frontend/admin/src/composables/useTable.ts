import { computed, watch, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { readCell, type DataTableColumn, type DataTableSort } from '@/components/ui/dataTable';

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/**
 * Orden y paginación del lado del cliente para DataTable. Cuando un módulo
 * tenga miles de filas, la misma interfaz (sort + page) se puede mandar al API.
 */
export function useTable<T>(options: {
  rows: MaybeRefOrGetter<T[]>;
  columns: MaybeRefOrGetter<DataTableColumn<T>[]>;
  sort: Ref<DataTableSort | null>;
  page: Ref<number>;
  pageSize: Ref<number>;
}) {
  const { sort, page, pageSize } = options;

  const sorted = computed(() => {
    const rows = toValue(options.rows);
    const current = sort.value;
    const column = current && toValue(options.columns).find((candidate) => candidate.key === current.key);
    if (!current || !column) return rows;

    const valueOf = (row: T) => (column.sortValue ? column.sortValue(row) : readCell(column, row));
    const factor = current.direction === 'asc' ? 1 : -1;
    // Copia: no se reordena el arreglo original del store.
    return [...rows].sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);
      // Vacíos siempre al final, sin importar la dirección.
      if (left == null || left === '') return right == null || right === '' ? 0 : 1;
      if (right == null || right === '') return -1;
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
      return collator.compare(String(left), String(right)) * factor;
    });
  });

  const total = computed(() => sorted.value.length);
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

  // Si al filtrar quedan menos páginas, se ajusta a la última que existe.
  watch(pageCount, (count) => {
    if (page.value > count) page.value = count;
  });

  const pageRows = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return sorted.value.slice(start, start + pageSize.value);
  });

  const range = computed(() => ({
    from: total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1,
    to: Math.min(page.value * pageSize.value, total.value),
    total: total.value,
  }));

  /** Clic en un encabezado: ascendente → descendente → sin orden. */
  function toggleSort(key: string) {
    if (sort.value?.key !== key) sort.value = { key, direction: 'asc' };
    else if (sort.value.direction === 'asc') sort.value = { key, direction: 'desc' };
    else sort.value = null;
    page.value = 1;
  }

  return { pageRows, pageCount, range, toggleSort };
}

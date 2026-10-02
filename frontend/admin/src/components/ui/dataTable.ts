export type SortDirection = 'asc' | 'desc';
export type CellValue = string | number | boolean | null | undefined;

export interface DataTableColumn<T> {
  /** Identificador de la columna; también nombra el slot `cell-<key>`. */
  key: string;
  label: string;
  /** Valor mostrado si no hay slot (por defecto, row[key]). */
  value?: (row: T) => CellValue;
  sortable?: boolean;
  /** Valor para ordenar (por defecto, `value`). */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  /** Oculta la columna por debajo de ese ancho de pantalla. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Encabezado solo para lectores de pantalla (p. ej. columna de acciones). */
  srOnlyLabel?: boolean;
  class?: string;
}

export interface DataTableSort {
  key: string;
  direction: SortDirection;
}

/** Lee el valor de una columna: `value` si lo define, si no la propiedad `key` de la fila. */
export function readCell<T>(column: DataTableColumn<T>, row: T): CellValue {
  if (column.value) return column.value(row);
  return (row as Record<string, unknown>)[column.key] as CellValue;
}

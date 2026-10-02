import { computed, ref, type Ref, watch } from 'vue';
import { SettingsError } from '@/stores/settings';

/**
 * Copia editable de una sección de configuración: cambios sin guardar,
 * descartar, guardar y error por campo. `source` es lo guardado.
 */
export function useSectionForm<T extends object>(source: () => T | undefined, persist: (values: T) => Promise<void>) {
  const form = ref(clone(source())) as Ref<T | null>;
  const saving = ref(false);
  const saved = ref(false);
  const error = ref<{ field: string; message: string } | null>(null);

  // Si lo guardado cambia (carga inicial o guardado), la copia se reinicia.
  watch(source, (value) => (form.value = clone(value)), { deep: true });

  const dirty = computed(() => form.value !== null && JSON.stringify(form.value) !== JSON.stringify(source() ?? null));

  watch(form, () => {
    if (dirty.value) saved.value = false;
  }, { deep: true });

  function reset() {
    form.value = clone(source());
    error.value = null;
  }

  async function save() {
    if (!form.value || !dirty.value) return;
    saving.value = true;
    error.value = null;
    try {
      await persist(clone(form.value)!);
      saved.value = true;
    } catch (e) {
      error.value = e instanceof SettingsError ? { field: e.field, message: e.message } : { field: 'form', message: 'No se pudo guardar.' };
    } finally {
      saving.value = false;
    }
  }

  /** Mensaje de error si pertenece a ese campo. */
  function errorFor(field: string): string | null {
    return error.value?.field === field ? error.value.message : null;
  }

  return { form, dirty, saving, saved, error, reset, save, errorFor };
}

// JSON en vez de structuredClone: los valores llegan como objetos reactivos (Proxy).
function clone<T>(value: T | undefined): T | null {
  return value === undefined ? null : (JSON.parse(JSON.stringify(value)) as T);
}

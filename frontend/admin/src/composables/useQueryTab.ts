import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Pestaña guardada en la URL (?tab=…): se conserva al recargar o compartir el
 * enlace. La primera pestaña es la predeterminada y no aparece en la URL.
 */
export function useQueryTab<T extends string>(tabs: readonly T[]) {
  const route = useRoute();
  const router = useRouter();
  const [defaultTab] = tabs;

  const tab = computed<T>(() => {
    const value = route.query.tab;
    return typeof value === 'string' && (tabs as readonly string[]).includes(value) ? (value as T) : defaultTab!;
  });

  function setTab(value: T) {
    router.replace({ query: { ...route.query, tab: value === defaultTab ? undefined : value } });
  }

  return { tab, setTab };
}

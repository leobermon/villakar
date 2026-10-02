import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { Order, OrderStatus, OrderUpdate, PaymentMethod } from '@/types/order';

export interface OrderFilters {
  /** Busca en código, nombre, email, teléfono y lugares. */
  query: string;
  status: OrderStatus | 'ALL';
  /** 'UNPAID' incluye efectivo por cobrar. */
  payment: 'ALL' | 'PAID' | 'UNPAID' | 'REFUNDED';
  method: Exclude<PaymentMethod, null> | 'ALL';
  /** Rango de la primera recogida, 'YYYY-MM-DD'. */
  from: string;
  to: string;
}

const EMPTY_FILTERS: OrderFilters = { query: '', status: 'ALL', payment: 'ALL', method: 'ALL', from: '', to: '' };

/**
 * Órdenes del panel (reservas de la base de datos, /api/admin/orders). Los
 * filtros se aplican aquí sobre la lista completa.
 */
export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);
  // Los filtros viven en el store: se conservan al cambiar de módulo y volver.
  const filters = reactive<OrderFilters>({ ...EMPTY_FILTERS });

  /** Carga desde la base. `force` vuelve a leer (botón Reintentar, datos nuevos). */
  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      orders.value = await api<Order[]>('/admin/orders');
      loaded.value = true;
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : 'No se pudieron cargar las órdenes.';
    } finally {
      loading.value = false;
    }
  }

  function find(id: number): Order | undefined {
    return orders.value.find((order) => order.id === id);
  }

  /** Guarda estado, notas y choferes. El backend valida los cambios de estado. */
  async function update(id: number, changes: OrderUpdate): Promise<void> {
    replace(await api<Order>(`/admin/orders/${id}`, { method: 'PATCH', json: changes }));
  }

  /** Pone la versión del backend (p. ej. tras registrar un pago, con su estado de pago recalculado). */
  function replace(order: Order) {
    const index = orders.value.findIndex((candidate) => candidate.id === order.id);
    if (index >= 0) orders.value.splice(index, 1, order);
    else orders.value.unshift(order);
  }

  function resetFilters() {
    Object.assign(filters, EMPTY_FILTERS);
  }

  const hasActiveFilters = computed(() =>
    (Object.keys(EMPTY_FILTERS) as Array<keyof OrderFilters>).some((key) => filters[key] !== EMPTY_FILTERS[key]),
  );

  /** Todas las órdenes filtradas salvo por estado (para contar por pestaña). */
  const matchingExceptStatus = computed(() => orders.value.filter((order) => matches(order, filters, false)));

  const filtered = computed(() =>
    filters.status === 'ALL'
      ? matchingExceptStatus.value
      : matchingExceptStatus.value.filter((order) => order.status === filters.status),
  );

  const countsByStatus = computed(() => {
    const counts: Partial<Record<OrderStatus | 'ALL', number>> = { ALL: matchingExceptStatus.value.length };
    for (const order of matchingExceptStatus.value) counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  });

  return {
    orders,
    loading,
    loadError,
    filters,
    filtered,
    countsByStatus,
    hasActiveFilters,
    load,
    find,
    update,
    replace,
    resetFilters,
  };
});

function matches(order: Order, filters: OrderFilters, checkStatus: boolean): boolean {
  if (checkStatus && filters.status !== 'ALL' && order.status !== filters.status) return false;

  if (filters.payment === 'PAID' && order.paymentStatus !== 'PAID') return false;
  if (filters.payment === 'UNPAID' && order.paymentStatus !== 'UNPAID') return false;
  if (filters.payment === 'REFUNDED' && !['REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)) return false;
  if (filters.method !== 'ALL' && order.paymentMethod !== filters.method) return false;

  const firstPickup = order.legs[0]?.pickupAt.slice(0, 10) ?? '';
  if (filters.from && firstPickup < filters.from) return false;
  if (filters.to && firstPickup > filters.to) return false;

  const query = normalize(filters.query.trim());
  if (!query) return true;
  const haystack = normalize(
    [
      order.code,
      order.customer.firstName,
      order.customer.lastName,
      order.customer.email,
      order.customer.phone,
      ...order.legs.flatMap((leg) => [leg.originName, leg.destinationName, leg.flightNumber ?? '']),
    ].join(' '),
  );
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

/** Minúsculas y sin acentos: "garcia" encuentra "García". */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

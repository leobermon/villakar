import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import { legDisplayStatus } from '@/config/orders';
import type { Order, OrderLeg, OrderStatus, OrderUpdate, PaymentMethod } from '@/types/order';

export interface OrderFilters {
  /** Busca en código, nombre, email, teléfono y lugares. */
  query: string;
  status: OrderStatus | 'ALL';
  /** 'UNPAID' incluye efectivo por cobrar. */
  payment: 'ALL' | 'PAID' | 'UNPAID' | 'REFUNDED';
  method: Exclude<PaymentMethod, null> | 'ALL';
  /** Rango de recogida de cada servicio, 'YYYY-MM-DD'. */
  from: string;
  to: string;
}

/** Una fila de la lista: cada tramo de una orden (ida, regreso) es un servicio aparte. */
export interface OrderRow {
  key: string;
  order: Order;
  leg: OrderLeg;
  /** Estado del tramo (ver legDisplayStatus). */
  status: OrderStatus;
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

  /** Un servicio por tramo, con todos los filtros salvo el de estado (para contar por pestaña). */
  const rowsExceptStatus = computed<OrderRow[]>(() =>
    orders.value
      .filter((order) => matches(order, filters))
      .flatMap((order) =>
        order.legs
          .filter((leg) => inDateRange(leg, filters))
          .map((leg) => ({ key: `${order.id}-${leg.legNumber}`, order, leg, status: legDisplayStatus(order, leg) })),
      ),
  );

  const rows = computed(() =>
    filters.status === 'ALL' ? rowsExceptStatus.value : rowsExceptStatus.value.filter((row) => row.status === filters.status),
  );

  /** Órdenes (sin repetir) que tienen algún servicio en la lista; es lo que se exporta a Excel. */
  const filtered = computed(() => {
    const seen = new Set<number>();
    return rows.value.flatMap((row) => (seen.has(row.order.id) ? [] : (seen.add(row.order.id), [row.order])));
  });

  const countsByStatus = computed(() => {
    const counts: Partial<Record<OrderStatus | 'ALL', number>> = { ALL: rowsExceptStatus.value.length };
    for (const row of rowsExceptStatus.value) counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  });

  return {
    orders,
    loading,
    loadError,
    filters,
    rows,
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

/** Rango de fechas de recogida: se aplica a cada tramo, no solo al primero. */
function inDateRange(leg: OrderLeg, filters: OrderFilters): boolean {
  const day = leg.pickupAt.slice(0, 10);
  if (filters.from && day < filters.from) return false;
  if (filters.to && day > filters.to) return false;
  return true;
}

function matches(order: Order, filters: OrderFilters): boolean {
  if (filters.payment === 'PAID' && order.paymentStatus !== 'PAID') return false;
  if (filters.payment === 'UNPAID' && order.paymentStatus !== 'UNPAID') return false;
  if (filters.payment === 'REFUNDED' && !['REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)) return false;
  if (filters.method !== 'ALL' && order.paymentMethod !== filters.method) return false;

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

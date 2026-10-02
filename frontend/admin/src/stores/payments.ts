import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { Order } from '@/types/order';
import type {
  NewManualPayment,
  NewPaymentLink,
  Payment,
  PaymentLink,
  PaymentLinkStatus,
  PaymentProvider,
  PaymentRecordStatus,
  PaymentType,
} from '@/types/payment';
import { useOrdersStore } from './orders';

export interface PaymentFilters {
  query: string;
  provider: PaymentProvider | 'ALL';
  status: PaymentRecordStatus | 'ALL';
  type: PaymentType | 'ALL';
}

const EMPTY_FILTERS: PaymentFilters = { query: '', provider: 'ALL', status: 'ALL', type: 'ALL' };
const DAY_MS = 86_400_000;

/** Respuesta del backend tras un movimiento: la orden recalculada y todos sus pagos. */
interface PaymentChange {
  order: Order;
  payments: Payment[];
}

/**
 * Pagos y links de pago guardados en la base (/api/admin/payments). Tras cada
 * movimiento el backend recalcula el estado de pago de la orden y aquí se
 * reemplazan la orden y sus pagos, para que Órdenes y Pagos cuadren.
 */
export const usePaymentsStore = defineStore('payments', () => {
  const orders = useOrdersStore();

  const payments = ref<Payment[]>([]);
  const links = ref<PaymentLink[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);
  const filters = reactive<PaymentFilters>({ ...EMPTY_FILTERS });

  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      const [data] = await Promise.all([
        api<{ payments: Payment[]; links: PaymentLink[] }>('/admin/payments'),
        orders.load(force),
      ]);
      payments.value = data.payments;
      links.value = data.links;
      loaded.value = true;
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los pagos.';
    } finally {
      loading.value = false;
    }
  }

  // ---- Saldos ----

  /** Cobrado neto de una orden: cobros exitosos menos reembolsos exitosos. */
  function paidAmount(orderId: number): number {
    return payments.value
      .filter((payment) => payment.orderId === orderId && payment.status === 'SUCCEEDED')
      .reduce((sum, payment) => sum + (payment.type === 'REFUND' ? -payment.amount : payment.amount), 0);
  }

  /** Lo que falta cobrar de una orden (nunca negativo). */
  function balanceOf(orderId: number): number {
    const order = orders.find(orderId);
    if (!order) return 0;
    return Math.max(0, round(order.total - paidAmount(orderId)));
  }

  function pendingFor(orderId: number): Payment[] {
    return payments.value.filter((payment) => payment.orderId === orderId && payment.status === 'PENDING');
  }

  /** Aplica la respuesta del backend: la orden y sus pagos, tal como quedaron guardados. */
  function applyChange(change: PaymentChange) {
    orders.replace(change.order);
    payments.value = [...change.payments, ...payments.value.filter((payment) => payment.orderId !== change.order.id)].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id,
    );
  }

  // ---- Acciones sobre pagos ----

  /** Confirma un cobro pendiente (efectivo entregado por el chofer, transferencia vista en el banco). */
  async function verify(id: number, data: { receivedBy: string | null; reference: string | null; note: string | null }) {
    applyChange(await api<PaymentChange>(`/admin/payments/${id}/verify`, { method: 'POST', json: data }));
  }

  /** Marca un cobro pendiente como no recibido (p. ej. la transferencia nunca llegó). */
  async function reject(id: number, reason: string) {
    applyChange(await api<PaymentChange>(`/admin/payments/${id}/reject`, { method: 'POST', json: { reason } }));
  }

  /** Alta manual de un cobro ya recibido (efectivo o transferencia). */
  async function recordManual(data: NewManualPayment): Promise<Payment> {
    const change = await api<PaymentChange & { payment: Payment }>('/admin/payments', { method: 'POST', json: data });
    applyChange(change);
    return change.payment;
  }

  // ---- Links de pago ----

  function linkStatus(link: PaymentLink): PaymentLinkStatus {
    if (link.status === 'ACTIVE' && new Date(link.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
    return link.status;
  }

  async function createLink(data: NewPaymentLink): Promise<PaymentLink> {
    const link = await api<PaymentLink>('/admin/payment-links', { method: 'POST', json: data });
    links.value.unshift(link);
    return link;
  }

  async function cancelLink(id: number) {
    const updated = await api<PaymentLink>(`/admin/payment-links/${id}/cancel`, { method: 'POST' });
    const index = links.value.findIndex((link) => link.id === id);
    if (index >= 0) links.value.splice(index, 1, updated);
  }

  // ---- Listas y resúmenes ----

  const filtered = computed(() => {
    const query = normalize(filters.query.trim());
    return payments.value.filter((payment) => {
      if (filters.provider !== 'ALL' && payment.provider !== filters.provider) return false;
      if (filters.status !== 'ALL' && payment.status !== filters.status) return false;
      if (filters.type !== 'ALL' && payment.type !== filters.type) return false;
      if (!query) return true;
      const haystack = normalize([payment.orderCode, payment.customerName, payment.reference ?? '', payment.receivedBy ?? ''].join(' '));
      return query.split(/\s+/).every((word) => haystack.includes(word));
    });
  });

  const hasActiveFilters = computed(() =>
    (Object.keys(EMPTY_FILTERS) as Array<keyof PaymentFilters>).some((key) => filters[key] !== EMPTY_FILTERS[key]),
  );

  function resetFilters() {
    Object.assign(filters, EMPTY_FILTERS);
  }

  const summary = computed(() => {
    const pending = payments.value.filter((payment) => payment.status === 'PENDING');
    const sum = (list: Payment[]) => round(list.reduce((total, payment) => total + payment.amount, 0));
    const pendingCash = pending.filter((payment) => payment.provider === 'CASH');
    const pendingTransfers = pending.filter((payment) => payment.provider === 'TRANSFER');
    const since = Date.now() - 30 * DAY_MS;
    const recent = payments.value.filter(
      (payment) => payment.status === 'SUCCEEDED' && payment.paidAt && new Date(payment.paidAt).getTime() >= since,
    );
    return {
      pendingCash: { count: pendingCash.length, amount: sum(pendingCash) },
      pendingTransfers: { count: pendingTransfers.length, amount: sum(pendingTransfers) },
      collected30d: round(
        recent.reduce((total, payment) => total + (payment.type === 'REFUND' ? -payment.amount : payment.amount), 0),
      ),
      activeLinks: links.value.filter((link) => linkStatus(link) === 'ACTIVE').length,
    };
  });

  return {
    payments,
    links,
    loading,
    loadError,
    filters,
    filtered,
    hasActiveFilters,
    summary,
    load,
    balanceOf,
    paidAmount,
    pendingFor,
    verify,
    reject,
    recordManual,
    linkStatus,
    createLink,
    cancelLink,
    resetFilters,
  };
});


/** Redondeo a centavos para evitar errores de punto flotante en sumas de dinero. */
function round(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

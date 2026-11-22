import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { CouponUpdate, ManagedCoupon, NewCoupon } from '@/types/coupon';

/** Cupones de descuento (/api/admin/coupons). */
export const useCouponsStore = defineStore('coupons', () => {
  const coupons = ref<ManagedCoupon[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);

  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      coupons.value = await api<ManagedCoupon[]>('/admin/coupons');
      loaded.value = true;
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los cupones.';
    } finally {
      loading.value = false;
    }
  }

  async function create(data: NewCoupon): Promise<ManagedCoupon> {
    const created = await api<ManagedCoupon>('/admin/coupons', { method: 'POST', json: data });
    coupons.value = [created, ...coupons.value];
    return created;
  }

  async function update(id: number, changes: CouponUpdate): Promise<ManagedCoupon> {
    const updated = await api<ManagedCoupon>(`/admin/coupons/${id}`, { method: 'PATCH', json: changes });
    coupons.value = coupons.value.map((coupon) => (coupon.id === id ? updated : coupon));
    return updated;
  }

  function find(id: number): ManagedCoupon | undefined {
    return coupons.value.find((coupon) => coupon.id === id);
  }

  return { coupons, loading, loadError, load, create, update, find };
});

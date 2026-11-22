<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import CouponDrawer from '@/components/coupons/CouponDrawer.vue';
import DataTable from '@/components/ui/DataTable.vue';
import type { DataTableColumn, DataTableSort } from '@/components/ui/dataTable';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { COUPON_STATE_LABEL, COUPON_STATE_TONE, couponState } from '@/config/coupons';
import { useCouponsStore } from '@/stores/coupons';
import type { ManagedCoupon } from '@/types/coupon';
import { formatLocalDateTime, formatUsd } from '@/utils/format';

const store = useCouponsStore();
onMounted(() => store.load());

const columns: DataTableColumn<ManagedCoupon>[] = [
  { key: 'code', label: 'Cupón', sortable: true, sortValue: (coupon) => coupon.code },
  { key: 'discount', label: 'Descuento', sortable: true, sortValue: (coupon) => coupon.discountOneWay },
  { key: 'validity', label: 'Vigencia', sortable: true, sortValue: (coupon) => coupon.validTo, hideBelow: 'md' },
  { key: 'uses', label: 'Usos', sortable: true, sortValue: (coupon) => coupon.uses },
  { key: 'status', label: 'Estado', sortable: true, sortValue: (coupon) => couponState(coupon) },
];
const sort = ref<DataTableSort | null>({ key: 'validity', direction: 'desc' });
const page = ref(1);

/** Panel lateral: 'new' = alta; un número = editar ese cupón. */
const drawer = ref<'new' | number | null>(null);

const activeCount = computed(() => store.coupons.filter((coupon) => couponState(coupon) === 'active').length);
const totalUses = computed(() => store.coupons.reduce((sum, coupon) => sum + coupon.uses, 0));
</script>

<template>
  <div class="mx-auto max-w-[110rem] space-y-3">
    <LoadErrorBanner :message="store.loadError" @retry="store.load(true)" />

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-xs text-brand-900/65">
        Códigos de descuento para el sitio de reservas. Descuentan un monto fijo en USD del total y cada correo puede usar un cupón una sola vez.
      </p>
      <button
        type="button"
        class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 sm:self-auto"
        @click="drawer = 'new'"
      >
        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nuevo cupón
      </button>
    </div>

    <div class="grid gap-2 sm:grid-cols-3">
      <div class="rounded-lg border border-fog-200 bg-white px-3 py-2">
        <p class="text-[11px] font-semibold text-brand-900/70">Cupones</p>
        <p class="text-lg leading-tight font-bold tabular-nums">{{ store.coupons.length }}</p>
      </div>
      <div class="rounded-lg border border-fog-200 bg-white px-3 py-2">
        <p class="text-[11px] font-semibold text-brand-900/70">Vigentes</p>
        <p class="text-lg leading-tight font-bold tabular-nums">{{ activeCount }}</p>
      </div>
      <div class="rounded-lg border border-fog-200 bg-white px-3 py-2">
        <p class="text-[11px] font-semibold text-brand-900/70">Usos totales</p>
        <p class="text-lg leading-tight font-bold tabular-nums">{{ totalUses }}</p>
      </div>
    </div>

    <DataTable
      v-model:sort="sort"
      v-model:page="page"
      :columns="columns"
      :rows="store.coupons"
      :row-key="(coupon) => coupon.id"
      :loading="store.loading"
      caption="Cupones de descuento"
      compact
      row-clickable
      :row-label="(coupon) => `Editar el cupón ${coupon.code}`"
      empty-title="Todavía no hay cupones"
      empty-text="Crea el primero con el botón Nuevo cupón."
      @row-click="(coupon) => (drawer = coupon.id)"
    >
      <template #cell-code="{ row }">
        <p class="font-mono font-semibold text-brand-950">{{ row.code }}</p>
        <p v-if="row.description" class="max-w-64 truncate text-xs text-brand-900/55">{{ row.description }}</p>
      </template>
      <template #cell-discount="{ row }">
        <p class="whitespace-nowrap">One way <span class="font-medium">−{{ formatUsd(row.discountOneWay) }}</span></p>
        <p class="whitespace-nowrap text-xs text-brand-900/65">Round trip −{{ formatUsd(row.discountRoundTrip) }}</p>
      </template>
      <template #cell-validity="{ row }">
        <p class="whitespace-nowrap">{{ formatLocalDateTime(row.validFrom) }}</p>
        <p class="whitespace-nowrap text-xs text-brand-900/65">hasta {{ formatLocalDateTime(row.validTo) }}</p>
      </template>
      <template #cell-uses="{ row }">
        <span class="tabular-nums">{{ row.uses }}<span v-if="row.maxUses !== null" class="text-brand-900/55"> / {{ row.maxUses }}</span></span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="COUPON_STATE_LABEL[couponState(row)]" :tone="COUPON_STATE_TONE[couponState(row)]" />
      </template>
    </DataTable>

    <CouponDrawer :target="drawer" @close="drawer = null" />
  </div>
</template>

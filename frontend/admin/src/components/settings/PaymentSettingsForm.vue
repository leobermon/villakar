<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useSectionForm } from '@/composables/useSectionForm';
import { useSettingsStore } from '@/stores/settings';
import type { PaymentSettings, ProviderStatus } from '@/types/settings';
import SectionActions from './SectionActions.vue';

const store = useSettingsStore();
const { form, dirty, saving, saved, reset, save, errorFor } = useSectionForm(
  () => store.settings?.payments,
  (values) => store.save('payments', values),
);
defineExpose({ dirty });

interface MethodRow {
  key: keyof PaymentSettings;
  title: string;
  text: string;
  /** null = no depende de un proveedor externo (efectivo). */
  provider: ProviderStatus | null;
  providerName?: string;
}

const methods = computed<MethodRow[]>(() => [
  { key: 'cardEnabled', title: 'Tarjeta', text: 'Visa, Mastercard y Amex en la página segura de Stripe.', provider: store.providers.stripe, providerName: 'Stripe' },
  { key: 'paypalEnabled', title: 'PayPal', text: 'El cliente paga con su cuenta de PayPal.', provider: store.providers.paypal, providerName: 'PayPal' },
  { key: 'cashEnabled', title: 'Efectivo', text: 'El cliente paga al chofer al terminar el servicio; la reserva se confirma sin cobro en línea.', provider: null },
]);

function providerBadge(provider: ProviderStatus) {
  if (!provider.connected) return { label: 'Sin conectar', tone: 'neutral' as const };
  return provider.mode === 'live' ? { label: 'Conectado · cobros reales', tone: 'success' as const } : { label: 'Conectado · modo prueba', tone: 'warning' as const };
}

/** Lo que verá el cliente con la configuración actual del formulario. */
const visibleToCustomer = computed(() =>
  methods.value.filter((method) => form.value?.[method.key] && (method.provider === null || method.provider.connected)).map((method) => method.title),
);
</script>

<template>
  <form v-if="form" class="space-y-5" novalidate @submit.prevent="save">
    <p class="text-sm text-brand-900/65">Qué formas de pago se ofrecen al reservar en el sitio.</p>

    <ul class="divide-y divide-fog-100 rounded-xl border border-fog-200">
      <li v-for="method in methods" :key="method.key" class="flex items-start justify-between gap-4 p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-semibold">{{ method.title }}</p>
            <StatusBadge v-if="method.provider" v-bind="providerBadge(method.provider)" />
          </div>
          <p class="mt-0.5 text-sm text-brand-900/65">{{ method.text }}</p>
          <p v-if="method.provider && !method.provider.connected" class="mt-1 text-xs text-brand-900/55">
            Para conectarlo hay que poner las claves de {{ method.providerName }} en el servidor (backend/.env). Por seguridad no se capturan aquí.
          </p>
        </div>
        <ToggleSwitch v-model="form[method.key]" :label="`Ofrecer ${method.title}`" />
      </li>
    </ul>

    <p class="rounded-lg bg-fog-50 px-3 py-2.5 text-sm">
      <span class="text-brand-900/65">Hoy el cliente verá:</span>{{ ' ' }}
      <strong v-if="visibleToCustomer.length">{{ visibleToCustomer.join(', ') }}</strong>
      <strong v-else class="text-accent-600">ningún método — nadie podría reservar en línea</strong>
    </p>

    <SectionActions
      :dirty="dirty"
      :saving="saving"
      :saved="saved"
      :message="errorFor('payments') ?? errorFor('form')"
      @save="save"
      @reset="reset"
    />
  </form>
</template>

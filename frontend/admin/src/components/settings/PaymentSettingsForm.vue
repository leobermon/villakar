<script setup lang="ts">
import { computed } from 'vue';
import FormField from '@/components/ui/FormField.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useSectionForm } from '@/composables/useSectionForm';
import { useSettingsStore } from '@/stores/settings';
import { inputClass } from '@/utils/formStyles';
import type { ProviderStatus } from '@/types/settings';
import SectionActions from './SectionActions.vue';

const store = useSettingsStore();
const { form, dirty, saving, saved, reset, save, errorFor } = useSectionForm(
  () => store.settings?.payments,
  (values) => store.save('payments', values),
);
defineExpose({ dirty });

interface MethodRow {
  key: 'cardEnabled' | 'paypalEnabled' | 'cashEnabled';
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

/** Campo de texto del tipo de cambio: vacío = sin cobro en pesos (null). */
const rate = computed({
  get: () => (form.value?.usdToMxnRate ?? '') as number | string,
  set: (value) => {
    if (!form.value) return;
    const text = String(value).trim();
    form.value.usdToMxnRate = text === '' ? null : Number(text);
  },
});

/** Ejemplo en vivo de lo que cobraría Stripe en pesos. */
const rateExample = computed(() => {
  const value = form.value?.usdToMxnRate;
  if (!value) return 'Vacío: la tarjeta solo se cobra en dólares.';
  return `Una reserva de USD 100 se cobraría como ${new Intl.NumberFormat('es-MX').format(Math.ceil(100 * value))} MXN en Stripe (se redondea hacia arriba al peso).`;
});

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

    <div class="rounded-xl border border-fog-200 p-4">
      <p class="font-semibold">Tarjeta en pesos mexicanos</p>
      <p class="mt-0.5 text-sm text-brand-900/65">
        Los precios del sitio son en dólares. Si capturas un tipo de cambio, el cliente podrá elegir pagar con tarjeta en pesos (útil si su
        tarjeta no acepta dólares). El pago se registra en dólares, igual que los demás.
      </p>
      <div class="mt-3 max-w-sm">
        <FormField v-slot="{ id, describedBy }" label="Pesos por 1 dólar (USD → MXN)" :error="errorFor('usdToMxnRate')" :hint="rateExample" optional>
          <input :id="id" v-model="rate" type="number" min="1" max="100" step="0.01" placeholder="Ej. 18.50" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('usdToMxnRate')))" />
        </FormField>
      </div>
      <p class="mt-2 text-xs text-brand-900/55">Actualízalo de vez en cuando para que el cobro siga cerca del tipo de cambio real. Incluye en él un pequeño margen para cubrir variaciones y comisiones.</p>
    </div>

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

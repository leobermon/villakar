<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import BookingSettingsForm from '@/components/settings/BookingSettingsForm.vue';
import CompanySettingsForm from '@/components/settings/CompanySettingsForm.vue';
import NotificationSettingsForm from '@/components/settings/NotificationSettingsForm.vue';
import PaymentSettingsForm from '@/components/settings/PaymentSettingsForm.vue';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';
import TabBar from '@/components/ui/TabBar.vue';
import { useQueryTab } from '@/composables/useQueryTab';
import { useSettingsStore } from '@/stores/settings';

const store = useSettingsStore();
onMounted(() => store.load());

const { tab, setTab } = useQueryTab(['company', 'booking', 'payments', 'notifications'] as const);

// Las cuatro secciones quedan montadas (v-show): al cambiar de pestaña no se pierden cambios.
const company = ref<InstanceType<typeof CompanySettingsForm> | null>(null);
const booking = ref<InstanceType<typeof BookingSettingsForm> | null>(null);
const payments = ref<InstanceType<typeof PaymentSettingsForm> | null>(null);
const notifications = ref<InstanceType<typeof NotificationSettingsForm> | null>(null);

const dirtyBySection = computed(() => ({
  company: Boolean(company.value?.dirty),
  booking: Boolean(booking.value?.dirty),
  payments: Boolean(payments.value?.dirty),
  notifications: Boolean(notifications.value?.dirty),
}));
const anyDirty = computed(() => Object.values(dirtyBySection.value).some(Boolean));

// Un punto en la pestaña indica cambios sin guardar en esa sección.
const tabs = computed(() =>
  (
    [
      { value: 'company', label: 'Empresa' },
      { value: 'booking', label: 'Reservas' },
      { value: 'payments', label: 'Pagos' },
      { value: 'notifications', label: 'Notificaciones' },
    ] as const
  ).map((option) => ({ ...option, label: dirtyBySection.value[option.value] ? `${option.label} •` : option.label })),
);

onBeforeRouteLeave(() => (anyDirty.value ? window.confirm('Hay cambios de configuración sin guardar. ¿Salir y descartarlos?') : true));
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (anyDirty.value) event.preventDefault();
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <p class="text-sm text-brand-900/65">Datos del negocio y reglas del sitio. Cada sección se guarda por separado.</p>

    <TabBar :model-value="tab" :tabs="tabs" label="Secciones de configuración" @update:model-value="setTab" />

    <LoadErrorBanner :message="store.loadError" @retry="store.load(true)" />
    <p v-if="store.loading && !store.settings" class="py-10 text-center text-sm text-brand-900/60" role="status">Cargando configuración…</p>

    <div v-else-if="store.settings" class="rounded-xl border border-fog-200 bg-white p-5 sm:p-6">
      <section v-show="tab === 'company'" id="panel-company" role="tabpanel" aria-labelledby="tab-company">
        <CompanySettingsForm ref="company" />
      </section>
      <section v-show="tab === 'booking'" id="panel-booking" role="tabpanel" aria-labelledby="tab-booking">
        <BookingSettingsForm ref="booking" />
      </section>
      <section v-show="tab === 'payments'" id="panel-payments" role="tabpanel" aria-labelledby="tab-payments">
        <PaymentSettingsForm ref="payments" />
      </section>
      <section v-show="tab === 'notifications'" id="panel-notifications" role="tabpanel" aria-labelledby="tab-notifications">
        <NotificationSettingsForm ref="notifications" />
      </section>
    </div>

    <!-- Usuarios: se construye junto con el inicio de sesión del panel. -->
    <div class="flex items-start gap-3 rounded-xl border border-dashed border-fog-200 bg-white p-5">
      <div>
        <p class="font-semibold">Usuarios y permisos</p>
        <p class="text-sm text-brand-900/65">
          Altas, bajas y roles (administrador y operador). Se activa junto con el inicio de sesión del panel, en la etapa de
          conectar con la base de datos.
        </p>
      </div>
    </div>
  </div>
</template>

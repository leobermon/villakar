<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import FormField from '@/components/ui/FormField.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { useSectionForm } from '@/composables/useSectionForm';
import { useSettingsStore } from '@/stores/settings';
import type { NotificationSettings } from '@/types/settings';
import { inputClass, secondaryButton } from '@/utils/formStyles';
import SectionActions from './SectionActions.vue';

const store = useSettingsStore();
const { form, dirty, saving, saved, reset, save, errorFor } = useSectionForm(
  () => store.settings?.notifications,
  (values) => store.save('notifications', values),
);
defineExpose({ dirty });

// ---- Correos del equipo (lista) ----
const newEmail = ref('');
const emailError = ref<string | null>(null);
const newEmailId = useId();

function addEmail() {
  const email = newEmail.value.trim().toLowerCase();
  emailError.value = null;
  if (!form.value || !email) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.value = 'Correo no válido.';
    return;
  }
  if (form.value.teamEmails.includes(email)) {
    emailError.value = 'Ese correo ya está en la lista.';
    return;
  }
  form.value.teamEmails.push(email);
  newEmail.value = '';
}

/** Al guardar, el aviso del campo de alta ya no aplica: manda el resultado de la validación. */
function onSave() {
  emailError.value = null;
  save();
}

function removeEmail(email: string) {
  if (form.value) form.value.teamEmails = form.value.teamEmails.filter((candidate) => candidate !== email);
}

const ALERTS: Array<{ key: keyof Pick<NotificationSettings, 'notifyNewReservation' | 'notifyContactRequest' | 'notifyPaymentToVerify'>; title: string; text: string }> = [
  { key: 'notifyNewReservation', title: 'Reserva confirmada', text: 'Cada reserva pagada o confirmada en efectivo.' },
  { key: 'notifyContactRequest', title: 'Solicitud de cotización', text: 'Cuando un cliente fuera de zona pide precio por el formulario de contacto.' },
  { key: 'notifyPaymentToVerify', title: 'Pago por verificar', text: 'Transferencias y efectivo pendientes de confirmar.' },
];

/** Vista previa del inicio del mensaje del link de pago en el idioma elegido. */
const linkPreview = computed(() =>
  form.value?.paymentLinkLanguage === 'es'
    ? 'Hola Ana, este es tu link de pago seguro para Private transfer VC… (USD 209.00): https://…'
    : 'Hi Ana, here is your secure payment link for Private transfer VC… (USD 209.00): https://…',
);
</script>

<template>
  <form v-if="form" class="space-y-6" novalidate @submit.prevent="onSave">
    <section class="space-y-4">
      <div>
        <h3 class="text-sm font-bold">Correos al cliente</h3>
        <p class="text-sm text-brand-900/65">Remitente de las confirmaciones de reserva que ya se envían.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ id, describedBy }" label="Nombre del remitente" :error="errorFor('senderName')">
          <input :id="id" v-model="form.senderName" maxlength="80" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('senderName')))" />
        </FormField>
        <FormField
          v-slot="{ id, describedBy }"
          label="Correo del remitente"
          :error="errorFor('senderEmail')"
          hint="Debe ser de tu dominio y estar autorizado en el proveedor de correo."
        >
          <input :id="id" v-model="form.senderEmail" type="email" maxlength="190" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('senderEmail')))" />
        </FormField>
      </div>
    </section>

    <section class="space-y-4 border-t border-fog-200 pt-5">
      <div>
        <h3 class="text-sm font-bold">Avisos al equipo</h3>
        <p class="text-sm text-brand-900/65">Quién recibe un correo cuando pasa algo que requiere atención.</p>
      </div>

      <div>
        <label :for="newEmailId" class="mb-1 block text-xs font-semibold text-brand-900/70">Correos del equipo</label>
        <div class="flex gap-2">
          <input
            :id="newEmailId"
            v-model="newEmail"
            type="email"
            maxlength="190"
            placeholder="operaciones@tudominio.com"
            :aria-invalid="Boolean(emailError || errorFor('teamEmails'))"
            :class="inputClass(Boolean(emailError || errorFor('teamEmails')))"
            @keydown.enter.prevent="addEmail"
            @input="emailError = null"
          />
          <button type="button" :class="secondaryButton" class="shrink-0" @click="addEmail">Agregar</button>
        </div>
        <p v-if="emailError || errorFor('teamEmails')" class="mt-1 text-xs font-medium text-accent-600">{{ emailError ?? errorFor('teamEmails') }}</p>
        <ul v-if="form.teamEmails.length" class="mt-2 flex flex-wrap gap-2">
          <li v-for="email in form.teamEmails" :key="email" class="flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm text-brand-900">
            {{ email }}
            <button
              type="button"
              class="grid size-6 place-items-center rounded-full hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
              :aria-label="`Quitar ${email}`"
              @click="removeEmail(email)"
            >
              ×
            </button>
          </li>
        </ul>
      </div>

      <ul class="divide-y divide-fog-100 rounded-xl border border-fog-200">
        <li v-for="alert in ALERTS" :key="alert.key" class="flex items-start justify-between gap-4 px-4 py-3">
          <div>
            <p class="text-sm font-semibold">{{ alert.title }}</p>
            <p class="text-xs text-brand-900/60">{{ alert.text }}</p>
          </div>
          <ToggleSwitch v-model="form[alert.key]" :label="`Avisar: ${alert.title}`" />
        </li>
      </ul>

      <p class="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
        Los avisos al equipo todavía no se envían: esta configuración quedará lista para cuando el backend los active.
      </p>
    </section>

    <section class="space-y-3 border-t border-fog-200 pt-5">
      <div>
        <h3 class="text-sm font-bold">Mensaje de los links de pago</h3>
        <p class="text-sm text-brand-900/65">Idioma del texto que se envía por WhatsApp o correo con cada link.</p>
      </div>
      <div class="flex gap-1 rounded-lg bg-fog-100 p-1 sm:w-80" role="group" aria-label="Idioma del mensaje">
        <button
          v-for="option in [
            { value: 'en', label: 'Inglés' },
            { value: 'es', label: 'Español' },
          ] as const"
          :key="option.value"
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 text-sm font-semibold"
          :class="form.paymentLinkLanguage === option.value ? 'bg-white text-brand-950 shadow-sm' : 'text-brand-900/65 hover:text-brand-950'"
          :aria-pressed="form.paymentLinkLanguage === option.value"
          @click="form.paymentLinkLanguage = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <p class="rounded-lg bg-fog-50 px-3 py-2.5 text-sm text-brand-900/75">{{ linkPreview }}</p>
    </section>

    <SectionActions :dirty="dirty" :saving="saving" :saved="saved" :message="errorFor('form')" @save="onSave" @reset="reset" />
  </form>
</template>

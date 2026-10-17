<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { CONTACT_STATUS } from '@/config/messages';
import { useMessagesStore } from '@/stores/messages';
import type { ContactStatus } from '@/types/messages';
import { formatInstant, formatLocalDate } from '@/utils/format';

const props = defineProps<{ contactId: number | null }>();
const emit = defineEmits<{ close: [] }>();

const store = useMessagesStore();
const contact = computed(() => store.contacts.find((candidate) => candidate.id === props.contactId));

const form = reactive<{ status: ContactStatus; notes: string }>({ status: 'NEW', notes: '' });
const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);
const ids = { status: useId(), notes: useId() };

// Al abrir otra solicitud, el formulario se llena con sus datos.
watch(
  () => props.contactId,
  () => {
    error.value = null;
    saved.value = false;
    if (!contact.value) return;
    form.status = contact.value.status;
    form.notes = contact.value.internalNotes ?? '';
  },
  { immediate: true },
);

const dirty = computed(() => Boolean(contact.value) && (form.status !== contact.value!.status || form.notes.trim() !== (contact.value!.internalNotes ?? '')));

/** Respuesta por correo con el asunto ya escrito. */
const mailto = computed(() => {
  if (!contact.value) return '#';
  const subject = encodeURIComponent('Your transfer quote request');
  return `mailto:${contact.value.email}?subject=${subject}`;
});

/** WhatsApp solo si el teléfono tiene formato internacional (+código de país). */
const whatsapp = computed(() => {
  const digits = contact.value?.phone?.replace(/\D/g, '') ?? '';
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
});

async function save() {
  if (!contact.value) return;
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    await store.updateContact(contact.value.id, { status: form.status, internalNotes: form.notes.trim() || null });
    saved.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}

const inputClass =
  'w-full rounded-lg border border-fog-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
</script>

<template>
  <BaseDrawer
    :open="Boolean(contact)"
    :title="contact?.name ?? ''"
    :subtitle="contact ? `Recibida ${formatInstant(contact.createdAt)}` : undefined"
    @close="emit('close')"
  >
    <template v-if="contact" #header>
      <div class="mt-2"><StatusBadge v-bind="CONTACT_STATUS[contact.status]" /></div>
    </template>

    <div v-if="contact" class="space-y-6">
      <div class="flex flex-wrap gap-2">
        <a
          :href="mailto"
          class="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Responder por correo
        </a>
        <a
          v-if="whatsapp"
          :href="whatsapp"
          target="_blank"
          rel="noopener"
          class="inline-flex h-10 items-center rounded-lg border border-brand-300 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Abrir WhatsApp
        </a>
      </div>

      <dl class="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-xs text-brand-900/60">Correo</dt>
          <dd class="font-medium break-all">{{ contact.email }}</dd>
        </div>
        <div>
          <dt class="text-xs text-brand-900/60">Teléfono</dt>
          <dd class="font-medium">{{ contact.phone ?? '—' }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-xs text-brand-900/60">Hotel o lugar</dt>
          <dd class="font-medium">{{ contact.hotelName }}</dd>
        </div>
        <div>
          <dt class="text-xs text-brand-900/60">Fecha de llegada</dt>
          <dd class="font-medium">{{ contact.arrivalDate ? formatLocalDate(contact.arrivalDate) : '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-brand-900/60">Pasajeros</dt>
          <dd class="font-medium">{{ contact.passengers ?? '—' }}</dd>
        </div>
      </dl>

      <section>
        <h3 class="text-xs font-semibold text-brand-900/60">Mensaje del cliente</h3>
        <p class="mt-1 rounded-lg bg-fog-50 p-3 text-sm whitespace-pre-wrap">{{ contact.message || 'No dejó mensaje.' }}</p>
      </section>

      <form class="space-y-4 rounded-xl border border-fog-200 p-4" @submit.prevent="save">
        <div>
          <label :for="ids.status" :class="labelClass">Estado</label>
          <select :id="ids.status" v-model="form.status" :class="[inputClass, 'h-10']">
            <option v-for="(meta, value) in CONTACT_STATUS" :key="value" :value="value">{{ meta.label }}</option>
          </select>
        </div>
        <div>
          <label :for="ids.notes" :class="labelClass">Notas internas</label>
          <textarea
            :id="ids.notes"
            v-model="form.notes"
            rows="4"
            maxlength="4000"
            placeholder="Qué se le cotizó, a quién se le avisó…"
            :class="[inputClass, 'py-2']"
          />
        </div>
        <p v-if="error" role="alert" class="text-sm font-medium text-accent-600">{{ error }}</p>
        <p v-else-if="saved && !dirty" role="status" class="text-sm font-medium text-emerald-700">Cambios guardados.</p>
        <button
          type="submit"
          class="h-10 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="saving || !dirty"
        >
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </form>
    </div>
  </BaseDrawer>
</template>

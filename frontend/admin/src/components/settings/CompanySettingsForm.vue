<script setup lang="ts">
import FormField from '@/components/ui/FormField.vue';
import { useSectionForm } from '@/composables/useSectionForm';
import { useSettingsStore } from '@/stores/settings';
import { inputClass } from '@/utils/formStyles';
import SectionActions from './SectionActions.vue';

const store = useSettingsStore();
const { form, dirty, saving, saved, reset, save, errorFor } = useSectionForm(
  () => store.settings?.company,
  (values) => store.save('company', values),
);
defineExpose({ dirty });
</script>

<template>
  <form v-if="form" class="space-y-5" novalidate @submit.prevent="save">
    <p class="text-sm text-brand-900/65">Aparecen en el sitio de reservas, en los correos de confirmación y en los links de pago.</p>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ id, describedBy }" label="Nombre comercial" :error="errorFor('name')" class="sm:col-span-2">
        <input :id="id" v-model="form.name" maxlength="80" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('name')))" />
      </FormField>
      <FormField v-slot="{ id, describedBy }" label="Teléfono" optional :error="errorFor('phone')" hint="Con clave de país: +52 998 123 4567">
        <input :id="id" v-model="form.phone" type="tel" maxlength="30" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('phone')))" />
      </FormField>
      <FormField v-slot="{ id, describedBy }" label="WhatsApp" optional :error="errorFor('whatsapp')" hint="Con clave de país: +52 998 123 4567">
        <input :id="id" v-model="form.whatsapp" type="tel" maxlength="30" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('whatsapp')))" />
      </FormField>
      <FormField v-slot="{ id, describedBy }" label="Correo de contacto" optional :error="errorFor('email')">
        <input :id="id" v-model="form.email" type="email" maxlength="190" :aria-describedby="describedBy" :class="inputClass(Boolean(errorFor('email')))" />
      </FormField>
      <FormField v-slot="{ id }" label="Dirección" optional>
        <input :id="id" v-model="form.address" maxlength="255" :class="inputClass()" />
      </FormField>
    </div>

    <p v-if="!form.phone && !form.whatsapp && !form.email" class="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      Todavía no hay ningún dato de contacto: los clientes que no puedan reservar en línea no sabrán cómo comunicarse.
    </p>

    <SectionActions :dirty="dirty" :saving="saving" :saved="saved" :message="errorFor('form')" @save="save" @reset="reset" />
  </form>
</template>

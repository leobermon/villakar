<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CountryCodePicker from '@/components/booking/CountryCodePicker.vue';
import { countryOption, formatNational, splitInternational, toE164, type CountryCode, type PhoneValue } from '@/utils/phone';

/**
 * Teléfono con selector de país: bandera y clave a la izquierda, número local a
 * la derecha. Valida según el país y marca el campo como inválido (validación
 * nativa del formulario) mientras el número no sea válido.
 */
const props = defineProps<{
  id: string;
  required?: boolean;
  inputClass: string;
}>();
const model = defineModel<PhoneValue>({ required: true });

const input = ref<HTMLInputElement | null>(null);
const touched = ref(false);
const country = computed<CountryCode>({
  get: () => model.value.country,
  set: (code) => (model.value = { ...model.value, country: code }),
});
const countryName = computed(() => countryOption(model.value.country).name);
const isEmpty = computed(() => model.value.number.trim() === '');
const invalid = computed(() => !isEmpty.value && toE164(model.value) === null);
const message = computed(() =>
  invalid.value ? `Enter a valid ${countryName.value} number, or choose your country.` : props.required && isEmpty.value ? 'Enter your phone number.' : '',
);

// Validación nativa: el formulario no se envía con un número inválido.
watch([message, input], () => input.value?.setCustomValidity(message.value), { immediate: true, flush: 'post' });

function onInput(event: Event) {
  const number = (event.target as HTMLInputElement).value;
  // Si pega el número con su clave (+44 …), se elige ese país solo.
  model.value = splitInternational(number) ?? { ...model.value, number };
}

function onBlur() {
  touched.value = true;
  model.value = { ...model.value, number: formatNational(model.value) };
}
</script>

<template>
  <div>
    <div class="flex gap-2">
      <CountryCodePicker v-model="country" />
      <input
        :id="props.id"
        ref="input"
        :value="model.number"
        type="tel"
        inputmode="tel"
        :required="props.required"
        maxlength="25"
        autocomplete="tel-national"
        :placeholder="model.country === 'US' || model.country === 'CA' ? '555 123 4567' : 'Phone number'"
        :aria-invalid="touched && invalid"
        :aria-describedby="touched && invalid ? `${props.id}-error` : undefined"
        :class="[props.inputClass, 'min-w-0 flex-1', touched && invalid ? 'border-accent-500' : '']"
        @input="onInput"
        @blur="onBlur"
      />
    </div>
    <p v-if="touched && invalid" :id="`${props.id}-error`" class="mt-1 text-xs font-medium text-accent-600">{{ message }}</p>
  </div>
</template>

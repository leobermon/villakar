<script setup lang="ts">
import { computed } from 'vue';
import type { PaymentMethod, PaymentMethodsAvailability } from '@/api/booking';

const props = defineProps<{ available: PaymentMethodsAvailability | null }>();
const method = defineModel<PaymentMethod | null>({ required: true });

const options = computed(() =>
  [
    { value: 'card' as const, title: 'Credit or debit card', text: 'Visa, Mastercard, Amex · secured by Stripe' },
    { value: 'paypal' as const, title: 'PayPal', text: 'Pay with your PayPal account' },
    { value: 'cash' as const, title: 'Cash', text: 'Pay your driver after the service' },
  ].filter((option) => props.available?.[option.value]),
);
</script>

<template>
  <fieldset>
    <legend class="mb-2 font-display text-lg font-semibold text-brand-950">Payment method</legend>

    <p v-if="!props.available" class="text-sm text-brand-900/60">Loading payment options…</p>
    <p
      v-else-if="options.length === 0"
      role="alert"
      class="rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600"
    >
      Payment is not available right now. Please contact us to complete your booking.
    </p>

    <div v-else class="grid gap-3 sm:grid-cols-3">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition"
        :class="method === option.value ? 'border-brand-500 ring-4 ring-brand-300/30' : 'border-brand-100 hover:border-brand-300'"
      >
        <input v-model="method" type="radio" name="payment-method" :value="option.value" required class="mt-1 accent-brand-600" />
        <span>
          <span class="block font-semibold text-brand-950">{{ option.title }}</span>
          <span class="block text-xs text-brand-900/60">{{ option.text }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>

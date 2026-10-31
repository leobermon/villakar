<script setup lang="ts">
import { computed, watch } from 'vue';
import type { PaymentMethod, PaymentMethodsAvailability } from '@/api/booking';
import { SITE } from '@/config';

/**
 * lastMinute: el servicio es en menos de 8 horas; el efectivo se muestra deshabilitado.
 */
const props = defineProps<{ available: PaymentMethodsAvailability | null; lastMinute?: boolean }>();
const method = defineModel<PaymentMethod | null>({ required: true });

const mxnRate = computed(() => props.available?.mxnRate ?? null);

const options = computed(() =>
  [
    { value: 'card' as const, title: 'Credit or debit card', text: 'Visa, Mastercard, Amex · secured by Stripe' },
    { value: 'paypal' as const, title: 'PayPal', text: 'Pay with your PayPal account' },
    { value: 'cash' as const, title: 'Cash', text: 'Pay your driver after the service' },
  ]
    .filter((option) => props.available?.[option.value])
    .map((option) => ({ ...option, disabled: option.value === 'cash' && Boolean(props.lastMinute) })),
);

const onlineAvailable = computed(() => options.value.some((option) => !option.disabled));

// Si el efectivo estaba elegido y el servicio pasa a ser de último minuto, se cambia a un pago en línea.
watch(
  [() => props.lastMinute, options],
  () => {
    if (props.lastMinute && method.value === 'cash') {
      method.value = options.value.find((option) => !option.disabled)?.value ?? null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <fieldset>
    <legend class="mb-2 font-display text-lg font-semibold text-brand-950">Payment method</legend>

    <p v-if="!props.available" class="text-sm text-brand-900/60">Loading payment options…</p>
    <p
      v-else-if="options.length === 0 || !onlineAvailable"
      role="alert"
      class="rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600"
    >
      <template v-if="props.lastMinute && options.length">
        Your pickup is less than {{ SITE.cashMinNoticeHours }} hours away, so payment must be made online, but online
        payment isn't available right now. Please contact us to book this last-minute transfer.
      </template>
      <template v-else>Payment is not available right now. Please contact us to complete your booking.</template>
    </p>

    <template v-else>
      <p v-if="props.lastMinute" role="status" class="mb-3 rounded-xl bg-mist-100 px-4 py-3 text-sm text-brand-900">
        <strong class="font-semibold">Last-minute service.</strong>
        Your pickup is less than {{ SITE.cashMinNoticeHours }} hours away, so payment is required now to guarantee your reservation. Cash is not
        available for last-minute bookings.
      </p>
      <div class="grid gap-3 sm:grid-cols-3">
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-start gap-3 rounded-2xl border bg-white p-4 transition"
          :class="
            option.disabled
              ? 'cursor-not-allowed border-brand-100 opacity-50'
              : method === option.value
                ? 'cursor-pointer border-brand-500 ring-4 ring-brand-300/30'
                : 'cursor-pointer border-brand-100 hover:border-brand-300'
          "
        >
          <input
            v-model="method"
            type="radio"
            name="payment-method"
            :value="option.value"
            :disabled="option.disabled"
            required
            class="mt-1 accent-brand-600"
          />
          <span>
            <span class="block font-semibold text-brand-950">{{ option.title }}</span>
            <span class="block text-xs text-brand-900/60">{{ option.disabled ? 'Not available for last-minute bookings' : option.text }}</span>

            <!-- Logos del servicio (mismos dibujos que PaymentBadges del pie de página). -->
            <span class="mt-2.5 flex items-center gap-1.5" aria-hidden="true">
              <template v-if="option.value === 'card'">
                <svg viewBox="0 0 48 32" class="h-6 w-9">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
                  <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="900" font-style="italic" fill="#1a1f71">VISA</text>
                </svg>
                <svg viewBox="0 0 48 32" class="h-6 w-9">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
                  <circle cx="19.5" cy="16" r="8" fill="#eb001b" />
                  <circle cx="28.5" cy="16" r="8" fill="#f79e1b" />
                  <path d="M24 9.4a8 8 0 0 1 0 13.2 8 8 0 0 1 0-13.2Z" fill="#ff5f00" />
                </svg>
                <svg viewBox="0 0 48 32" class="h-6 w-9">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#635bff" />
                  <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#fff">stripe</text>
                </svg>
              </template>
              <svg v-else-if="option.value === 'paypal'" viewBox="0 0 48 32" class="h-6 w-9">
                <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
                <text x="24" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="900" font-style="italic">
                  <tspan fill="#003087">Pay</tspan><tspan fill="#009cde">Pal</tspan>
                </text>
              </svg>
              <!-- Efectivo: billete -->
              <svg v-else viewBox="0 0 48 32" class="h-6 w-9">
                <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#e8f5ec" stroke="#b7dcc2" />
                <rect x="7" y="8" width="34" height="16" rx="2.5" fill="#fff" stroke="#2f9e5b" stroke-width="1.6" />
                <circle cx="24" cy="16" r="4.2" fill="none" stroke="#2f9e5b" stroke-width="1.6" />
                <circle cx="12.5" cy="16" r="1.3" fill="#2f9e5b" />
                <circle cx="35.5" cy="16" r="1.3" fill="#2f9e5b" />
              </svg>
            </span>
          </span>
        </label>
      </div>

      <!-- Las tarjetas se cobran en pesos mexicanos: cualquier tarjeta mexicana o extranjera puede pagar en MXN. -->
      <p v-if="method === 'card' && mxnRate" class="mt-3 rounded-2xl border border-brand-100 bg-white p-4 text-xs text-brand-900/70">
        Your card will be charged in Mexican pesos (MXN). Your bank may add its own fees.
      </p>
    </template>
  </fieldset>
</template>

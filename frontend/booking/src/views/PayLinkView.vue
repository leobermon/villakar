<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  captureLinkPaypal,
  confirmLinkStripe,
  fetchPaymentLink,
  startLinkPayment,
  type CardCurrency,
  type PaymentLinkInfo,
} from '@/api/booking';
import { ApiError } from '@/api/client';
import PaymentBadges from '@/components/layout/PaymentBadges.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { formatMxn, formatUsd, usdToPesos } from '@/utils/format';

/**
 * Página pública de un link de pago (/pay/<token>): el equipo se lo manda al cliente y aquí paga
 * con tarjeta (Stripe) o PayPal. Al volver del pago se confirma y se muestra el resultado.
 */
const route = useRoute();
const router = useRouter();
const token = String(route.params.token);

const link = ref<PaymentLinkInfo | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
/** Aviso sobre el último intento de pago (cancelado, pendiente, rechazado…). */
const notice = ref<string | null>(null);
const paying = ref<'card' | 'card-mxn' | 'paypal' | null>(null);
/** Lo que costaría en pesos (si el negocio ofrece pagar con tarjeta en MXN). */
const pesos = computed(() => (link.value?.mxnRate ? usdToPesos(link.value.amount, link.value.mxnRate) : null));

const expiresLabel = computed(() =>
  link.value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Cancun',
      }).format(new Date(link.value.expiresAt))
    : '',
);
const paidLabel = computed(() =>
  link.value?.paidAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Cancun',
      }).format(new Date(link.value.paidAt))
    : '',
);
const noMethods = computed(() => link.value && !link.value.methods.card && !link.value.methods.paypal);

function messageOf(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

/** Procesa el regreso desde Stripe o PayPal y limpia la URL. */
async function handlePaymentReturn(): Promise<void> {
  const { session_id: sessionId, paypal, token: orderId, payment } = route.query;
  if (!sessionId && !paypal && !payment) return;

  try {
    if (typeof sessionId === 'string') {
      const result = await confirmLinkStripe(sessionId);
      if (!result.paid) notice.value = 'Your card payment has not been completed yet.';
    } else if (paypal === 'return' && typeof orderId === 'string') {
      const result = await captureLinkPaypal(orderId);
      if (!result.paid) notice.value = result.message ?? 'Your PayPal payment has not been completed.';
    } else if (payment === 'cancelled') {
      notice.value = 'Payment was canceled. You can try again below.';
    }
  } catch (e) {
    notice.value = messageOf(e, 'We could not verify your payment yet. Please refresh in a moment.');
  }
  await router.replace({ query: {} });
}

async function load(): Promise<void> {
  try {
    link.value = await fetchPaymentLink(token);
  } catch (e) {
    error.value = messageOf(e, 'We could not find this payment link.');
  } finally {
    loading.value = false;
  }
}

async function pay(method: 'card' | 'paypal', currency: CardCurrency = 'usd'): Promise<void> {
  if (paying.value || link.value?.status !== 'ACTIVE') return;
  paying.value = currency === 'mxn' ? 'card-mxn' : method;
  notice.value = null;
  try {
    window.location.assign(await startLinkPayment(token, method, currency));
  } catch (e) {
    notice.value = messageOf(e, 'We could not open the payment page. Please try again.');
    paying.value = null;
  }
}

onMounted(async () => {
  await handlePaymentReturn();
  await load();
});
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p v-if="loading" class="py-16 text-center text-sm text-brand-900/60" role="status">Loading your payment link…</p>

      <section v-else-if="error || !link" class="rounded-3xl border border-brand-100 bg-white p-6 text-center sm:p-8">
        <h1 class="font-display text-2xl font-semibold text-brand-950">Payment link not found</h1>
        <p class="mt-2 text-sm text-brand-900/70">{{ error ?? 'This payment link does not exist.' }} Please check the link or ask us for a new one.</p>
        <RouterLink :to="{ name: 'contact' }" class="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          Contact us
        </RouterLink>
      </section>

      <template v-else>
        <!-- Resumen del cobro -->
        <section class="rounded-3xl border border-brand-100 bg-white p-6 sm:p-8">
          <p class="text-sm font-semibold tracking-[0.2em] text-brand-600 uppercase">Secure payment</p>
          <h1 class="mt-2 font-display text-2xl leading-tight font-bold text-brand-950 sm:text-3xl">{{ link.description }}</h1>
          <p class="mt-1 text-sm text-brand-900/70">
            For {{ link.customerName }}<template v-if="link.reservationCode"> · Reservation {{ link.reservationCode }}</template>
          </p>

          <div class="mt-6 flex items-end justify-between rounded-2xl bg-brand-50 px-5 py-4">
            <span>
              <span class="block text-sm font-semibold text-brand-900/70">Amount to pay</span>
              <span class="block text-xs font-semibold text-emerald-700">Tax included</span>
            </span>
            <span class="font-display text-3xl font-bold text-brand-950">
              {{ formatUsd(link.amount) }} <span class="font-sans text-sm font-medium text-brand-900/60">USD</span>
            </span>
          </div>

          <!-- Ya pagado -->
          <div v-if="link.status === 'PAID'" class="mt-6 rounded-2xl bg-emerald-600 px-5 py-4 text-white" role="status">
            <p class="font-display text-xl font-semibold">✓ Payment received</p>
            <p class="mt-1 text-sm text-white/85">
              Thank you! Your payment was received<template v-if="paidLabel"> on {{ paidLabel }} (Cancun time)</template>. You do not need to pay again.
            </p>
          </div>

          <!-- Vencido o cancelado -->
          <div v-else-if="link.status !== 'ACTIVE'" class="mt-6 rounded-2xl border border-accent-400/40 bg-white px-5 py-4" role="status">
            <p class="font-semibold text-brand-950">
              {{ link.status === 'EXPIRED' ? 'This payment link has expired' : 'This payment link is no longer valid' }}
            </p>
            <p class="mt-1 text-sm text-brand-900/70">Please contact us and we will send you a new one.</p>
          </div>

          <!-- Pago pendiente -->
          <template v-else>
            <p v-if="notice" role="status" class="mt-5 rounded-xl bg-mist-100 px-4 py-3 text-sm text-brand-900">{{ notice }}</p>

            <p v-if="noMethods" role="alert" class="mt-5 rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600">
              Online payment is not available right now. Please contact us to complete your payment.
            </p>
            <div v-else class="mt-6 space-y-3">
              <button
                v-if="link.methods.card"
                type="button"
                class="flex h-14 w-full items-center justify-between rounded-2xl border border-brand-300 bg-white px-5 text-left transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
                :disabled="paying !== null"
                @click="pay('card')"
              >
                <span>
                  <span class="block text-[15px] font-bold text-brand-950">{{ paying === 'card' ? 'Opening secure payment…' : 'Pay with credit or debit card' }}</span>
                  <span class="block text-xs text-brand-900/60">Visa, Mastercard, American Express · secured by Stripe</span>
                </span>
                <svg viewBox="0 0 48 32" class="h-8 w-12 shrink-0" role="img" aria-label="Stripe">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#635bff" />
                  <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#fff">stripe</text>
                </svg>
              </button>
              <button
                v-if="link.methods.card && link.mxnRate && pesos"
                type="button"
                class="flex h-14 w-full items-center justify-between rounded-2xl border border-brand-300 bg-white px-5 text-left transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
                :disabled="paying !== null"
                @click="pay('card', 'mxn')"
              >
                <span>
                  <span class="block text-[15px] font-bold text-brand-950">{{ paying === 'card-mxn' ? 'Opening secure payment…' :  }}</span>
                  <span class="block text-xs text-brand-900/60">For cards that do not accept US dollars · 1 USD = {{ link.mxnRate }} MXN</span>
                </span>
                <svg viewBox="0 0 48 32" class="h-8 w-12 shrink-0" role="img" aria-label="Stripe">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#635bff" />
                  <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#fff">stripe</text>
                </svg>
              </button>
              <button
                v-if="link.methods.card && link.mxnRate && pesos"
                type="button"
                class="flex h-14 w-full items-center justify-between rounded-2xl border border-brand-300 bg-white px-5 text-left transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
                :disabled="paying !== null"
                @click="pay('card', 'mxn')"
              >
                <span>
                  <span class="block text-[15px] font-bold text-brand-950">{{
                    paying === 'card-mxn' ? 'Opening secure payment…' : `Pay with card in Mexican pesos · ${formatMxn(pesos)}`
                  }}</span>
                  <span class="block text-xs text-brand-900/60">For cards that do not accept US dollars · 1 USD = {{ link.mxnRate }} MXN</span>
                </span>
                <svg viewBox="0 0 48 32" class="h-8 w-12 shrink-0" role="img" aria-label="Stripe">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#635bff" />
                  <text x="24" y="20.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#fff">stripe</text>
                </svg>
              </button>
              <button
                v-if="link.methods.paypal"
                type="button"
                class="flex h-14 w-full items-center justify-between rounded-2xl border border-brand-300 bg-white px-5 text-left transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
                :disabled="paying !== null"
                @click="pay('paypal')"
              >
                <span>
                  <span class="block text-[15px] font-bold text-brand-950">{{ paying === 'paypal' ? 'Opening PayPal…' : 'Pay with PayPal' }}</span>
                  <span class="block text-xs text-brand-900/60">Use your PayPal account or card</span>
                </span>
                <svg viewBox="0 0 48 32" class="h-8 w-12 shrink-0" role="img" aria-label="PayPal">
                  <rect x="0.5" y="0.5" width="47" height="31" rx="4" fill="#fff" stroke="#d2eaf6" />
                  <text x="24" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="900" font-style="italic">
                    <tspan fill="#003087">Pay</tspan><tspan fill="#009cde">Pal</tspan>
                  </text>
                </svg>
              </button>
            </div>

            <div v-if="!noMethods" class="mt-6 flex flex-col items-center gap-2 border-t border-brand-100 pt-5">
              <p class="text-xs font-semibold tracking-wide text-brand-900/60 uppercase">We accept</p>
              <PaymentBadges class="justify-center" />
            </div>

            <p class="mt-5 text-center text-xs text-brand-900/60">
              This link is valid until {{ expiresLabel }} (Cancun time). Your card details are handled by Stripe or PayPal and never stored on our site.
            </p>
          </template>
        </section>

        <p class="mt-6 text-center text-xs text-brand-900/60">
          Questions? <RouterLink :to="{ name: 'contact' }" class="font-semibold underline underline-offset-2 hover:text-brand-800">Contact us</RouterLink>
        </p>
      </template>
    </main>
  </div>
</template>

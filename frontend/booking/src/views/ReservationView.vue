<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  capturePaypalPayment,
  chooseCashPayment,
  confirmStripePayment,
  defaultPaymentMethod,
  fetchCompanyInfo,
  fetchPaymentMethods,
  type CompanyInfo,
  lookupReservation,
  startPayment,
  type PaymentMethod,
  type PaymentMethodsAvailability,
  type ReservationSummary,
} from '@/api/booking';
import { ApiError } from '@/api/client';
import logoUrl from '@/assets/logo.png';
import { SITE } from '@/config';
import PaymentMethodPicker from '@/components/booking/PaymentMethodPicker.vue';
import TermsCheckbox from '@/components/booking/TermsCheckbox.vue';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { formatInstantCancun, formatLocalDateTime, formatLocalTime, formatUsd } from '@/utils/format';
import { formatInternational } from '@/utils/phone';
import { recallReservationEmail, rememberReservationEmail } from '@/utils/reservationAccess';

const route = useRoute();
const router = useRouter();
const code = String(route.params.code).toUpperCase();

const reservation = ref<ReservationSummary | null>(null);
const email = ref(recallReservationEmail(code) ?? '');
const needsEmail = ref(!email.value);
const loading = ref(true);
const error = ref<string | null>(null);
/** Aviso sobre el último intento de pago (cancelado, pendiente, rechazado…). */
const notice = ref<string | null>(null);

const paymentMethod = ref<PaymentMethod | null>(null);
const availableMethods = ref<PaymentMethodsAvailability | null>(null);
const acceptedTerms = ref(false);
const paying = ref(false);
const emailId = useId();

/** Datos de la empresa; mientras cargan (o si falla) se muestra solo el nombre del sitio. */
const company = ref<CompanyInfo>({ name: SITE.name, phone: '', whatsapp: '', email: '', address: '', hours: '' });
const hasContact = computed(() => Boolean(company.value.phone || company.value.whatsapp || company.value.email || company.value.hours));
fetchCompanyInfo()
  .then((info) => (company.value = info))
  .catch(() => {});

const isPaid = computed(() => reservation.value?.paymentStatus === 'PAID');
/** Confirmada: pagada en línea, o con pago en efectivo pendiente y no cancelada. */
const isConfirmed = computed(() => {
  const current = reservation.value;
  if (!current || current.status === 'CANCELLED' || current.status === 'NO_SHOW') return false;
  return isPaid.value || current.payInCash;
});

/** Procesa el regreso desde Stripe o PayPal y limpia la URL. */
async function handlePaymentReturn(): Promise<void> {
  const { session_id: sessionId, paypal, token, payment } = route.query;
  if (!sessionId && !paypal && !payment) return;

  try {
    if (typeof sessionId === 'string') {
      const result = await confirmStripePayment(sessionId);
      if (!result.paid) notice.value = 'Your card payment has not been completed yet.';
    } else if (paypal === 'return' && typeof token === 'string') {
      const result = await capturePaypalPayment(token);
      if (!result.paid) notice.value = result.message ?? 'Your PayPal payment has not been completed.';
    } else if (payment === 'cancelled') {
      notice.value = 'Payment was cancelled. Your reservation is saved; you can pay below.';
    } else if (payment === 'error') {
      notice.value = 'We could not open the payment page. Please try again.';
    }
  } catch (e) {
    notice.value = e instanceof ApiError ? e.message : 'We could not verify your payment yet. Please refresh in a moment.';
  }
  await router.replace({ query: {} });
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    reservation.value = await lookupReservation({ code, email: email.value.trim() });
    rememberReservationEmail(code, email.value.trim());
    needsEmail.value = false;
    if (reservation.value.canPay && !availableMethods.value) await loadPaymentMethods();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
    needsEmail.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadPaymentMethods(): Promise<void> {
  try {
    availableMethods.value = await fetchPaymentMethods();
  } catch {
    availableMethods.value = { card: false, paypal: false, cash: false };
  }
  paymentMethod.value = defaultPaymentMethod(availableMethods.value);
}

async function pay(): Promise<void> {
  if (!paymentMethod.value || paying.value || !acceptedTerms.value) return;
  paying.value = true;
  notice.value = null;
  const access = { code, email: email.value.trim() };
  try {
    if (paymentMethod.value === 'cash') {
      await chooseCashPayment(access);
      await load();
      paying.value = false;
    } else {
      window.location.assign(await startPayment(paymentMethod.value, access));
    }
  } catch (e) {
    notice.value = e instanceof ApiError ? e.message : 'We could not open the payment page. Please try again.';
    paying.value = false;
  }
}

function printConfirmation(): void {
  window.print();
}

onMounted(async () => {
  await handlePaymentReturn();
  if (email.value) await load();
  else loading.value = false;
});

const inputClass =
  'h-11 w-full rounded-xl border border-brand-100 bg-white px-3 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30';
</script>

<template>
  <div class="print:[print-color-adjust:exact]">
    <SiteHeader class="print:hidden" />
    <main class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <p v-if="loading" class="py-16 text-center text-sm text-brand-900/60" role="status">Loading your reservation…</p>

      <!-- Sin email en esta pestaña (p. ej. otro dispositivo): se pide para consultar. -->
      <section v-else-if="needsEmail || !reservation" class="rounded-3xl border border-brand-100 bg-white p-6 sm:p-8">
        <h1 class="font-display text-2xl font-semibold">Find your reservation</h1>
        <p class="mt-2 text-sm text-brand-900/70">
          Enter the email you used to book <strong>{{ code }}</strong>.
        </p>
        <form class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="load">
          <div class="flex-1">
            <label :for="emailId" class="mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase">Email</label>
            <input :id="emailId" v-model="email" type="email" required maxlength="190" autocomplete="email" :class="inputClass" />
          </div>
          <button type="submit" class="h-11 rounded-xl bg-brand-700 px-6 text-sm font-bold text-white hover:bg-brand-800">
            View reservation
          </button>
        </form>
        <p v-if="error" role="alert" class="mt-4 rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600">{{ error }}</p>
        <p v-if="notice" role="status" class="mt-4 rounded-xl bg-mist-100 px-4 py-3 text-sm text-brand-900">{{ notice }}</p>
      </section>

      <template v-else>
        <!-- Empresa: logo y nombre (también encabeza la hoja impresa). -->
        <div class="mb-4 flex items-center gap-3">
          <img :src="logoUrl" :alt="company.name" width="1000" height="436" class="h-14 w-auto" />
          <div>
            <p class="font-display text-lg font-semibold text-brand-950">{{ company.name }}</p>
            <!-- Fecha en que se hizo la reservación (hora de Cancún). -->
            <p class="text-xs text-brand-900/70">
              {{ isConfirmed ? 'Reservation confirmed on' : 'Reservation created on' }}
              {{ formatInstantCancun(reservation.createdAt) }} (Cancun time)
            </p>
          </div>
          <button
            v-if="isConfirmed"
            type="button"
            class="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 text-sm font-bold text-brand-700 hover:bg-brand-50 sm:px-4 print:hidden"
            aria-label="Print confirmation"
            @click="printConfirmation"
          >
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
            </svg>
            <span class="hidden sm:inline">Print confirmation</span>
          </button>
        </div>

        <!-- Encabezado compacto: estado a la izquierda, código a la derecha, para que el detalle quede a la vista. -->
        <section
          class="flex flex-col gap-3 rounded-2xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          :class="isConfirmed ? 'bg-emerald-600 text-white' : reservation.canPay ? 'border border-brand-100 bg-white' : 'border border-accent-400/40 bg-white'"
          role="status"
        >
          <div class="flex items-start gap-3">
            <div v-if="isConfirmed" class="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-lg" aria-hidden="true">✓</div>
            <div>
              <template v-if="isConfirmed">
                <h1 class="font-display text-xl font-semibold">Your transfer is confirmed</h1>
                <p class="text-sm text-white/80">
                  Thanks, {{ reservation.customer.firstName }}.
                  {{ reservation.confirmationEmailSent ? 'We sent your booking details to:' : 'Your booking details will be sent to:' }}
                </p>
                <!-- Correo en su propio párrafo para que no se corte a media dirección. -->
                <p class="mt-0.5 text-sm font-semibold [overflow-wrap:anywhere] text-white">{{ reservation.customer.email }}</p>
              </template>
              <template v-else-if="reservation.canPay">
                <h1 class="font-display text-xl font-semibold">Complete your booking</h1>
                <p class="text-sm text-brand-900/70">Your reservation is saved but not confirmed until you choose how to pay.</p>
              </template>
              <template v-else>
                <h1 class="font-display text-xl font-semibold">This reservation is no longer active</h1>
                <p class="text-sm text-brand-900/70">It was not paid in time. Please search again to book your transfer.</p>
                <RouterLink :to="{ name: 'home' }" class="mt-2 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
                  New search
                </RouterLink>
              </template>
            </div>
          </div>
          <div class="shrink-0 sm:text-right">
            <p class="text-[11px]" :class="isConfirmed ? 'text-white/70' : 'text-brand-600'">Reservation code</p>
            <p class="font-display text-lg font-bold tracking-widest">{{ reservation.code }}</p>
          </div>
        </section>

        <p v-if="isConfirmed && !isPaid" class="mt-3 rounded-xl bg-mist-100 px-4 py-2.5 text-sm font-medium text-brand-900">
          Please pay {{ formatUsd(reservation.total) }} USD in cash to your driver after the service.
        </p>

        <p v-if="notice" role="status" class="mt-6 rounded-xl bg-mist-100 px-4 py-3 text-sm text-brand-900">{{ notice }}</p>

        <form v-if="reservation.canPay" class="mt-6 space-y-5 rounded-2xl border border-brand-100 bg-white p-5 sm:p-6" @submit.prevent="pay">
          <PaymentMethodPicker v-model="paymentMethod" :available="availableMethods" :last-minute="reservation.lastMinute" />
          <TermsCheckbox v-model="acceptedTerms" />
          <button
            type="submit"
            class="h-12 w-full rounded-xl bg-accent-500 text-[15px] font-bold text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
            :disabled="paying || !paymentMethod"
          >
            <template v-if="paymentMethod === 'cash'">{{ paying ? 'Confirming…' : 'Confirm and pay in cash' }}</template>
            <template v-else>{{ paying ? 'Redirecting to payment…' : `Pay ${formatUsd(reservation.total)} USD` }}</template>
          </button>
        </form>

        <section class="mt-6 space-y-4">
          <article v-for="leg in reservation.legs" :key="leg.legNumber" class="rounded-2xl border border-brand-100 bg-white p-5 sm:p-6">
            <p class="text-xs font-semibold tracking-wide text-brand-600 uppercase">
              {{ reservation.legs.length > 1 ? (leg.legNumber === 1 ? 'Outbound' : 'Return') : 'Your transfer' }}
            </p>
            <p class="mt-1 font-semibold text-brand-950">{{ leg.originName }} → {{ leg.destinationName }}</p>
            <dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs text-brand-900/60">Pickup</dt>
                <dd class="font-medium">{{ formatLocalDateTime(leg.pickupAt) }}</dd>
              </div>
              <div v-if="leg.flightNumber">
                <dt class="text-xs text-brand-900/60">Flight</dt>
                <dd class="font-medium">
                  {{ leg.airline }} {{ leg.flightNumber }}
                  <template v-if="leg.flightTime">
                    ·
                    {{
                      leg.flightTime.slice(0, 10) === leg.pickupAt.slice(0, 10)
                        ? formatLocalTime(leg.flightTime)
                        : formatLocalDateTime(leg.flightTime)
                    }}
                  </template>
                  <template v-if="leg.terminal"> · Terminal {{ leg.terminal.slice(1) }}</template>
                </dd>
              </div>
            </dl>
          </article>

          <dl class="grid gap-4 rounded-2xl border border-brand-100 bg-white p-5 text-sm sm:grid-cols-3 sm:p-6">
            <div>
              <dt class="text-xs text-brand-900/60">Vehicle</dt>
              <dd class="font-medium">{{ reservation.vehicleName }}</dd>
            </div>
            <div>
              <dt class="text-xs text-brand-900/60">Passengers</dt>
              <dd class="font-medium">{{ reservation.passengers }}</dd>
            </div>
            <div>
              <dt class="text-xs text-brand-900/60">{{ isPaid ? 'Paid' : reservation.payInCash ? 'Pay in cash' : 'Total' }}</dt>
              <dd class="font-medium">{{ formatUsd(reservation.total) }} USD</dd>
            </div>
            <div class="sm:col-span-3">
              <dt class="text-xs text-brand-900/60">Lead passenger</dt>
              <dd class="font-medium">
                {{ reservation.customer.firstName }} {{ reservation.customer.lastName }} · {{ formatInternational(reservation.customer.phone) }}
              </dd>
            </div>
            <div v-if="reservation.specialRequests" class="sm:col-span-3">
              <dt class="text-xs text-brand-900/60">Special requests</dt>
              <dd class="whitespace-pre-line">{{ reservation.specialRequests }}</dd>
            </div>
          </dl>
        </section>

        <!-- Contacto de la empresa (Configuración del panel); se omite si no hay ningún dato. -->
        <section v-if="hasContact" class="mt-6 rounded-2xl border border-brand-100 bg-white p-5 sm:p-6">
          <h2 class="font-display text-lg font-semibold">Need help? Contact {{ company.name }}</h2>
          <dl class="mt-3 grid gap-4 text-sm sm:grid-cols-3">
            <div v-if="company.phone || company.whatsapp">
              <dt class="text-xs text-brand-900/60">Phone / WhatsApp</dt>
              <dd class="font-medium">
                <a v-if="company.phone" :href="`tel:${company.phone.replace(/[^+\d]/g, '')}`" class="block hover:text-brand-700">{{ company.phone }}</a>
                <a
                  v-if="company.whatsapp && company.whatsapp !== company.phone"
                  :href="`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`"
                  target="_blank"
                  rel="noopener"
                  class="block hover:text-brand-700"
                >WhatsApp {{ company.whatsapp }}</a>
              </dd>
            </div>
            <div v-if="company.email">
              <dt class="text-xs text-brand-900/60">Email</dt>
              <dd class="font-medium [overflow-wrap:anywhere]">
                <a :href="`mailto:${company.email}`" class="hover:text-brand-700">{{ company.email }}</a>
              </dd>
            </div>
            <div v-if="company.hours">
              <dt class="text-xs text-brand-900/60">Office hours</dt>
              <dd class="font-medium">{{ company.hours }}</dd>
            </div>
          </dl>
        </section>

      </template>
    </main>
  </div>
</template>

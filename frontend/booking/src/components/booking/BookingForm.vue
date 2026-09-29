<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, useId } from 'vue';
import { useRouter } from 'vue-router';
import {
  chooseCashPayment,
  createReservation,
  defaultPaymentMethod,
  fetchPaymentMethods,
  startPayment,
  type LegDetails,
  type PaymentMethod,
  type PaymentMethodsAvailability,
  type RouteType,
} from '@/api/booking';
import { ApiError } from '@/api/client';
import LegDetailsFields, { type LegKind } from '@/components/booking/LegDetailsFields.vue';
import PaymentMethodPicker from '@/components/booking/PaymentMethodPicker.vue';
import VehicleCard from '@/components/booking/VehicleCard.vue';
import { useBookingStore } from '@/stores/booking';
import { formatUsd } from '@/utils/format';
import { rememberReservationEmail } from '@/utils/reservationAccess';

const store = useBookingStore();
const router = useRouter();
// Solo se monta con una cotización disponible y un vehículo elegido (el store elige uno por defecto).
const quote = computed(() => store.quote!);
const option = computed(() => store.selectedOption!);

const customer = reactive({ firstName: '', lastName: '', email: '', phone: '' });
const specialRequests = ref('');
const paymentMethod = ref<PaymentMethod | null>(null);
const availableMethods = ref<PaymentMethodsAvailability | null>(null);
const submitting = ref(false);
const error = ref<string | null>(null);

const ids = { first: useId(), last: useId(), email: useId(), phone: useId(), notes: useId() };
const inputClass =
  'h-11 w-full rounded-xl border border-brand-100 bg-white px-3 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30';
const labelClass = 'mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase';

function kindOf(route: RouteType): LegKind {
  if (route === 'AIRPORT_HOTEL') return 'ARRIVAL';
  if (route === 'HOTEL_AIRPORT') return 'DEPARTURE';
  return 'TRANSFER';
}

const LEG_TITLES: Record<LegKind, string> = {
  ARRIVAL: 'Arrival: airport to hotel',
  DEPARTURE: 'Departure: hotel to airport',
  TRANSFER: 'Hotel transfer',
};

/** Tramos del viaje: la ida y, en viaje redondo, el regreso en sentido inverso. */
const legs = computed(() => {
  const { origin, destination, routeType, tripType } = quote.value;
  const outboundKind = kindOf(routeType!);
  const result = [
    { kind: outboundKind, date: store.search.date, from: origin.name, to: destination.name },
  ];
  if (tripType === 'ROUND_TRIP') {
    const returnKind: LegKind =
      outboundKind === 'ARRIVAL' ? 'DEPARTURE' : outboundKind === 'DEPARTURE' ? 'ARRIVAL' : 'TRANSFER';
    result.push({ kind: returnKind, date: store.search.returnDate, from: destination.name, to: origin.name });
  }
  return result.map((leg, index) => ({
    ...leg,
    title: leg.kind === 'TRANSFER' && result.length > 1 ? (index === 0 ? 'Outbound transfer' : 'Return transfer') : LEG_TITLES[leg.kind],
  }));
});

const legDetails = reactive<LegDetails[]>(legs.value.map(() => ({ terminal: undefined })));

// Si el cliente vuelve con "Atrás" desde Stripe / PayPal, el navegador puede
// restaurar la página congelada con el botón deshabilitado.
function resetOnRestore(event: PageTransitionEvent) {
  if (event.persisted) submitting.value = false;
}
onMounted(() => window.addEventListener('pageshow', resetOnRestore));
onUnmounted(() => window.removeEventListener('pageshow', resetOnRestore));

onMounted(async () => {
  try {
    availableMethods.value = await fetchPaymentMethods();
  } catch {
    availableMethods.value = { card: false, paypal: false, cash: false };
  }
  paymentMethod.value = defaultPaymentMethod(availableMethods.value);
});

/** Solo se envían los campos que aplican a cada tipo de tramo. */
function legPayload(kind: LegKind, details: LegDetails): LegDetails {
  const flight =
    kind === 'TRANSFER'
      ? {}
      : {
          airline: details.airline?.trim(),
          flightNumber: details.flightNumber?.trim().toUpperCase(),
          flightTime: details.flightTime,
          terminal: details.terminal,
        };
  return { ...flight, pickupTime: kind === 'ARRIVAL' ? undefined : details.pickupTime };
}

async function submit() {
  if (submitting.value || !paymentMethod.value) return;
  submitting.value = true;
  error.value = null;

  let code: string;
  const email = customer.email.trim();
  try {
    const reservation = await createReservation({
      ...store.buildQuoteRequest(),
      vehicleTypeId: option.value.vehicleType.id,
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email,
        phone: customer.phone.trim(),
      },
      legs: legs.value.map((leg, index) => legPayload(leg.kind, legDetails[index])),
      specialRequests: specialRequests.value.trim() || undefined,
    });
    code = reservation.code;
    rememberReservationEmail(code, email);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
    submitting.value = false;
    return;
  }

  try {
    if (paymentMethod.value === 'cash') {
      await chooseCashPayment({ code, email });
      await router.push({ name: 'reservation', params: { code } });
    } else {
      window.location.assign(await startPayment(paymentMethod.value, { code, email }));
    }
  } catch {
    // La reserva ya existe: desde su página se puede reintentar el pago.
    await router.push({ name: 'reservation', params: { code }, query: { payment: 'error' } });
  }
}
</script>

<template>
  <form class="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start" @submit.prevent="submit">
    <div class="space-y-6">
      <section>
        <h1 class="font-display text-2xl font-semibold sm:text-3xl">Choose your vehicle</h1>
        <p class="mt-1 text-sm text-brand-900/70">Prices are per vehicle, in USD, including your whole group.</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <VehicleCard
            v-for="vehicle in quote.options"
            :key="vehicle.rateId"
            :option="vehicle"
            :trip-type="quote.tripType"
            :selected="store.selectedRateId === vehicle.rateId"
            @select="store.selectOption"
          />
        </div>
      </section>

      <section>
        <h2 class="font-display text-2xl font-semibold">Passenger details</h2>
        <p class="mt-1 text-sm text-brand-900/70">We will use these details to contact you about your transfer.</p>
        <div class="mt-3 grid gap-3 rounded-2xl border border-brand-100 bg-white p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <label :for="ids.first" :class="labelClass">First name</label>
            <input :id="ids.first" v-model="customer.firstName" required maxlength="80" autocomplete="given-name" :class="inputClass" />
          </div>
          <div>
            <label :for="ids.last" :class="labelClass">Last name</label>
            <input :id="ids.last" v-model="customer.lastName" required maxlength="80" autocomplete="family-name" :class="inputClass" />
          </div>
          <div>
            <label :for="ids.email" :class="labelClass">Email</label>
            <input :id="ids.email" v-model="customer.email" type="email" required maxlength="190" autocomplete="email" :class="inputClass" />
          </div>
          <div>
            <label :for="ids.phone" :class="labelClass">Phone / WhatsApp</label>
            <input
              :id="ids.phone"
              v-model="customer.phone"
              type="tel"
              required
              maxlength="30"
              pattern="\+?[0-9 ()\-]{6,30}"
              title="Include your country code, e.g. +1 555 123 4567"
              placeholder="+1 555 123 4567"
              autocomplete="tel"
              :class="inputClass"
            />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="font-display text-2xl font-semibold">Trip details</h2>
        <LegDetailsFields
          v-for="(leg, index) in legs"
          :key="index"
          v-model="legDetails[index]"
          :kind="leg.kind"
          :title="leg.title"
          :date="leg.date"
          :from="leg.from"
          :to="leg.to"
        />
        <div class="rounded-2xl border border-brand-100 bg-white p-4 sm:p-5">
          <label :for="ids.notes" :class="labelClass">Special requests <span class="normal-case opacity-60">(optional)</span></label>
          <textarea
            :id="ids.notes"
            v-model="specialRequests"
            rows="3"
            maxlength="1000"
            placeholder="Child seats, extra luggage, a stop on the way…"
            class="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30"
          />
        </div>
      </section>

      <PaymentMethodPicker v-model="paymentMethod" :available="availableMethods" />
    </div>

    <aside class="rounded-2xl border border-brand-100 bg-white p-5 sm:p-6 lg:sticky lg:top-6">
      <p class="text-xs font-semibold tracking-wide text-brand-600 uppercase">Your vehicle</p>
      <p class="font-display text-xl font-semibold">{{ option.vehicleType.name }}</p>
      <p class="text-sm text-brand-900/70">
        {{ quote.tripType === 'ROUND_TRIP' ? 'Round trip' : 'One way' }} · {{ quote.passengers }}
        {{ quote.passengers === 1 ? 'passenger' : 'passengers' }}
      </p>
      <div class="mt-5 flex items-baseline justify-between border-t border-brand-100 pt-4">
        <span class="text-sm font-semibold">Total</span>
        <span class="font-display text-3xl font-bold">{{ formatUsd(option.price) }}</span>
      </div>
      <p class="text-right text-xs text-brand-900/60">USD · per vehicle</p>

      <p v-if="error" role="alert" class="mt-4 rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600">
        {{ error }}
      </p>

      <button
        type="submit"
        class="mt-5 h-12 w-full rounded-xl bg-accent-500 text-[15px] font-bold text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60"
        :disabled="submitting || !paymentMethod"
      >
        <template v-if="paymentMethod === 'cash'">{{ submitting ? 'Confirming…' : 'Confirm booking' }}</template>
        <template v-else>{{ submitting ? 'Redirecting to payment…' : 'Continue to payment' }}</template>
      </button>
      <p class="mt-3 text-center text-xs text-brand-900/60">
        {{
          paymentMethod === 'cash'
            ? 'Pay your driver in cash after the service.'
            : 'You will complete the payment on a secure page.'
        }}
      </p>
    </aside>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, useId } from 'vue';
import { sendContactRequest, type ContactRequestPayload } from '@/api/booking';
import { ApiError } from '@/api/client';
import { todayInCancun } from '@/utils/format';
import { openNativePicker } from '@/utils/picker';

const props = defineProps<{
  title: string;
  intro: string;
  hotelName?: string;
  googlePlaceId?: string;
  arrivalDate?: string;
  passengers?: number;
}>();

const form = reactive({
  name: '',
  email: '',
  phone: '',
  hotelName: props.hotelName ?? '',
  arrivalDate: props.arrivalDate ?? '',
  passengers: props.passengers ?? 2,
  message: '',
});

const sending = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);
const ids = { name: useId(), email: useId(), phone: useId(), hotel: useId(), date: useId(), pax: useId(), msg: useId() };

const inputClass =
  'h-11 w-full rounded-xl border border-brand-100 bg-white px-3 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30';
const labelClass = 'mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase';

async function submit() {
  sending.value = true;
  error.value = null;
  const payload: ContactRequestPayload = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    hotelName: form.hotelName.trim(),
    googlePlaceId: props.googlePlaceId,
    arrivalDate: form.arrivalDate || undefined,
    passengers: form.passengers || undefined,
    message: form.message.trim() || undefined,
  };
  try {
    await sendContactRequest(payload);
    sent.value = true;
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <section class="rounded-3xl border border-brand-100 bg-white p-6 sm:p-8">
    <div v-if="sent" class="py-6 text-center" role="status">
      <div class="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-2xl text-brand-700">✓</div>
      <h2 class="mt-4 font-display text-2xl font-semibold">Thanks, we got your request</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-brand-900/70">
        Our team will email you at <strong>{{ form.email }}</strong> with a quote for your transfer.
      </p>
    </div>

    <template v-else>
      <h2 class="font-display text-2xl font-semibold text-brand-950">{{ props.title }}</h2>
      <p class="mt-2 text-sm text-brand-900/70">{{ props.intro }}</p>

      <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
        <div>
          <label :for="ids.name" :class="labelClass">Full name</label>
          <input :id="ids.name" v-model="form.name" required maxlength="120" autocomplete="name" :class="inputClass" />
        </div>
        <div>
          <label :for="ids.email" :class="labelClass">Email</label>
          <input :id="ids.email" v-model="form.email" type="email" required maxlength="190" autocomplete="email" :class="inputClass" />
        </div>
        <div>
          <label :for="ids.phone" :class="labelClass">Phone / WhatsApp <span class="normal-case opacity-60">(optional)</span></label>
          <input :id="ids.phone" v-model="form.phone" type="tel" maxlength="30" autocomplete="tel" :class="inputClass" />
        </div>
        <div>
          <label :for="ids.hotel" :class="labelClass">Hotel or address</label>
          <input :id="ids.hotel" v-model="form.hotelName" required maxlength="190" :class="inputClass" />
        </div>
        <div>
          <label :for="ids.date" :class="labelClass">Travel date <span class="normal-case opacity-60">(optional)</span></label>
          <input :id="ids.date" v-model="form.arrivalDate" type="date" :min="todayInCancun()" :class="[inputClass, 'cursor-pointer']" @click="openNativePicker" />
        </div>
        <div>
          <label :for="ids.pax" :class="labelClass">Passengers</label>
          <input :id="ids.pax" v-model.number="form.passengers" type="number" min="1" max="50" required :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <label :for="ids.msg" :class="labelClass">Message <span class="normal-case opacity-60">(optional)</span></label>
          <textarea
            :id="ids.msg"
            v-model="form.message"
            rows="3"
            maxlength="2000"
            placeholder="Flight details, luggage, special requests…"
            class="w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30"
          />
        </div>

        <p v-if="error" role="alert" class="rounded-xl bg-accent-400/10 px-4 py-3 text-sm font-medium text-accent-600 sm:col-span-2">
          {{ error }}
        </p>

        <div class="sm:col-span-2">
          <button
            type="submit"
            class="h-12 w-full rounded-xl bg-brand-700 px-8 text-[15px] font-bold text-white transition hover:bg-brand-800 disabled:opacity-70 sm:w-auto"
            :disabled="sending"
          >
            {{ sending ? 'Sending…' : 'Request a quote' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

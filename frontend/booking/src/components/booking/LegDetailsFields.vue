<script setup lang="ts">
import { useId, watch } from 'vue';
import type { LegDetails } from '@/api/booking';
import { formatDateOnly } from '@/utils/format';
import TimeSelect from '@/components/booking/TimeSelect.vue';
import { SITE } from '@/config';
import { openNativePicker } from '@/utils/picker';

const serviceHours = SITE.serviceHours;

export type LegKind = 'ARRIVAL' | 'DEPARTURE' | 'TRANSFER';

const props = defineProps<{
  kind: LegKind;
  title: string;
  date: string;
  from: string;
  to: string;
}>();

const details = defineModel<LegDetails>({ required: true });

const ids = { airline: useId(), flight: useId(), flightTime: useId(), terminal: useId(), pickup: useId() };

const inputClass =
  'h-11 w-full rounded-xl border border-brand-100 bg-white px-3 text-[15px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/30';
const labelClass = 'mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase';

/** Hora sugerida de recogida: 3 horas antes del vuelo. */
function suggestPickup(flightTime: string): string {
  const [hours, minutes] = flightTime.split(':').map(Number);
  // Redondeada hacia abajo a 5 minutos, como los que ofrece el selector.
  const total = Math.floor(((hours * 60 + minutes - 180 + 24 * 60) % (24 * 60)) / 5) * 5;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// En salidas, al capturar la hora del vuelo se propone la recogida si aún no hay una.
watch(
  () => details.value.flightTime,
  (flightTime) => {
    if (props.kind === 'DEPARTURE' && flightTime && !details.value.pickupTime) {
      const suggested = suggestPickup(flightTime);
      // Solo se propone si cae dentro del horario de servicio.
      if (suggested >= serviceHours.start && suggested <= serviceHours.end) details.value.pickupTime = suggested;
    }
  },
);
</script>

<template>
  <fieldset class="rounded-2xl border border-brand-100 bg-white p-4 sm:p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="font-display text-lg font-semibold text-brand-950">{{ props.title }}</h3>
      <p class="text-sm font-medium text-brand-700">{{ formatDateOnly(props.date) }}</p>
    </div>
    <p class="mt-1 text-sm text-brand-900/70">{{ props.from }} → {{ props.to }}</p>

    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <template v-if="props.kind !== 'TRANSFER'">
        <div>
          <label :for="ids.airline" :class="labelClass">Airline</label>
          <input
            :id="ids.airline"
            v-model="details.airline"
            required
            maxlength="60"
            placeholder="e.g. American Airlines"
            :class="inputClass"
          />
        </div>
        <div>
          <label :for="ids.flight" :class="labelClass">Flight number</label>
          <input
            :id="ids.flight"
            v-model="details.flightNumber"
            required
            maxlength="9"
            pattern="[A-Za-z0-9]{2,3}\s?\d{1,4}[A-Za-z]?"
            title="Airline code and number, e.g. AA1234"
            placeholder="e.g. AA1234"
            autocapitalize="characters"
            :class="inputClass"
          />
        </div>
        <div>
          <label :for="ids.flightTime" :class="labelClass">
            {{ props.kind === 'ARRIVAL' ? 'Landing time' : 'Departure time' }}
          </label>
          <!-- En llegadas el servicio empieza al aterrizar: solo horas dentro del horario de servicio. -->
          <TimeSelect
            v-if="props.kind === 'ARRIVAL'"
            :id="ids.flightTime"
            v-model="details.flightTime"
            required
            :min="serviceHours.start"
            :max="serviceHours.end"
            :select-class="inputClass"
          />
          <input v-else :id="ids.flightTime" v-model="details.flightTime" type="time" required :class="[inputClass, 'cursor-pointer']" @click="openNativePicker" />
        </div>
        <div>
          <label :for="ids.terminal" :class="labelClass">Terminal</label>
          <select :id="ids.terminal" v-model="details.terminal" :class="inputClass">
            <option :value="undefined">Not sure yet</option>
            <option value="T2">Terminal 2</option>
            <option value="T3">Terminal 3</option>
            <option value="T4">Terminal 4</option>
          </select>
        </div>
      </template>

      <div v-if="props.kind !== 'ARRIVAL'">
        <label :for="ids.pickup" :class="labelClass">Pickup time at hotel</label>
        <TimeSelect
          :id="ids.pickup"
          v-model="details.pickupTime"
          required
          :min="serviceHours.start"
          :max="serviceHours.end"
          :select-class="inputClass"
        />
      </div>
    </div>

    <p v-if="props.kind === 'ARRIVAL'" class="mt-4 text-xs text-brand-900/60">
      Your driver tracks your flight and waits for you at the terminal exit with a sign with your name.
      Service hours: {{ serviceHours.label }}, Cancun local time.
    </p>
    <p v-else-if="props.kind === 'DEPARTURE'" class="mt-4 text-xs text-brand-900/60">
      We suggest a pickup 3 hours before international flights (2 hours for domestic). Pickups from
      {{ serviceHours.label }}, Cancun local time.
    </p>
    <p v-else class="mt-4 text-xs text-brand-900/60">Pickups from {{ serviceHours.label }}, Cancun local time.</p>
  </fieldset>
</template>

<script setup lang="ts">
import type { QuoteOption, TripType } from '@/api/booking';
import { formatUsd } from '@/utils/format';

const props = defineProps<{
  option: QuoteOption;
  tripType: TripType;
  selected: boolean;
}>();

const emit = defineEmits<{ select: [rateId: number] }>();
</script>

<template>
  <!-- Tarjeta vertical: se muestran en una cuadrícula de 3 columnas. -->
  <article
    class="flex flex-col overflow-hidden rounded-2xl border bg-white transition"
    :class="props.selected ? 'border-brand-500 ring-4 ring-brand-300/30' : 'border-brand-100 hover:border-brand-300'"
  >
    <div class="grid h-24 place-items-center bg-fog-100 px-4">
      <img
        v-if="props.option.vehicleType.imageUrl"
        :src="props.option.vehicleType.imageUrl"
        :alt="props.option.vehicleType.name"
        class="h-16 w-full object-contain"
      />
      <svg v-else viewBox="0 0 120 56" class="h-14 w-full text-brand-600" fill="none" aria-hidden="true">
        <path
          d="M8 40V30c0-3 2-5 5-6l12-3 14-11c2-2 5-3 8-3h36c3 0 6 1 8 3l12 12 6 2c3 1 5 4 5 7v9"
          stroke="currentColor"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path d="M8 40h106" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        <circle cx="32" cy="42" r="8" fill="white" stroke="currentColor" stroke-width="3" />
        <circle cx="92" cy="42" r="8" fill="white" stroke="currentColor" stroke-width="3" />
        <path d="M44 12h16v12H34l10-12Zm22 0h18l10 12H66V12Z" fill="currentColor" opacity=".18" />
      </svg>
    </div>

    <div class="flex flex-1 flex-col p-4">
      <h3 class="font-display text-lg font-semibold text-brand-950">{{ props.option.vehicleType.name }}</h3>
      <p v-if="props.option.vehicleType.description" class="mt-0.5 text-xs text-brand-900/70">
        {{ props.option.vehicleType.description }}
      </p>
      <ul class="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-brand-800">
        <li class="rounded-full bg-brand-50 px-2 py-0.5">{{ props.option.vehicleType.maxPassengers }} passengers</li>
        <li class="rounded-full bg-brand-50 px-2 py-0.5">{{ props.option.vehicleType.maxLuggage }} suitcases</li>
      </ul>

      <div class="mt-auto pt-4">
        <p class="text-[11px] text-brand-900/60">{{ props.tripType === 'ROUND_TRIP' ? 'Round trip total' : 'One way' }}</p>
        <p class="font-display text-2xl font-bold text-brand-950">
          {{ formatUsd(props.option.price) }} <span class="font-sans text-xs font-medium text-brand-900/60">USD</span>
        </p>
        <button
          type="button"
          class="mt-3 h-10 w-full rounded-xl text-sm font-bold transition"
          :class="
            props.selected
              ? 'bg-brand-600 text-white'
              : 'border border-brand-300 bg-white text-brand-700 hover:border-brand-500 hover:bg-brand-50'
          "
          :aria-pressed="props.selected"
          @click="emit('select', props.option.rateId)"
        >
          {{ props.selected ? 'Selected' : 'Select' }}
        </button>
      </div>
    </div>
  </article>
</template>

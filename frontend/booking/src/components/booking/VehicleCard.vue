<script setup lang="ts">
import type { QuoteOption, TripType } from '@/api/booking';
import LuggageIcon from '@/components/icons/LuggageIcon.vue';
import PassengerIcon from '@/components/icons/PassengerIcon.vue';
import { formatUsd } from '@/utils/format';

const props = defineProps<{
  option: QuoteOption;
  tripType: TripType;
  selected: boolean;
}>();

const emit = defineEmits<{ select: [rateId: number] }>();
</script>

<template>
  <!-- Móvil: tarjeta alargada (foto a la izquierda, detalles al centro, precio y botón a la derecha). Desde sm: tarjeta vertical en cuadrícula de 3 columnas. -->
  <article
    class="flex overflow-hidden rounded-2xl border bg-white transition sm:flex-col"
    :class="props.selected ? 'border-brand-500 ring-4 ring-brand-300/30' : 'border-brand-100 hover:border-brand-300'"
  >
    <!-- Las fotos comparten lienzo 2:1 con el vehículo centrado; el recuadro 5:2 solo recorta margen vacío. -->
    <div class="grid w-[34%] shrink-0 place-items-center overflow-hidden bg-fog-100 px-1 sm:aspect-[5/2] sm:w-full sm:px-2">
      <img
        v-if="props.option.vehicleType.imageUrl"
        :src="props.option.vehicleType.imageUrl"
        :alt="props.option.vehicleType.description ?? props.option.vehicleType.name"
        width="800"
        height="400"
        loading="lazy"
        class="h-auto w-full object-contain sm:h-[115%]"
      />
      <svg v-else viewBox="0 0 120 56" class="h-10 w-full sm:h-14 text-brand-600" fill="none" aria-hidden="true">
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

    <div class="flex flex-1 items-center gap-2 px-3 py-2.5 sm:flex-col sm:items-stretch sm:gap-0 sm:px-4 sm:pt-3 sm:pb-3.5">
     <div class="min-w-0 flex-1 sm:flex-none">
      <h3 class="truncate font-display text-base font-semibold text-brand-950 sm:text-lg">{{ props.option.vehicleType.name }}</h3>
      <p v-if="props.option.vehicleType.description" class="mt-0.5 hidden text-xs text-brand-900/70 sm:block">
        {{ props.option.vehicleType.description }}
      </p>
      <ul class="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 text-xs font-semibold text-brand-800">
        <li
          class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5"
          :title="`Up to ${props.option.vehicleType.maxPassengers} passengers`"
        >
          <PassengerIcon class="size-3.5" />
          {{ props.option.vehicleType.maxPassengers }}
          <span class="sr-only">passengers</span>
        </li>
        <li
          class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5"
          :title="`Up to ${props.option.vehicleType.maxLuggage} suitcases`"
        >
          <LuggageIcon class="size-3.5" />
          {{ props.option.vehicleType.maxLuggage }}
          <span class="sr-only">suitcases</span>
        </li>
      </ul>
     </div>

      <div class="w-28 shrink-0 text-right sm:mt-auto sm:w-auto sm:pt-2 sm:text-left">
        <p class="text-[10px] leading-tight text-brand-900/60 sm:text-[11px]">{{ props.tripType === 'ROUND_TRIP' ? 'Round trip total' : 'One way' }}</p>
        <p class="font-display text-base font-bold text-brand-950 sm:text-lg">
          {{ formatUsd(props.option.price) }} <span class="font-sans text-[11px] font-medium text-brand-900/60">USD</span>
        </p>
        <button
          type="button"
          class="mt-1 h-8 w-full rounded-lg text-xs font-bold transition sm:mt-1.5"
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

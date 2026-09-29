<script setup lang="ts">
import { computed } from 'vue';
import type { QuoteResult } from '@/api/booking';
import type { SearchForm } from '@/stores/booking';
import { formatDateOnly } from '@/utils/format';

const props = defineProps<{ quote: QuoteResult; search: SearchForm }>();

const endpoints = computed(() => [
  { label: 'From', endpoint: props.quote.origin },
  { label: 'To', endpoint: props.quote.destination },
]);
</script>

<template>
  <section class="rounded-xl border border-brand-100 bg-white px-4 py-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="grid flex-1 gap-3 sm:grid-cols-2">
        <div v-for="{ label, endpoint } in endpoints" :key="label">
          <p class="text-[11px] font-semibold tracking-wide text-brand-600 uppercase">{{ label }}</p>
          <p class="text-sm font-semibold text-brand-950">{{ endpoint.name }}</p>
          <p v-if="endpoint.zone" class="text-[11px] text-brand-900/60">Zone: {{ endpoint.zone.name }}</p>
          <p v-else class="text-[11px] font-medium text-accent-600">Outside our service zones</p>
        </div>
      </div>

      <dl class="flex flex-wrap gap-x-5 gap-y-1 text-[13px] lg:justify-end">
        <div>
          <dt class="text-[11px] text-brand-900/60">{{ props.quote.tripType === 'ROUND_TRIP' ? 'Round trip' : 'One way' }}</dt>
          <dd class="font-semibold">
            {{ formatDateOnly(props.search.date) }}
            <template v-if="props.quote.tripType === 'ROUND_TRIP' && props.search.returnDate">
              – {{ formatDateOnly(props.search.returnDate) }}
            </template>
          </dd>
        </div>
        <div>
          <dt class="text-[11px] text-brand-900/60">Passengers</dt>
          <dd class="font-semibold">{{ props.quote.passengers }}</dd>
        </div>
        <RouterLink
          :to="{ name: 'home' }"
          class="self-center rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          Edit search
        </RouterLink>
      </dl>
    </div>
  </section>
</template>

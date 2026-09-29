<script setup lang="ts">
import { useId } from 'vue';

const props = defineProps<{ min: number; max: number }>();
const model = defineModel<number>({ required: true });
const labelId = useId();
</script>

<template>
  <div>
    <span :id="labelId" class="mb-1.5 block text-xs font-semibold tracking-wide text-brand-800 uppercase">
      Passengers
    </span>
    <div
      role="group"
      :aria-labelledby="labelId"
      class="flex h-12 items-center justify-between rounded-xl border border-brand-100 bg-white px-1.5 shadow-sm"
    >
      <button
        type="button"
        class="grid size-9 place-items-center rounded-lg text-lg font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-30"
        :disabled="model <= props.min"
        aria-label="Remove passenger"
        @click="model--"
      >
        −
      </button>
      <span class="text-[15px] font-semibold tabular-nums" aria-live="polite">{{ model }}</span>
      <button
        type="button"
        class="grid size-9 place-items-center rounded-lg text-lg font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-30"
        :disabled="model >= props.max"
        aria-label="Add passenger"
        @click="model++"
      >
        +
      </button>
    </div>
  </div>
</template>

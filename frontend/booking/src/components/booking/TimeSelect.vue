<script setup lang="ts">
import { computed } from 'vue';

/**
 * Hora (HH:MM) con dos listas, hora y minutos cada 5, limitadas a [min, max].
 * A diferencia de <input type="time">, las horas fuera del rango no se pueden elegir.
 */
const props = defineProps<{ id: string; min: string; max: string; required?: boolean; selectClass: string }>();
const time = defineModel<string | undefined>();

const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, '0');
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

const minTotal = computed(() => toMinutes(props.min));
const maxTotal = computed(() => toMinutes(props.max));

const hours = computed(() => {
  const list: number[] = [];
  for (let h = Math.floor(minTotal.value / 60); h <= Math.floor(maxTotal.value / 60); h++) list.push(h);
  return list;
});
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const hour = computed(() => (time.value ? Number(time.value.slice(0, 2)) : null));
const minute = computed(() => (time.value ? Number(time.value.slice(3, 5)) : null));

const allowed = (h: number, m: number) => {
  const total = h * 60 + m;
  return total >= minTotal.value && total <= maxTotal.value;
};

function setHour(value: string) {
  if (value === '') return (time.value = undefined);
  const h = Number(value);
  // Conserva los minutos si siguen dentro del rango; si no, el primero permitido de esa hora.
  const m = minute.value !== null && allowed(h, minute.value) ? minute.value : (MINUTES.find((x) => allowed(h, x)) ?? 0);
  time.value = `${pad(h)}:${pad(m)}`;
}

function setMinute(value: string) {
  if (hour.value === null) return;
  time.value = `${pad(hour.value)}:${pad(Number(value))}`;
}
</script>

<template>
  <div class="grid grid-cols-[1fr_auto] gap-2">
    <select
      :id="props.id"
      :value="hour ?? ''"
      :required="props.required"
      :class="props.selectClass"
      aria-label="Hour"
      @change="setHour(($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Hour</option>
      <option v-for="h in hours" :key="h" :value="h">{{ hourLabel(h) }}</option>
    </select>
    <select
      :value="minute ?? ''"
      :disabled="hour === null"
      :class="[props.selectClass, 'w-24']"
      aria-label="Minutes"
      @change="setMinute(($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Min</option>
      <option v-for="m in MINUTES" :key="m" :value="m" :disabled="hour !== null && !allowed(hour, m)">:{{ pad(m) }}</option>
    </select>
  </div>
</template>

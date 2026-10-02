<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchFleet, type FleetVehicle } from '@/api/booking';

/**
 * Flota en la portada. Los datos salen de la base (tipos de vehículo activos),
 * así lo que se muestra aquí coincide con lo que se ofrece al cotizar.
 */
const fleet = ref<FleetVehicle[] | null>(null);
const failed = ref(false);

// Reintentos con espera creciente: si el backend está arrancando o hubo un
// corte momentáneo, la sección aparece en cuanto responde en vez de ocultarse.
const RETRY_DELAYS_MS = [1_000, 3_000, 6_000, 10_000];

onMounted(async () => {
  for (let attempt = 0; ; attempt++) {
    try {
      fleet.value = await fetchFleet();
      return;
    } catch {
      if (attempt >= RETRY_DELAYS_MS.length) {
        failed.value = true;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
});
</script>

<template>
  <!-- Si no se pudo cargar la flota, la sección no aparece (la portada sigue funcionando). -->
  <section v-if="!failed" class="mx-auto max-w-6xl px-4 pt-16 sm:px-6" aria-labelledby="fleet-title">
    <div class="max-w-2xl">
      <h2 id="fleet-title" class="font-display text-3xl leading-tight font-bold text-balance text-brand-950 sm:text-4xl">
        A vehicle for every group
      </h2>
      <p class="mt-3 text-base text-brand-900/75">
        Every transfer is private: the vehicle is just for you and your group. Choose it by the number of people and
        suitcases.
      </p>
    </div>

    <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" :aria-busy="!fleet">
      <!-- Mientras carga: tarjetas vacías del mismo tamaño para que la página no brinque. -->
      <template v-if="!fleet">
        <li v-for="n in 3" :key="n" class="overflow-hidden rounded-2xl border border-brand-100 bg-white" aria-hidden="true">
          <div class="aspect-[2/1] animate-pulse bg-fog-100 motion-reduce:animate-none" />
          <div class="space-y-2 p-5">
            <div class="h-5 w-1/3 rounded bg-fog-100" />
            <div class="h-4 w-2/3 rounded bg-fog-100" />
          </div>
        </li>
      </template>

      <li
        v-for="vehicle in fleet ?? []"
        :key="vehicle.code"
        class="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white"
      >
        <div class="grid aspect-[2/1] place-items-center bg-fog-100 px-3">
          <img
            v-if="vehicle.imageUrl"
            :src="vehicle.imageUrl"
            :alt="vehicle.description ?? vehicle.name"
            width="800"
            height="400"
            loading="lazy"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="flex flex-1 flex-col p-5">
          <div class="flex items-baseline justify-between gap-3">
            <h3 class="font-display text-xl font-semibold text-brand-950">{{ vehicle.name }}</h3>
            <p class="shrink-0 text-sm font-semibold text-brand-600">
              Up to {{ vehicle.maxPassengers }} {{ vehicle.maxPassengers === 1 ? 'person' : 'people' }}
            </p>
          </div>
          <p v-if="vehicle.description" class="mt-0.5 text-sm text-brand-900/65">{{ vehicle.description }}</p>
          <ul class="mt-3 flex flex-wrap gap-1.5 text-xs font-medium text-brand-800">
            <li class="rounded-full bg-brand-50 px-2.5 py-1">{{ vehicle.maxPassengers }} seats</li>
            <li class="rounded-full bg-brand-50 px-2.5 py-1">{{ vehicle.maxLuggage }} suitcases</li>
            <li class="rounded-full bg-brand-50 px-2.5 py-1">Private service</li>
          </ul>
        </div>
      </li>
    </ul>
  </section>
</template>

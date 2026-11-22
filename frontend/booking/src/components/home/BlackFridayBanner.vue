<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Aviso del cupón BFRIDAY en la portada. Los montos y fechas deben coincidir con el cupón del panel
 * (Cupones): 5 USD en one way, 10 USD en round trip, hasta el 27 de nov de 2026, 100 usos, uno por correo.
 * Se oculta solo cuando el cupón vence (hora de Cancún).
 */
const CODE = 'BFRIDAY';
const ONE_WAY_OFF = 5;
const ROUND_TRIP_OFF = 10;
const ENDS = '2026-11-27';

// Visible al renderizar (también en el prerender); al montar se oculta si ya venció.
const visible = ref(true);
const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun' }).format(new Date());
  if (today > ENDS) visible.value = false;
});
onUnmounted(() => clearTimeout(timer));

async function copyCode() {
  try {
    await navigator.clipboard.writeText(CODE);
    copied.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Sin permiso para el portapapeles: el código sigue visible para copiarlo a mano.
  }
}

function goToSearch() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <section v-if="visible" class="mx-auto max-w-7xl px-4 pt-8 sm:px-6" aria-labelledby="bf-title">
    <div
      class="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-6 py-6 text-white shadow-lg shadow-brand-950/20 sm:px-8"
    >
      <!-- Destello suave de fondo -->
      <div class="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-amber-400/20 blur-2xl" aria-hidden="true" />

      <div class="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p class="text-xs font-semibold tracking-[0.2em] text-amber-300 uppercase">Black Friday · Ends Nov 27</p>
          <h2 id="bf-title" class="mt-1 font-display text-2xl leading-tight font-bold text-balance sm:text-3xl">
            Save on your airport transfer
          </h2>
          <p class="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
            Use code <strong class="font-bold text-amber-300">{{ CODE }}</strong> at checkout and get
            <strong class="text-amber-300">${{ ONE_WAY_OFF }} off</strong> a one way transfer or
            <strong class="text-amber-300">${{ ROUND_TRIP_OFF }} off</strong> a round trip.
          </p>
          <p class="mt-2 text-xs text-white/70">
            Promo ends Nov 27, 2026. One use per email.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <button
            type="button"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400/80 bg-white/10 px-5 font-mono text-lg font-bold tracking-widest text-amber-300 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            :aria-label="copied ? 'Code copied' : `Copy code ${CODE}`"
            @click="copyCode"
          >
            {{ CODE }}
            <span class="font-sans text-xs font-semibold tracking-normal text-white/80" aria-live="polite">
              {{ copied ? '✔ Copied' : 'Copy' }}
            </span>
          </button>
          <button
            type="button"
            class="inline-flex h-12 items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-bold text-brand-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            @click="goToSearch"
          >
            Book your transfer
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

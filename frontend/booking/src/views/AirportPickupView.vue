<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { AIRPORT_TERMINALS } from '@/content/airport';

const route = useRoute();

/** Con /airport-pickup#terminal-3 la página baja directo a esa terminal. */
async function scrollToTerminal(): Promise<void> {
  if (!route.hash) return;
  await nextTick();
  document.querySelector(route.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(scrollToTerminal);
watch(() => route.hash, scrollToTerminal);
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p class="text-sm font-semibold tracking-[0.2em] text-brand-600 uppercase">Cancun Airport (CUN)</p>
      <h1 class="mt-2 font-display text-3xl leading-tight font-bold text-brand-950 sm:text-4xl">Meet your driver at Cancun Airport</h1>
      <p class="mt-3 max-w-2xl text-base text-brand-900/75">
        Your driver waits for you at arrivals, holding a sign with your name. Choose your terminal to see the path from baggage claim to the
        pickup area.
      </p>

      <!-- Atajos a cada terminal -->
      <nav class="mt-6 flex flex-wrap gap-2" aria-label="Terminals">
        <a
          v-for="terminal in AIRPORT_TERMINALS"
          :key="terminal.id"
          :href="`#${terminal.id}`"
          class="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-500 hover:bg-brand-50"
        >
          {{ terminal.name }}
        </a>
      </nav>
      <p class="mt-3 text-sm text-brand-900/65">Not sure which terminal? It is shown with your flight on your reservation and depends on your airline.</p>

      <div class="mt-8 space-y-8">
        <section
          v-for="terminal in AIRPORT_TERMINALS"
          :id="terminal.id"
          :key="terminal.id"
          class="scroll-mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white"
        >
          <div class="grid gap-6 p-5 sm:p-6 md:grid-cols-5">
            <div class="md:col-span-2">
              <h2 class="font-display text-2xl font-bold text-brand-950">{{ terminal.name }}</h2>
              <ol class="mt-4 space-y-3">
                <li v-for="(step, index) in terminal.steps" :key="step" class="flex gap-3">
                  <span class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{{ index + 1 }}</span>
                  <span class="pt-0.5 text-[15px] leading-relaxed text-brand-900/85">{{ step }}</span>
                </li>
              </ol>
            </div>
            <figure class="md:col-span-3">
              <img
                :src="terminal.map"
                :alt="terminal.mapAlt"
                width="900"
                height="1100"
                class="mx-auto max-h-[34rem] w-auto rounded-2xl border border-brand-100 bg-white object-contain"
              />
              <figcaption class="mt-2 text-center text-xs text-brand-900/60">The red dashed line shows the path to follow.</figcaption>
            </figure>
          </div>
        </section>
      </div>

      <!-- Si no lo encuentra -->
      <section class="mt-10 rounded-3xl bg-brand-50 p-6 sm:p-8">
        <h2 class="font-display text-xl font-bold text-brand-950">Cannot find your driver?</h2>
        <p class="mt-2 max-w-2xl text-[15px] leading-relaxed text-brand-900/80">
          Stay at the pickup area and
          <RouterLink :to="{ name: 'contact' }" class="font-semibold underline underline-offset-2 hover:text-brand-700">contact us</RouterLink>
          with your reservation code. If your flight is delayed, we wait up to 90 minutes after it lands. More details are in our
          <RouterLink :to="{ name: 'faq' }" class="font-semibold underline underline-offset-2 hover:text-brand-700">FAQ</RouterLink>.
        </p>
      </section>
    </main>
  </div>
</template>

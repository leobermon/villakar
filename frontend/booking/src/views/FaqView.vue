<script setup lang="ts">
import SiteHeader from '@/components/layout/SiteHeader.vue';
import { FAQ_ITEMS } from '@/content/faq';
</script>

<template>
  <div>
    <SiteHeader />
    <main class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p class="text-sm font-semibold tracking-[0.2em] text-brand-600 uppercase">Help center</p>
      <h1 class="mt-2 font-display text-3xl leading-tight font-bold text-brand-950 sm:text-4xl">Frequently asked questions</h1>
      <p class="mt-3 max-w-2xl text-base text-brand-900/75">
        Everything you need to know about booking a private transfer with VillaKar Transfers in Cancun and the Riviera Maya.
      </p>

      <!-- <details> nativo: se abre y cierra sin JavaScript y todo el texto queda en el HTML para Google. -->
      <div class="mt-8 space-y-3">
        <details
          v-for="item in FAQ_ITEMS"
          :key="item.question"
          class="group rounded-2xl border border-brand-100 bg-white open:border-brand-300 open:shadow-sm"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-display text-base font-semibold text-brand-950 select-none marker:hidden focus-visible:ring-4 focus-visible:ring-brand-300/40 focus-visible:outline-none sm:text-lg [&::-webkit-details-marker]:hidden"
          >
            <span>{{ item.question }}</span>
            <svg
              viewBox="0 0 20 20"
              class="size-5 shrink-0 text-brand-600 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </summary>
          <p class="px-5 pb-5 text-[15px] leading-relaxed text-brand-900/80">{{ item.answer }}</p>
        </details>
      </div>

      <section class="mt-10 rounded-3xl bg-brand-950 px-6 py-8 text-center text-white sm:px-10">
        <h2 class="font-display text-2xl font-semibold">Still have questions?</h2>
        <p class="mx-auto mt-2 max-w-xl text-sm text-white/75">
          Tell us about your trip and we will get back to you. You can also check your price right now.
        </p>
        <div class="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <RouterLink
            :to="{ name: 'contact' }"
            class="inline-flex h-11 items-center rounded-xl bg-white px-6 text-sm font-bold text-brand-900 hover:bg-brand-50"
          >
            Contact us
          </RouterLink>
          <RouterLink
            :to="{ name: 'home' }"
            class="inline-flex h-11 items-center rounded-xl border border-white/30 px-6 text-sm font-bold text-white hover:bg-white/10"
          >
            Check your price
          </RouterLink>
        </div>
      </section>

      <p class="mt-8 text-center text-xs text-brand-900/60">
        See also our
        <RouterLink :to="{ name: 'terms' }" class="font-semibold underline underline-offset-2 hover:text-brand-800">Terms and Conditions</RouterLink>.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Fondo de la portada en forma de slider: varias fotos que se funden entre sí.
 * Para agregar o quitar fotos, edita SLIDES (los archivos viven en public/hero).
 * Con "reducir movimiento" activado en el sistema no cambia sola.
 */
interface Slide {
  src: string;
  /** Qué parte de la foto queda a la vista al recortarla (object-position). */
  position: string;
  /** Menor que 1 = alejar la foto; lo que sobra se rellena con la misma foto desenfocada. */
  zoom?: number;
}

const SLIDES: Slide[] = [
  { src: '/hero/slide-family-beach.jpg', position: '68% center' },
  { src: '/hero/slide-airport.jpg', position: '55% center' },
  { src: '/hero/slide-chichen.jpg', position: '60% center' },
];

const INTERVAL_MS = 6000;

const current = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function goTo(index: number) {
  current.value = (index + SLIDES.length) % SLIDES.length;
}

function start() {
  stop();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  timer = setInterval(() => goTo(current.value + 1), INTERVAL_MS);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

/** Al elegir un punto manualmente se reinicia el reloj para no saltar enseguida. */
function pick(index: number) {
  goTo(index);
  start();
}

// Sin gastar vueltas cuando la pestaña no se ve.
function onVisibility() {
  if (document.hidden) stop();
  else start();
}

onMounted(() => {
  start();
  document.addEventListener('visibilitychange', onVisibility);
});

onBeforeUnmount(() => {
  stop();
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <div class="absolute inset-0">
    <div
      v-for="(slide, i) in SLIDES"
      :key="slide.src"
      class="absolute inset-0 overflow-hidden transition-opacity duration-[1400ms] ease-in-out motion-reduce:transition-none"
      :class="i === current ? 'opacity-100' : 'opacity-0'"
      :aria-hidden="i !== current"
    >
      <!-- Si la foto está alejada, el resto del recuadro se rellena con ella misma desenfocada. -->
      <img
        v-if="slide.zoom && slide.zoom < 1"
        :src="slide.src"
        alt=""
        class="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        :style="{ objectPosition: slide.position }"
      />
      <img
        :src="slide.src"
        alt=""
        :fetchpriority="i === 0 ? 'high' : 'auto'"
        class="absolute inset-0 h-full w-full object-cover"
        :style="{ objectPosition: slide.position, transform: slide.zoom ? `scale(${slide.zoom})` : undefined }"
      />
    </div>

    <!-- Puntos: justo encima de donde el buscador se encima con la portada. -->
    <div class="absolute right-4 bottom-36 z-10 flex gap-2 sm:right-6 lg:right-10" role="group" aria-label="Hero photos">
      <button
        v-for="(slide, i) in SLIDES"
        :key="slide.src"
        type="button"
        class="h-2.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        :class="i === current ? 'w-7 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/80'"
        :aria-label="`Show photo ${i + 1}`"
        :aria-current="i === current"
        @click="pick(i)"
      />
    </div>
  </div>
</template>

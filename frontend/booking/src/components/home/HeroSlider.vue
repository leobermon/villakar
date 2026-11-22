<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ResponsiveImage from '@/components/ResponsiveImage.vue';

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

/** Fotos normales de la portada. */
const REGULAR_SLIDES: Slide[] = [
  { src: '/hero/slide-family-beach.jpg', position: '68% center' },
  { src: '/hero/slide-airport.jpg', position: '55% center' },
  { src: '/hero/slide-chichen.jpg', position: '60% center' },
];

/**
 * Copias de las mismas fotos con el cartel de Black Friday ($10 USD off, código BFRIDAY) dibujado encima.
 * Se muestran hasta que vence el cupón (BLACK_FRIDAY_ENDS, hora de Cancún) y después vuelven las normales.
 */
const BLACK_FRIDAY_SLIDES: Slide[] = [
  { src: '/hero/slide-bf-family-beach.jpg', position: '68% center' },
  { src: '/hero/slide-bf-airport.jpg', position: '55% center' },
  { src: '/hero/slide-bf-chichen.jpg', position: '60% center' },
];
const BLACK_FRIDAY_ENDS = '2026-11-27';

/**
 * El cartel va dibujado dentro de la foto. En pantallas chicas la foto se recorta mucho y el título
 * queda encima, así que ahí se usan las fotos normales (el segmento de Black Friday de la portada cubre la promo).
 */
const PROMO_MIN_WIDTH = '(min-width: 1024px)';

// Con cartel al renderizar (también en el prerender); al montar se ajusta según cupón vigente y tamaño de pantalla.
const SLIDES = ref<Slide[]>(BLACK_FRIDAY_SLIDES);

const INTERVAL_MS = 6000;

const current = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function goTo(index: number) {
  current.value = (index + SLIDES.value.length) % SLIDES.value.length;
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
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun' }).format(new Date());
  if (today > BLACK_FRIDAY_ENDS || !window.matchMedia(PROMO_MIN_WIDTH).matches) SLIDES.value = REGULAR_SLIDES;
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
      <ResponsiveImage
        v-if="slide.zoom && slide.zoom < 1"
        :src="slide.src"
        alt=""
        class="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        :style="{ objectPosition: slide.position }"
      />
      <ResponsiveImage
        :src="slide.src"
        alt=""
        :fetchpriority="i === 0 ? 'high' : 'low'"
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

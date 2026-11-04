<script setup lang="ts">
/**
 * Foto que baja en el tamaño que le toca al dispositivo: WebP en varios anchos (los genera
 * scripts/build-image-variants.mjs) y el JPG de respaldo. Si la foto no tiene versiones, es una <img> normal.
 * Los atributos que no son props (class, style, width, loading, fetchpriority…) pasan a la <img>.
 */
import { computed } from 'vue';
import variants from '@/content/imageVariants.json';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Ruta del JPG dentro de public (por ejemplo /hero/slide-airport.jpg). */
  src: string;
  alt: string;
  /** Ancho que ocupa la foto en pantalla (atributo `sizes`); sin esto el navegador supone 100vw. */
  sizes?: string;
}>();

const widths = computed(() => (variants as Record<string, number[]>)[props.src] ?? []);
const srcset = computed(() =>
  widths.value.map((width) => `${props.src.replace(/\.jpe?g$/i, '')}-${width}.webp ${width}w`).join(', '),
);
</script>

<template>
  <picture v-if="widths.length" class="contents">
    <source type="image/webp" :srcset="srcset" :sizes="sizes ?? '100vw'" />
    <img :src="src" :alt="alt" v-bind="$attrs" />
  </picture>
  <img v-else :src="src" :alt="alt" v-bind="$attrs" />
</template>

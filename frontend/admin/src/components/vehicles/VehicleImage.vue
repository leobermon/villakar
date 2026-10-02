<script setup lang="ts">
import { ref, watch } from 'vue';
import { vehicleImageUrl } from '@/config/catalog';

/**
 * Foto de un tipo de vehículo en su lienzo 2:1. Las fotos viven en el sitio
 * público: si no carga (sitio apagado, ruta mal escrita), se dice en vez de
 * dejar un hueco vacío.
 */
const props = defineProps<{ imageUrl: string | null; alt?: string }>();

const failed = ref(false);
watch(() => props.imageUrl, () => (failed.value = false));
</script>

<template>
  <div class="grid aspect-[2/1] w-full place-items-center bg-fog-100 px-3">
    <img
      v-if="props.imageUrl && !failed"
      :src="vehicleImageUrl(props.imageUrl) ?? ''"
      :alt="props.alt ?? ''"
      width="800"
      height="400"
      loading="lazy"
      class="h-full w-full object-contain"
      @error="failed = true"
    />
    <span v-else class="px-4 text-center text-xs text-brand-900/50">
      {{ props.imageUrl ? 'Foto no disponible (¿está encendido el sitio de reservas?)' : 'Sin foto' }}
    </span>
  </div>
</template>

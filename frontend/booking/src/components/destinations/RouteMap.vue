<script setup lang="ts">
import { computed } from 'vue';
import { AIRPORT, type Destination } from '@/content/destinations';
import { DESTINATION_MAPS } from '@/content/destinationMaps';

/**
 * Mapa de la ruta desde el aeropuerto. La base es una imagen (public/destinations/maps, hecha con mosaicos de
 * OpenStreetMap) y encima va la ruta real en carretera y las etiquetas, en las mismas coordenadas de la imagen.
 * No usa Google Maps ni ningún servicio externo al cargar la página.
 */
const props = defineProps<{ destination: Destination }>();

const map = computed(() => DESTINATION_MAPS[props.destination.slug]!);
const label = computed(() => props.destination.mapLabel ?? props.destination.shortName);

/** Ancho aproximado de una etiqueta (texto de 27 px en negritas) para dibujar su recuadro. */
const chipWidth = (text: string) => Math.round(text.length * 15.5 + 52);

interface Chip {
  text: string;
  x: number;
  y: number;
  width: number;
}

/** Recuadro blanco junto a un marcador: del lado donde cabe dentro de la imagen. */
function chipFor(text: string, [px, py]: [number, number], gap: number): Chip {
  const width = chipWidth(text);
  const right = px + gap + width <= map.value.width - 12;
  const x = right ? px + gap : Math.max(12, px - gap - width);
  const y = Math.min(Math.max(py - 24, 12), map.value.height - 60);
  return { text, x, y, width };
}

const airportChip = computed(() => chipFor(AIRPORT.name, map.value.airport, 34));
const destChip = computed(() => chipFor(label.value, map.value.dest, 34));
</script>

<template>
  <figure>
    <svg
      :viewBox="`0 0 ${map.width} ${map.height}`"
      class="block h-auto w-full overflow-hidden rounded-2xl bg-fog-100"
      role="img"
      :aria-label="`Route map from ${AIRPORT.name} to ${props.destination.name}`"
    >
      <defs>
        <filter id="route-map-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#023047" flood-opacity="0.3" />
        </filter>
      </defs>

      <image :href="`/destinations/maps/${map.file}`" :width="map.width" :height="map.height" />

      <!-- Ruta: borde blanco y línea azul, como en las apps de mapas -->
      <path :d="map.route" fill="none" stroke="#ffffff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" />
      <path :d="map.route" fill="none" stroke="#1a73e8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Aeropuerto -->
      <g :transform="`translate(${map.airport[0]} ${map.airport[1]})`" filter="url(#route-map-shadow)">
        <circle r="24" fill="#023047" stroke="#ffffff" stroke-width="5" />
        <path
          d="M0 -12 L2.8 -3.6 L12 2 V5 L2.8 2.7 L2 9 L5 11 V12.8 L0 11.4 L-5 12.8 V11 L-2 9 L-2.8 2.7 L-12 5 V2 L-2.8 -3.6 Z"
          fill="#ffffff"
        />
      </g>
      <g filter="url(#route-map-shadow)">
        <rect :x="airportChip.x" :y="airportChip.y" :width="airportChip.width" height="48" rx="24" fill="#ffffff" />
        <text :x="airportChip.x + airportChip.width / 2" :y="airportChip.y + 32" text-anchor="middle" font-size="27" font-weight="700" fill="#023047">
          {{ airportChip.text }}
        </text>
      </g>

      <!-- Destino: marcador tipo gota -->
      <g :transform="`translate(${map.dest[0]} ${map.dest[1]})`" filter="url(#route-map-shadow)">
        <path
          d="M0 0 C-22 -26 -30 -38 -30 -52 A30 30 0 1 1 30 -52 C30 -38 22 -26 0 0 Z"
          fill="#0f6f8b"
          stroke="#ffffff"
          stroke-width="5"
          stroke-linejoin="round"
        />
        <circle cy="-52" r="11" fill="#ffffff" />
      </g>
      <g filter="url(#route-map-shadow)">
        <rect :x="destChip.x" :y="destChip.y - 30" :width="destChip.width" height="48" rx="24" fill="#ffffff" />
        <text :x="destChip.x + destChip.width / 2" :y="destChip.y + 2" text-anchor="middle" font-size="27" font-weight="700" fill="#023047">
          {{ destChip.text }}
        </text>
      </g>
    </svg>
    <figcaption class="mt-2 text-xs text-brand-900/60">
      Route: about {{ map.km }} km by road. Map data ©
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-brand-800">OpenStreetMap contributors</a>.
    </figcaption>
  </figure>
</template>

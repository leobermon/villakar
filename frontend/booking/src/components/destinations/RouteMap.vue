<script setup lang="ts">
import { computed } from 'vue';
import { AIRPORT, COAST, TOWNS, type Destination, type LngLat } from '@/content/destinations';

/**
 * Mapa esquemático de la ruta desde el aeropuerto, dibujado en SVG (sin Google Maps ni servicios externos).
 * La costa y las carreteras están simplificadas: sirven para ubicar el destino y ver la dirección del viaje.
 */
const props = defineProps<{ destination: Destination }>();

const W = 480;
const H = 440;

const projection = computed(() => {
  const points = props.destination.route;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const kx = Math.cos((centerLat * Math.PI) / 180);
  // Márgenes proporcionales al tamaño de la ruta, con un mínimo para que rutas cortas no queden pegadas.
  const spanX = Math.max((maxLng - minLng) * kx, 0.05) * 1.6;
  const spanY = Math.max(maxLat - minLat, 0.05) * 1.35;
  const scale = Math.min(W / spanX, H / spanY);
  return (point: LngLat): [number, number] => [
    W / 2 + (point[0] - centerLng) * kx * scale,
    H / 2 - (point[1] - centerLat) * scale,
  ];
});

const toPath = (points: LngLat[]) =>
  points
    .map((point, index) => {
      const [x, y] = projection.value(point);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

/** Tierra: la costa y, hacia el oeste, el resto del recuadro. */
const landPath = computed(() => {
  const coast = COAST.map((point) => projection.value(point));
  const first = coast[0];
  const last = coast[coast.length - 1];
  return `${toPath(COAST)} L${(last[0] - 4000).toFixed(1)} ${last[1].toFixed(1)} L${(first[0] - 4000).toFixed(1)} ${first[1].toFixed(1)} Z`;
});

const coastPath = computed(() => toPath(COAST));
const routePath = computed(() => toPath(props.destination.route));

const airport = computed(() => projection.value(AIRPORT.coord));
const target = computed(() => projection.value(props.destination.coord));

/** Poblaciones visibles en el recuadro, sin repetir la del destino ni encimarse con los marcadores. */
const towns = computed(() =>
  TOWNS.map((town) => ({ name: town.name, xy: projection.value(town.coord) })).filter(({ name, xy }) => {
    const inside = xy[0] > 30 && xy[0] < W - 30 && xy[1] > 24 && xy[1] < H - 24;
    const near = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 46;
    return inside && !near(xy, target.value) && !near(xy, airport.value) && name !== props.destination.shortName;
  }),
);

/** Etiqueta del aeropuerto: a la izquierda (tierra) para no tapar la ruta ni el mar. */
const airportLabelRight = computed(() => airport.value[0] < 150);
</script>

<template>
  <figure>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="block h-auto w-full rounded-2xl"
      role="img"
      :aria-label="`Route map from ${AIRPORT.name} to ${props.destination.name}`"
    >
      <defs>
        <clipPath id="route-map-clip"><rect :width="W" :height="H" rx="16" /></clipPath>
      </defs>
      <g clip-path="url(#route-map-clip)">
        <!-- Mar -->
        <rect :width="W" :height="H" fill="#bfe3f2" />
        <!-- Tierra y costa -->
        <path :d="landPath" fill="#f1ead9" />
        <path :d="coastPath" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" opacity="0.85" />
        <path :d="coastPath" fill="none" stroke="#d6c9a8" stroke-width="1.5" stroke-linejoin="round" />

        <text :x="W - 20" :y="H - 22" text-anchor="end" font-size="16" font-style="italic" letter-spacing="2" fill="#3d86a8" opacity="0.9">
          Caribbean Sea
        </text>

        <!-- Poblaciones de referencia -->
        <g font-size="14.5" fill="#3f647c">
          <g v-for="town in towns" :key="town.name">
            <circle :cx="town.xy[0]" :cy="town.xy[1]" r="3.5" fill="#8aa3b5" stroke="#fff" stroke-width="1.5" />
            <text
              :x="town.xy[0] - 9"
              :y="town.xy[1] + 4"
              text-anchor="end"
              stroke="#f1ead9"
              stroke-width="3.5"
              paint-order="stroke"
              stroke-linejoin="round"
            >
              {{ town.name }}
            </text>
          </g>
        </g>

        <!-- Ruta -->
        <path :d="routePath" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
        <path :d="routePath" fill="none" stroke="#0f6f8b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          :d="routePath"
          fill="none"
          stroke="#ffffff"
          stroke-width="1.6"
          stroke-dasharray="1 9"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.9"
        />

        <!-- Aeropuerto -->
        <g :transform="`translate(${airport[0]} ${airport[1]})`">
          <circle r="13" fill="#023047" stroke="#fff" stroke-width="3" />
          <path
            d="M0 -7 L1.6 -2 L7 1.2 V3 L1.6 1.6 L1.2 5.2 L3 6.4 V7.4 L0 6.6 L-3 7.4 V6.4 L-1.2 5.2 L-1.6 1.6 L-7 3 V1.2 L-1.6 -2 Z"
            fill="#fff"
          />
          <text
            :x="airportLabelRight ? 20 : -20"
            y="5"
            :text-anchor="airportLabelRight ? 'start' : 'end'"
            font-size="15.5"
            font-weight="700"
            fill="#023047"
            stroke="#f1ead9"
            stroke-width="4"
            paint-order="stroke"
            stroke-linejoin="round"
          >
            {{ AIRPORT.name }}
          </text>
        </g>

        <!-- Destino -->
        <g :transform="`translate(${target[0]} ${target[1]})`">
          <path d="M0 0 C-14 -14 -16 -22 -16 -27 A16 16 0 1 1 16 -27 C16 -22 14 -14 0 0 Z" fill="#219ebc" stroke="#fff" stroke-width="3" />
          <circle cy="-27" r="6" fill="#fff" />
          <text
            x="-22"
            y="-24"
            text-anchor="end"
            font-size="16.5"
            font-weight="700"
            fill="#023047"
            stroke="#f1ead9"
            stroke-width="4"
            paint-order="stroke"
            stroke-linejoin="round"
          >
            {{ props.destination.mapLabel ?? props.destination.shortName }}
          </text>
        </g>

        <!-- Norte -->
        <g transform="translate(34 40)" fill="#023047">
          <path d="M0 -20 L7 6 L0 1 L-7 6 Z" />
          <text y="22" text-anchor="middle" font-size="12" font-weight="700">N</text>
        </g>
      </g>
    </svg>
    <figcaption class="mt-2 text-xs text-brand-900/60">
      Simplified route map, not to scale. Your driver follows the fastest road for the day.
    </figcaption>
  </figure>
</template>

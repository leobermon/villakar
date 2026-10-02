<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from '@/utils/leaflet';
import type { EditingZone, LngLat, Zone } from '@/types/catalog';

/**
 * Mapa de zonas (Leaflet + OpenStreetMap; dibujo y edición con Geoman).
 * Solo pinta y reporta: el padre decide qué se guarda.
 * - mode 'view': clic en una zona → `select`.
 * - mode 'draw': el usuario traza un polígono nuevo → `update:boundary`.
 * - mode 'test': clic en el mapa → `testPoint` (qué zona le toca a ese punto).
 * - `editing`: zona en edición; su polígono tiene vértices arrastrables.
 */
const props = defineProps<{
  zones: Zone[];
  selectedId: number | null;
  editing: EditingZone | null;
  mode: 'view' | 'draw' | 'test';
  airport?: LngLat;
  testPoint?: LngLat | null;
}>();

const emit = defineEmits<{
  select: [zoneId: number];
  'update:boundary': [boundary: LngLat[]];
  testPoint: [point: LngLat];
}>();

const container = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
const zoneLayers = L.layerGroup();
let editLayer: L.Polygon | null = null;
let testMarker: L.CircleMarker | null = null;

// Leaflet usa [lat, lng]; el catálogo guarda [lng, lat] como GeoJSON/backend.
const toLatLngs = (ring: LngLat[]) => ring.map(([lng, lat]) => L.latLng(lat, lng));
const fromLayer = (layer: L.Polygon): LngLat[] =>
  (layer.getLatLngs()[0] as L.LatLng[]).map((point) => [point.lng, point.lat] as LngLat);

onMounted(async () => {
  if (!container.value) return;
  map = L.map(container.value, { zoomControl: true, attributionControl: true }).setView([20.85, -87.05], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  zoneLayers.addTo(map);

  if (props.airport) {
    L.circleMarker(L.latLng(props.airport[1], props.airport[0]), { radius: 6, color: '#023e8a', weight: 2, fillColor: '#ffffff', fillOpacity: 1 })
      .bindTooltip('Aeropuerto CUN')
      .addTo(map);
  }

  // Geoman: sin su barra de herramientas; los modos se controlan desde la vista.
  map.pm.setLang('es');
  map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: true, snapDistance: 12 });
  map.on('pm:create', (event) => {
    const layer = event.layer as L.Polygon;
    const boundary = fromLayer(layer);
    layer.remove();
    emit('update:boundary', boundary);
  });
  map.on('click', (event: L.LeafletMouseEvent) => {
    if (props.mode === 'test') emit('testPoint', [event.latlng.lng, event.latlng.lat]);
  });

  drawZones();
  syncEditing();
  syncMode();
  syncTestPoint();
  fitAll();
  // Si el contenedor cambió de tamaño al montarse (layout flex), recalcula.
  await nextTick();
  map.invalidateSize();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

function drawZones() {
  zoneLayers.clearLayers();
  for (const zone of props.zones) {
    // La zona en edición se pinta aparte, como capa editable.
    if (props.editing && props.editing.zoneId === zone.id) continue;
    const selected = zone.id === props.selectedId;
    const polygon = L.polygon(toLatLngs(zone.boundary), {
      color: zone.color,
      weight: selected ? 3 : 1.5,
      opacity: zone.isActive ? 0.9 : 0.4,
      fillOpacity: selected ? 0.3 : zone.isActive ? 0.12 : 0.04,
      dashArray: zone.isActive ? undefined : '6 6',
      pmIgnore: true,
      bubblingMouseEvents: true,
    });
    polygon.bindTooltip(`${zone.name}${zone.isActive ? '' : ' (inactiva)'} · prioridad ${zone.priority}`, { sticky: true });
    polygon.on('click', (event) => {
      if (props.mode !== 'view') return;
      L.DomEvent.stopPropagation(event);
      emit('select', zone.id);
    });
    polygon.addTo(zoneLayers);
    if (selected) polygon.bringToFront();
  }
}

function syncEditing() {
  editLayer?.remove();
  editLayer = null;
  if (!map || !props.editing || props.editing.boundary.length < 3) {
    drawZones();
    return;
  }
  editLayer = L.polygon(toLatLngs(props.editing.boundary), { color: props.editing.color, weight: 3, fillOpacity: 0.25 }).addTo(map);
  editLayer.pm.enable({ allowSelfIntersection: false, draggable: true });
  const report = () => editLayer && emit('update:boundary', fromLayer(editLayer));
  editLayer.on('pm:edit', report);
  editLayer.on('pm:dragend', report);
  drawZones();
}

function syncMode() {
  if (!map) return;
  if (props.mode === 'draw') {
    map.pm.enableDraw('Polygon', {
      pathOptions: { color: '#0077b6', weight: 3, fillOpacity: 0.2 },
      templineStyle: { color: '#0077b6' },
      hintlineStyle: { color: '#0077b6', dashArray: '5 5' },
      finishOn: undefined,
    });
  } else {
    map.pm.disableDraw();
  }
  container.value?.classList.toggle('cursor-crosshair', props.mode === 'test');
}

function syncTestPoint() {
  testMarker?.remove();
  testMarker = null;
  if (!map || !props.testPoint) return;
  const [lng, lat] = props.testPoint;
  testMarker = L.circleMarker(L.latLng(lat, lng), { radius: 8, color: '#e53e3e', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }).addTo(map);
}

/** Encuadra todas las zonas (o una sola). */
function fitAll() {
  if (!map || !props.zones.length) return;
  const bounds = L.latLngBounds(props.zones.flatMap((zone) => toLatLngs(zone.boundary)));
  map.fitBounds(bounds, { padding: [24, 24] });
}

function focusZone(zoneId: number) {
  const zone = props.zones.find((candidate) => candidate.id === zoneId);
  if (!map || !zone) return;
  map.fitBounds(L.latLngBounds(toLatLngs(zone.boundary)), { padding: [48, 48], maxZoom: 14 });
}

watch(() => props.zones, drawZones, { deep: true });
watch(() => props.selectedId, drawZones);
watch(() => props.editing?.key, syncEditing);
// Cambio de color en el formulario: se aplica sin recrear la capa (conserva los vértices).
watch(
  () => props.editing?.color,
  (color) => color && editLayer?.setStyle({ color }),
);
watch(() => props.mode, syncMode);
watch(() => props.testPoint, syncTestPoint);

defineExpose({ fitAll, focusZone, invalidateSize: () => map?.invalidateSize() });
</script>

<template>
  <div ref="container" class="h-full w-full" role="application" aria-label="Mapa de zonas de servicio" />
</template>

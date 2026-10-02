import type { LngLat, Zone } from '@/types/catalog';

/** ¿El punto está dentro del polígono? (ray casting; el anillo no repite el primer punto). */
export function pointInPolygon([lng, lat]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Área aproximada en km² (fórmula del polígono proyectando grados a km a la
 * latitud media). Sirve para comparar zonas y para mostrar un tamaño orientativo.
 */
export function polygonAreaKm2(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  const meanLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((meanLat * Math.PI) / 180);
  let twiceArea = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    twiceArea += xj * kmPerDegLng * (yi * kmPerDegLat) - xi * kmPerDegLng * (yj * kmPerDegLat);
  }
  return Math.abs(twiceArea) / 2;
}

/**
 * Zona que le toca a un punto, con la misma regla que el backend
 * (ZonesService.findZoneForPlace): de las zonas activas que lo contienen, gana
 * la de mayor prioridad y, a igual prioridad, la más pequeña.
 */
export function zoneForPoint(point: LngLat, zones: Zone[]): { winner: Zone | null; candidates: Zone[] } {
  const candidates = zones
    .filter((zone) => zone.isActive && zone.boundary.length >= 3 && pointInPolygon(point, zone.boundary))
    .sort((a, b) => b.priority - a.priority || polygonAreaKm2(a.boundary) - polygonAreaKm2(b.boundary));
  return { winner: candidates[0] ?? null, candidates };
}

/** Copia independiente de un polígono (sirve también con arreglos reactivos de Vue). */
export function copyRing(ring: LngLat[]): LngLat[] {
  return ring.map(([lng, lat]) => [lng, lat]);
}

/** "Playa del Carmen" → "playa-del-carmen" (para el slug de una zona nueva). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

import type { BadgeTone } from '@/components/ui/badge';
import type { LngLat, VehicleStatus } from '@/types/catalog';
import { PUBLIC_SITE_URL } from './site';

export const VEHICLE_STATUS: Record<VehicleStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Activa', tone: 'success' },
  MAINTENANCE: { label: 'En taller', tone: 'warning' },
  INACTIVE: { label: 'Fuera de servicio', tone: 'neutral' },
};

/** Fotos disponibles en el sitio público (frontend/booking/public/vehicles). */
export const VEHICLE_IMAGES = [
  { path: '/vehicles/jetta.webp', label: 'Volkswagen Jetta' },
  { path: '/vehicles/vip.webp', label: 'Volkswagen Teramont' },
  { path: '/vehicles/transit.webp', label: 'Ford Transit' },
];

/** Las imágenes viven en el sitio público: rutas relativas se resuelven contra él. */
export function vehicleImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return /^https?:\/\//.test(imageUrl) ? imageUrl : `${PUBLIC_SITE_URL}${imageUrl}`;
}

/** Aeropuerto CUN [lng, lat] (mismo punto que el seed del backend), para el mapa de zonas. */
export const AIRPORT_POINT: LngLat = [-86.8747, 21.0381];

/** Colores sugeridos para zonas nuevas (distinguibles sobre el mapa). */
export const ZONE_COLORS = ['#3B82F6', '#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#A855F7', '#EC4899'];

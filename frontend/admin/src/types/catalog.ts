/**
 * Catálogo: zonas, tipos de vehículo, flota y tarifas. Mismos campos que las
 * tablas del backend (zones, vehicle_types, vehicles, zone_rates).
 */

/** [longitud, latitud], como GeoJSON y como el SQL del backend (axis-order=long-lat). */
export type LngLat = [lng: number, lat: number];

export interface Zone {
  id: number;
  name: string;
  slug: string;
  /** Anillo exterior del polígono, sin repetir el primer punto al final. */
  boundary: LngLat[];
  /** '#RRGGBB' */
  color: string;
  /** Si dos zonas se traslapan, gana la de mayor prioridad (y luego la más pequeña). */
  priority: number;
  isAirport: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type ZoneInput = Omit<Zone, 'id'>;

/** Borrador de zona en el editor (id null = zona nueva). */
export type ZoneDraft = ZoneInput & { id: number | null };

export interface VehicleType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  maxPassengers: number;
  maxLuggage: number;
  /** Ruta del sitio público (p. ej. /vehicles/jetta.webp) o URL completa. */
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export type VehicleTypeInput = Omit<VehicleType, 'id'>;

export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

/** Unidad física de la flota (una camioneta con placas). */
export interface Vehicle {
  id: number;
  vehicleTypeId: number;
  unitNumber: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  status: VehicleStatus;
  notes: string | null;
}

export type VehicleInput = Omit<Vehicle, 'id'>;

export interface ZoneRate {
  id: number;
  originZoneId: number;
  destinationZoneId: number;
  vehicleTypeId: number;
  minPax: number;
  maxPax: number;
  priceOneWay: number;
  priceRoundTrip: number;
  /** También aplica en sentido inverso (destino → origen). */
  isBidirectional: boolean;
  /** 'YYYY-MM-DD' */
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
}

export type ZoneRateInput = Omit<ZoneRate, 'id'>;

/** Zona en edición sobre el mapa. */
export interface EditingZone {
  /** Cambia cuando el polígono editable debe redibujarse (nueva sesión o "deshacer"). */
  key: string;
  /** Zona guardada que se está editando (se oculta su versión normal); null si es nueva. */
  zoneId: number | null;
  boundary: LngLat[];
  color: string;
}

/** Datos iniciales del alta de una tarifa (p. ej. desde "rutas sin precio"). */
export interface RatePreset {
  originZoneId: number;
  destinationZoneId?: number;
  vehicleTypeId?: number;
}

/** Fila del ajuste masivo con sus precios actuales (incluidos los cambios sin guardar). */
export interface AdjustableRate {
  id: number;
  label: string;
  priceOneWay: number;
  priceRoundTrip: number;
}

/** Cambios de precio/estado pendientes de guardar en la tabla de tarifas. */
export type RatePatch = Partial<Pick<ZoneRate, 'priceOneWay' | 'priceRoundTrip' | 'isActive'>>;

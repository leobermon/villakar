import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type {
  RatePatch,
  Vehicle,
  VehicleInput,
  VehicleType,
  VehicleTypeInput,
  Zone,
  ZoneInput,
  ZoneRate,
  ZoneRateInput,
} from '@/types/catalog';

/** Error con mensaje listo para mostrar al usuario (viene de las validaciones del backend). */
export class CatalogError extends Error {}

interface CatalogResponse {
  zones: Zone[];
  vehicleTypes: VehicleType[];
  vehicles: Vehicle[];
  rates: ZoneRate[];
}

/**
 * Catálogo conectado a la base de datos (/api/admin/catalog): zonas, tipos de
 * vehículo, flota y tarifas. Las reglas (precios, traslapes, capacidad, borrado
 * de zonas) las valida el backend; aquí se muestran sus mensajes.
 */
export const useCatalogStore = defineStore('catalog', () => {
  const zones = ref<Zone[]>([]);
  const vehicleTypes = ref<VehicleType[]>([]);
  const vehicles = ref<Vehicle[]>([]);
  const rates = ref<ZoneRate[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);

  /** Carga desde la base. `force` vuelve a leer aunque ya se haya cargado. */
  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      const data = await api<CatalogResponse>('/admin/catalog');
      zones.value = data.zones;
      vehicleTypes.value = data.vehicleTypes;
      vehicles.value = data.vehicles;
      rates.value = data.rates;
      loaded.value = true;
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.';
    } finally {
      loading.value = false;
    }
  }

  const zoneById = computed(() => new Map(zones.value.map((zone) => [zone.id, zone])));
  const vehicleTypeById = computed(() => new Map(vehicleTypes.value.map((type) => [type.id, type])));
  const sortedZones = computed(() => [...zones.value].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
  const sortedVehicleTypes = computed(() => [...vehicleTypes.value].sort((a, b) => a.sortOrder - b.sortOrder));

  // ---------------- Zonas ----------------

  async function saveZone(input: ZoneInput, id?: number): Promise<Zone> {
    const zone = await call<Zone>(id === undefined ? '/admin/catalog/zones' : `/admin/catalog/zones/${id}`, id === undefined ? 'POST' : 'PUT', withoutId(input));
    upsert(zones.value, zone);
    return zone;
  }

  async function deleteZone(id: number) {
    await call<void>(`/admin/catalog/zones/${id}`, 'DELETE');
    zones.value = zones.value.filter((zone) => zone.id !== id);
  }

  async function deleteRate(id: number) {
    await call<void>(`/admin/catalog/rates/${id}`, 'DELETE');
    rates.value = rates.value.filter((rate) => rate.id !== id);
  }

  function ratesForZone(zoneId: number): ZoneRate[] {
    return rates.value.filter((rate) => rate.originZoneId === zoneId || rate.destinationZoneId === zoneId);
  }

  // ---------------- Vehículos ----------------

  async function saveVehicleType(input: VehicleTypeInput, id?: number): Promise<VehicleType> {
    const type = await call<VehicleType>(
      id === undefined ? '/admin/catalog/vehicle-types' : `/admin/catalog/vehicle-types/${id}`,
      id === undefined ? 'POST' : 'PUT',
      withoutId(input),
    );
    upsert(vehicleTypes.value, type);
    return type;
  }

  async function saveVehicle(input: VehicleInput, id?: number): Promise<Vehicle> {
    const vehicle = await call<Vehicle>(id === undefined ? '/admin/catalog/vehicles' : `/admin/catalog/vehicles/${id}`, id === undefined ? 'POST' : 'PUT', withoutId(input));
    upsert(vehicles.value, vehicle);
    return vehicle;
  }

  // ---------------- Tarifas ----------------

  /** Guarda en bloque los cambios de la tabla de tarifas (todo o nada). */
  async function applyRatePatches(patches: Map<number, RatePatch>) {
    const changes = [...patches].map(([id, patch]) => ({ id, ...patch }));
    const updated = await call<ZoneRate[]>('/admin/catalog/rates', 'PATCH', { changes });
    for (const rate of updated) upsert(rates.value, rate);
  }

  async function createRate(input: ZoneRateInput): Promise<ZoneRate> {
    const { validTo: _validTo, isActive: _isActive, ...body } = input;
    const rate = await call<ZoneRate>('/admin/catalog/rates', 'POST', body);
    rates.value.push(rate);
    return rate;
  }

  /**
   * Destinos sin tarifa desde un origen: por cada zona activa y vehículo activo,
   * si ninguna tarifa activa cubre el trayecto. El cotizador responde "Contact us"
   * en esos casos, así que conviene tenerlos a la vista.
   */
  function missingRoutes(originZoneId: number): Array<{ zone: Zone; vehicles: VehicleType[] }> {
    const activeTypes = sortedVehicleTypes.value.filter((type) => type.isActive);
    return sortedZones.value
      .filter((zone) => zone.isActive && zone.id !== originZoneId)
      .map((zone) => ({
        zone,
        vehicles: activeTypes.filter(
          (type) =>
            !rates.value.some(
              (rate) =>
                rate.isActive &&
                rate.vehicleTypeId === type.id &&
                // Como el cotizador: sentido exacto, o inverso solo si la tarifa es bidireccional.
                ((rate.originZoneId === originZoneId && rate.destinationZoneId === zone.id) ||
                  (rate.isBidirectional && rate.originZoneId === zone.id && rate.destinationZoneId === originZoneId)),
            ),
        ),
      }))
      .filter((entry) => entry.vehicles.length > 0);
  }

  return {
    zones,
    vehicleTypes,
    vehicles,
    rates,
    loading,
    loadError,
    zoneById,
    vehicleTypeById,
    sortedZones,
    sortedVehicleTypes,
    load,
    saveZone,
    deleteZone,
    deleteRate,
    ratesForZone,
    saveVehicleType,
    saveVehicle,
    applyRatePatches,
    createRate,
    missingRoutes,
  };
});

/** Llama al backend y convierte sus errores en CatalogError con el mensaje para el usuario. */
async function call<T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', json?: unknown): Promise<T> {
  try {
    return await api<T>(path, { method, json });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 403) throw new CatalogError('Tu usuario no tiene permiso para modificar el catálogo.');
      throw new CatalogError(e.message);
    }
    throw e;
  }
}

/** El id va en la URL; el backend rechaza campos de más en el cuerpo. */
function withoutId<T extends object>(input: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = input as T & { id?: unknown };
  return rest;
}

/** Reemplaza el elemento con el mismo id o lo agrega. */
function upsert<T extends { id: number }>(list: T[], item: T) {
  const index = list.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) list.splice(index, 1, item);
  else list.push(item);
}

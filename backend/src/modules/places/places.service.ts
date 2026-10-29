import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaceType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ResolvedPlace {
  id: number;
  googlePlaceId: string | null;
  name: string;
  formattedAddress: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
}

interface PlaceRow {
  id: bigint;
  google_place_id: string | null;
  name: string;
  formatted_address: string | null;
  place_type: PlaceType;
  lat: number;
  lng: number;
  last_synced_at: Date | null;
}

export interface PlaceSuggestion {
  googlePlaceId: string;
  mainText: string;
  secondaryText: string | null;
}

interface GooglePlaceDetails {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      types?: string[];
      text?: { text: string };
      structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
    };
  }>;
}

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1';

// Rectángulo de búsqueda: de Costa Mujeres a Tulum. Lo que caiga fuera de las
// zonas se cotiza como "Contact us".
const SEARCH_AREA = {
  rectangle: {
    low: { latitude: 20.0, longitude: -87.8 },
    high: { latitude: 21.45, longitude: -86.7 },
  },
};

// El buscador solo ofrece alojamientos, y solo en Quintana Roo. Google limita el filtro por tipo
// principal a 5 tipos por búsqueda, así que se hacen tres búsquedas en paralelo y se mezclan:
//   - hoteles y alojamientos clásicos
//   - casas, cuartos y rentas vacacionales (muchos Airbnb entran aquí)
//   - condominios, departamentos y residenciales
const SEARCH_TYPE_GROUPS: string[][] = [
  ['hotel', 'resort_hotel', 'lodging', 'hostel', 'guest_house'],
  ['private_guest_room', 'bed_and_breakfast', 'cottage', 'inn', 'extended_stay_hotel'],
  ['condominium_complex', 'apartment_complex', 'apartment_building', 'housing_complex'],
];
/** Cuántas sugerencias se muestran como máximo después de mezclar los tres grupos. */
const MAX_SUGGESTIONS = 8;
/** Cualquiera de estos tipos de Google cuenta como alojamiento al cotizar. */
const ACCOMMODATION_TYPES = new Set(SEARCH_TYPE_GROUPS.flat().concat(['motel', 'campground', 'camping_cabin', 'farmstay', 'mobile_home_park', 'rv_park', 'japanese_inn']));
/**
 * Hay alojamientos que Google clasifica mal (p. ej. un condominio listado como "proveedor"), así
 * que no traen ningún tipo de alojamiento. Se aceptan si su NOMBRE dice que lo son (condo, villas,
 * residencial, airbnb…), salvo que Google los marque claramente como negocio de otro giro.
 */
const NAME_KEYWORDS =
  /\b(hotel|hotels|hostal|hostel|resort|villa|villas|condo|condos|condominio|condominios|condominium|condominiums|residencial|residencias|residences|apartment|apartments|apartamento|apartamentos|departamento|departamentos|suite|suites|casa|cabana|cabanas|cabin|cabins|bungalow|bungalows|posada|inn|lodge|loft|penthouse|airbnb|rental|rentals|renta|rentas)\b/;
const NON_LODGING_TYPES = new Set([
  'restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'store', 'supermarket', 'grocery_store',
  'convenience_store', 'shopping_mall', 'school', 'university', 'hospital', 'doctor', 'pharmacy', 'bank', 'atm',
  'gas_station', 'car_dealer', 'car_repair', 'car_rental', 'car_wash', 'church', 'gym', 'night_club', 'airport',
  'bus_station', 'parking', 'park', 'tourist_attraction', 'museum', 'movie_theater', 'beach',
]);

/** Quita acentos y pasa a minúsculas para comparar nombres ("Cabañas" → "cabanas"). */
function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** ¿Es un alojamiento? Por su tipo en Google o, si Google lo clasificó mal, por su nombre. */
function looksLikeAccommodation(types: string[], name: string): boolean {
  if (types.some((type) => ACCOMMODATION_TYPES.has(type))) return true;
  return NAME_KEYWORDS.test(normalizeName(name)) && !types.some((type) => NON_LODGING_TYPES.has(type));
}

const QUINTANA_ROO_PATTERN = /quintana\s*roo|\bq\.\s?r\./i;
const NOT_LODGING_MESSAGE = 'Please choose a hotel, resort, condo or vacation rental in Quintana Roo.';

const PLACE_SELECT = Prisma.sql`
  SELECT id, google_place_id, name, formatted_address, place_type,
         ST_Latitude(location) AS lat, ST_Longitude(location) AS lng, last_synced_at
  FROM places`;

// Los place_id de Google son alfanuméricos con '-' y '_'.
const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{10,300}$/;

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Punto fijo propio por su código (p. ej. 'CUN' para el aeropuerto). */
  async findByCode(code: string): Promise<ResolvedPlace> {
    const [row] = await this.prisma.$queryRaw<PlaceRow[]>(Prisma.sql`${PLACE_SELECT} WHERE code = ${code}`);
    if (!row) throw new NotFoundException(`Place ${code} not found`);
    return toResolvedPlace(row);
  }

  /**
   * Sugerencias de lugares para el buscador del sitio (Places API New). El
   * navegador genera `sessionToken` y lo reutiliza hasta elegir un lugar, así
   * Google cobra las búsquedas + el detalle como una sola sesión.
   */
  async autocomplete(input: string, sessionToken: string): Promise<PlaceSuggestion[]> {
    // Tres búsquedas por tipo y una abierta (sin tipo) que rescata alojamientos mal clasificados por Google.
    const searches = [...SEARCH_TYPE_GROUPS.map((types) => this.autocompleteGroup(input, sessionToken, types)), this.autocompleteGroup(input, sessionToken, null)];
    const groups = await Promise.allSettled(searches);
    const ok = groups.flatMap((group) => (group.status === 'fulfilled' ? [group.value] : []));
    // Si Google falló en todas, sí es un error; si falló solo una, se muestran las demás.
    if (ok.length === 0) throw new ServiceUnavailableException('Location search temporarily unavailable');

    // Se mezclan por turnos (hotel, casa, condominio, hotel…) sin repetir lugares.
    const merged: PlaceSuggestion[] = [];
    const seen = new Set<string>();
    for (let index = 0; merged.length < MAX_SUGGESTIONS && ok.some((list) => index < list.length); index++) {
      for (const list of ok) {
        const suggestion = list[index];
        if (!suggestion || seen.has(suggestion.googlePlaceId) || merged.length >= MAX_SUGGESTIONS) continue;
        seen.add(suggestion.googlePlaceId);
        merged.push(suggestion);
      }
    }
    return merged;
  }

  /** Una búsqueda de Google limitada a un grupo de tipos de lugar; solo resultados de Quintana Roo. */
  private async autocompleteGroup(input: string, sessionToken: string, types: string[] | null): Promise<PlaceSuggestion[]> {
    let response: Response;
    try {
      response = await fetch(`${GOOGLE_PLACES_URL}/places:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.config.getOrThrow<string>('GOOGLE_MAPS_SERVER_KEY'),
        },
        body: JSON.stringify({
          input,
          sessionToken,
          languageCode: 'en',
          includedRegionCodes: ['mx'],
          ...(types ? { includedPrimaryTypes: types } : {}),
          locationRestriction: SEARCH_AREA,
        }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      this.logger.error(`Google autocomplete request failed: ${String(error)}`);
      throw new ServiceUnavailableException('Location search temporarily unavailable');
    }

    if (!response.ok) {
      this.logger.error(`Google autocomplete responded ${response.status}: ${await response.text()}`);
      throw new ServiceUnavailableException('Location search temporarily unavailable');
    }

    const data = (await response.json()) as GoogleAutocompleteResponse;
    return (data.suggestions ?? []).flatMap(({ placePrediction: prediction }) =>
      prediction &&
      isInQuintanaRoo(prediction.structuredFormat?.secondaryText?.text ?? prediction.text?.text) &&
      // La búsqueda abierta solo deja pasar lo que parece alojamiento; las de tipo ya vienen filtradas por Google.
      (types !== null || looksLikeAccommodation(prediction.types ?? [], prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? ''))
        ? [
            {
              googlePlaceId: prediction.placeId,
              mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
              secondaryText: prediction.structuredFormat?.secondaryText?.text ?? null,
            },
          ]
        : [],
    );
  }

  /**
   * Devuelve el lugar a partir de un place_id de Google. Las coordenadas siempre
   * salen de Google (o de la caché), nunca del navegador, para que el cliente
   * no pueda alterar la zona y por lo tanto el precio.
   */
  async resolveGooglePlace(googlePlaceId: string, sessionToken?: string): Promise<ResolvedPlace> {
    if (!GOOGLE_PLACE_ID_PATTERN.test(googlePlaceId)) {
      throw new BadRequestException('Please choose a hotel from the list.');
    }

    const cached = await this.findByGoogleId(googlePlaceId);
    // Un lugar guardado antes con otro tipo (p. ej. un condominio) se vuelve a consultar para reclasificarlo.
    if (cached && cached.place_type === PlaceType.HOTEL && this.isFresh(cached.last_synced_at)) return toResolvedPlace(cached);

    const details = await this.fetchGoogleDetails(googlePlaceId, sessionToken);
    if (!details) {
      // Google no respondió: si hay una copia vieja es mejor usarla que fallar la cotización.
      if (cached) return assertLodging(toResolvedPlace(cached));
      throw new ServiceUnavailableException('Location service temporarily unavailable');
    }

    const { latitude, longitude } = details.location ?? {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Please choose a different hotel from the list.');
    }

    const types = details.types ?? [];
    if (!looksLikeAccommodation(types, details.displayName?.text ?? '') || !isInQuintanaRoo(details.formattedAddress)) {
      throw new BadRequestException(NOT_LODGING_MESSAGE);
    }
    const name = (details.displayName?.text ?? 'Unnamed place').slice(0, 190);
    const address = details.formattedAddress?.slice(0, 255) ?? null;
    const wkt = `POINT(${longitude} ${latitude})`;

    await this.prisma.$executeRaw`
      INSERT INTO places (google_place_id, place_type, name, formatted_address, location, google_types, last_synced_at)
      VALUES (${googlePlaceId}, ${placeTypeFromGoogle(types, name)}, ${name}, ${address},
              ST_GeomFromText(${wkt}, 4326, 'axis-order=long-lat'), ${JSON.stringify(types)}, NOW()) AS incoming
      ON DUPLICATE KEY UPDATE
        name = incoming.name,
        formatted_address = incoming.formatted_address,
        location = incoming.location,
        google_types = incoming.google_types,
        last_synced_at = incoming.last_synced_at`;

    const saved = await this.findByGoogleId(googlePlaceId);
    if (!saved) throw new ServiceUnavailableException('Could not store place');
    return assertLodging(toResolvedPlace(saved));
  }

  private async findByGoogleId(googlePlaceId: string): Promise<PlaceRow | undefined> {
    const [row] = await this.prisma.$queryRaw<PlaceRow[]>(
      Prisma.sql`${PLACE_SELECT} WHERE google_place_id = ${googlePlaceId}`,
    );
    return row;
  }

  private isFresh(lastSyncedAt: Date | null): boolean {
    if (!lastSyncedAt) return false;
    const maxAgeMs = this.config.getOrThrow<number>('PLACES_CACHE_DAYS') * 24 * 60 * 60 * 1000;
    return Date.now() - lastSyncedAt.getTime() < maxAgeMs;
  }

  /** Place Details (Places API New). Devuelve null si Google falla por causas temporales. */
  private async fetchGoogleDetails(
    googlePlaceId: string,
    sessionToken?: string,
  ): Promise<GooglePlaceDetails | null> {
    const url = new URL(`${GOOGLE_PLACES_URL}/places/${encodeURIComponent(googlePlaceId)}`);
    if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': this.config.getOrThrow<string>('GOOGLE_MAPS_SERVER_KEY'),
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types',
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      this.logger.error(`Google Places request failed: ${String(error)}`);
      return null;
    }

    if (response.status === 400 || response.status === 404) {
      throw new BadRequestException('Please choose a hotel from the list.');
    }
    if (!response.ok) {
      this.logger.error(`Google Places responded ${response.status}: ${await response.text()}`);
      return null;
    }
    return (await response.json()) as GooglePlaceDetails;
  }
}

/** ¿El texto (dirección o referencia de Google) menciona Quintana Roo? */
function isInQuintanaRoo(text: string | null | undefined): boolean {
  return text ? QUINTANA_ROO_PATTERN.test(text) : false;
}

/** Un lugar guardado de antes que no es alojamiento ya no se acepta como hotel. */
function assertLodging(place: ResolvedPlace): ResolvedPlace {
  if (place.placeType !== PlaceType.HOTEL) throw new BadRequestException(NOT_LODGING_MESSAGE);
  return place;
}

function placeTypeFromGoogle(types: string[], name: string): PlaceType {
  if (types.includes('airport')) return PlaceType.AIRPORT;
  // Todo alojamiento (hotel, casa, condominio, departamento…) se trata como hotel: se cotiza por zona.
  if (looksLikeAccommodation(types, name)) return PlaceType.HOTEL;
  return PlaceType.OTHER;
}

function toResolvedPlace(row: PlaceRow): ResolvedPlace {
  return {
    id: Number(row.id),
    googlePlaceId: row.google_place_id,
    name: row.name,
    formattedAddress: row.formatted_address,
    placeType: row.place_type,
    lat: Number(row.lat),
    lng: Number(row.lng),
  };
}

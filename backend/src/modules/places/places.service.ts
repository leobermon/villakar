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
      prediction
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
      throw new BadRequestException('Invalid place id');
    }

    const cached = await this.findByGoogleId(googlePlaceId);
    if (cached && this.isFresh(cached.last_synced_at)) return toResolvedPlace(cached);

    const details = await this.fetchGoogleDetails(googlePlaceId, sessionToken);
    if (!details) {
      // Google no respondió: si hay una copia vieja es mejor usarla que fallar la cotización.
      if (cached) return toResolvedPlace(cached);
      throw new ServiceUnavailableException('Location service temporarily unavailable');
    }

    const { latitude, longitude } = details.location ?? {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Place has no coordinates');
    }

    const types = details.types ?? [];
    const name = (details.displayName?.text ?? 'Unnamed place').slice(0, 190);
    const address = details.formattedAddress?.slice(0, 255) ?? null;
    const wkt = `POINT(${longitude} ${latitude})`;

    await this.prisma.$executeRaw`
      INSERT INTO places (google_place_id, place_type, name, formatted_address, location, google_types, last_synced_at)
      VALUES (${googlePlaceId}, ${placeTypeFromGoogle(types)}, ${name}, ${address},
              ST_GeomFromText(${wkt}, 4326, 'axis-order=long-lat'), ${JSON.stringify(types)}, NOW()) AS incoming
      ON DUPLICATE KEY UPDATE
        name = incoming.name,
        formatted_address = incoming.formatted_address,
        location = incoming.location,
        google_types = incoming.google_types,
        last_synced_at = incoming.last_synced_at`;

    const saved = await this.findByGoogleId(googlePlaceId);
    if (!saved) throw new ServiceUnavailableException('Could not store place');
    return toResolvedPlace(saved);
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
      throw new BadRequestException('Unknown place');
    }
    if (!response.ok) {
      this.logger.error(`Google Places responded ${response.status}: ${await response.text()}`);
      return null;
    }
    return (await response.json()) as GooglePlaceDetails;
  }
}

function placeTypeFromGoogle(types: string[]): PlaceType {
  if (types.includes('airport')) return PlaceType.AIRPORT;
  if (types.includes('lodging')) return PlaceType.HOTEL;
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

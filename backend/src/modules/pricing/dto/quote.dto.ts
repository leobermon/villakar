import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TripType } from '@prisma/client';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Aeropuertos en los que opera el servicio. */
export const AIRPORT_CODES = ['CUN'] as const;

/**
 * Un extremo del viaje: o el aeropuerto (`airportCode`) o un hotel buscado en
 * Google (`googlePlaceId`). Exactamente uno de los dos.
 */
export class QuoteLocationDto {
  @IsOptional()
  @IsIn(AIRPORT_CODES)
  airportCode?: (typeof AIRPORT_CODES)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  googlePlaceId?: string;

  /** Token de la sesión de autocompletado en la que se eligió `googlePlaceId`. */
  @IsOptional()
  @IsUUID()
  sessionToken?: string;
}

export class QuoteDto {
  @IsEnum(TripType)
  tripType: TripType;

  @ValidateNested()
  @Type(() => QuoteLocationDto)
  origin: QuoteLocationDto;

  @ValidateNested()
  @Type(() => QuoteLocationDto)
  destination: QuoteLocationDto;

  /** Fecha del primer servicio (YYYY-MM-DD, hora local de Cancún). Define la tarifa vigente. */
  @Matches(DATE_ONLY, { message: 'Please choose a valid date.' })
  date: string;

  /** Fecha del regreso, obligatoria en ROUND_TRIP. */
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'Please choose a valid return date.' })
  returnDate?: string;

  /** Total de pasajeros que ocupan asiento. */
  @IsInt()
  @Min(1)
  @Max(50)
  passengers: number;
}

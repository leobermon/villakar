import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Tarifas ----------

export class RatePatchDto {
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Todos los precios deben ser mayores a cero.' })
  priceOneWay?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Todos los precios deben ser mayores a cero.' })
  priceRoundTrip?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RatePatchesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RatePatchDto)
  changes: RatePatchDto[];
}

export class CreateRateDto {
  @IsInt() @Min(1) originZoneId: number;
  @IsInt() @Min(1) destinationZoneId: number;
  @IsInt() @Min(1) vehicleTypeId: number;
  @IsInt() @Min(1) @Max(50) minPax: number;
  @IsInt() @Min(1) @Max(50) maxPax: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive({ message: 'Todos los precios deben ser mayores a cero.' }) priceOneWay: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive({ message: 'Todos los precios deben ser mayores a cero.' }) priceRoundTrip: number;
  @IsBoolean() isBidirectional: boolean;
  @Matches(DATE_ONLY, { message: 'validFrom debe ser YYYY-MM-DD' }) validFrom: string;
}

// ---------- Zonas ----------

export class ZoneDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'El identificador solo lleva minúsculas, números y guiones.' }) @MaxLength(100) slug: string;

  /** Anillo [lng, lat] sin repetir el primer punto. */
  @IsArray()
  @ArrayMinSize(3, { message: 'Dibuja el área de la zona en el mapa (al menos 3 puntos).' })
  @ArrayMaxSize(500)
  boundary: Array<[number, number]>;

  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe tener el formato #RRGGBB.' }) color: string;
  @IsInt() @Min(0) @Max(1000) priority: number;
  @IsBoolean() isAirport: boolean;
  @IsBoolean() isActive: boolean;
  @IsInt() @Min(0) @Max(10000) sortOrder: number;
}

// ---------- Vehículos ----------

export class VehicleTypeDto {
  @Matches(/^[A-Za-z0-9_]{2,30}$/, { message: 'El código lleva de 2 a 30 letras, números o guion bajo (ej. SUV_LUJO).' }) code: string;
  @IsString() @IsNotEmpty() @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(255) description: string | null;
  @IsInt() @Min(1) @Max(50) maxPassengers: number;
  @IsInt() @Min(0) @Max(50) maxLuggage: number;
  @IsOptional() @IsString() @MaxLength(255) imageUrl: string | null;
  @IsInt() @Min(0) @Max(10000) sortOrder: number;
  @IsBoolean() isActive: boolean;
}

export class VehicleDto {
  @IsInt() @Min(1) vehicleTypeId: number;
  @IsString() @IsNotEmpty() @MaxLength(20) unitNumber: string;
  @IsString() @IsNotEmpty() @MaxLength(20) plate: string;
  @IsOptional() @IsString() @MaxLength(60) brand: string | null;
  @IsOptional() @IsString() @MaxLength(60) model: string | null;
  @IsOptional() @IsInt() @Min(1990) @Max(2100) year: number | null;
  @IsIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']) status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  @IsOptional() @IsString() @MaxLength(255) notes: string | null;
}

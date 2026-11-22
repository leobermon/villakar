import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TripType } from '@prisma/client';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

/** Fecha y hora local de Cancún: 'YYYY-MM-DDTHH:MM'. */
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export class ValidateCouponDto {
  @Transform(upper)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @IsEnum(TripType)
  tripType: TripType;

  @IsOptional()
  @IsEmail()
  @MaxLength(190)
  email?: string;
}

export class CreateCouponDto {
  @Transform(upper)
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,30}$/, { message: 'El código debe tener de 3 a 30 letras, números, guiones o guion bajo.' })
  code: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(190)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Escribe un descuento válido para One way.' })
  @Min(0)
  @Max(10000)
  discountOneWay: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Escribe un descuento válido para Round trip.' })
  @Min(0)
  @Max(10000)
  discountRoundTrip: number;

  @Matches(LOCAL_DATE_TIME, { message: 'Elige la fecha de inicio.' })
  validFrom: string;

  @Matches(LOCAL_DATE_TIME, { message: 'Elige la fecha de fin.' })
  validTo: string;

  /** Usos totales permitidos; null = sin límite. */
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: 'El límite de usos debe ser un número entero.' })
  @Min(1)
  @Max(1_000_000)
  maxUses: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Al editar no se cambia el código: ya pudo haberse compartido o usado. */
export class UpdateCouponDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(190)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  discountOneWay?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  discountRoundTrip?: number;

  @IsOptional()
  @Matches(LOCAL_DATE_TIME, { message: 'Elige la fecha de inicio.' })
  validFrom?: string;

  @IsOptional()
  @Matches(LOCAL_DATE_TIME, { message: 'Elige la fecha de fin.' })
  validTo?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: 'El límite de usos debe ser un número entero.' })
  @Min(1)
  @Max(1_000_000)
  maxUses?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

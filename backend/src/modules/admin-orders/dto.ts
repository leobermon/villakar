import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentProvider, ReservationStatus } from '@prisma/client';
import { IsInternationalPhone } from '../../common/validators/phone';

// ---------- Órdenes ----------

export class LegDriverDto {
  @IsInt()
  @Min(1)
  @Max(2)
  legNumber: number;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'El nombre del chofer es demasiado largo.' })
  driverName: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono del chofer es demasiado largo.' })
  driverPhone: string | null;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Las notas internas son demasiado largas.' })
  internalNotes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => LegDriverDto)
  legs?: LegDriverDto[];
}

// ---------- Pagos ----------

export class VerifyPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  receivedBy: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note: string | null;
}

export class RejectPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Escribe el motivo.' })
  @MaxLength(255)
  reason: string;
}

export class ManualPaymentDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsIn([PaymentProvider.CASH, PaymentProvider.TRANSFER])
  provider: typeof PaymentProvider.CASH | typeof PaymentProvider.TRANSFER;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe tener como máximo dos decimales.' })
  @IsPositive({ message: 'El monto debe ser mayor a cero.' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  receivedBy: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note: string | null;
}

export class CreatePaymentLinkDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  orderId: number | null;

  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre del cliente.' })
  @MaxLength(160)
  customerName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Correo del cliente no válido.' })
  @MaxLength(190)
  customerEmail: string | null;

  /** Se guarda en formato internacional E.164; se aceptan espacios, guiones y paréntesis al capturarlo. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s().-]/g, '') || null : value))
  @IsInternationalPhone({ message: 'WhatsApp no válido. Escríbelo con la clave de país: +52 998 123 4567.' })
  customerPhone: string | null;

  @IsString()
  @IsNotEmpty({ message: 'Escribe el concepto del cobro.' })
  @MaxLength(255)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe tener como máximo dos decimales.' })
  @IsPositive({ message: 'El monto debe ser mayor a cero.' })
  @Max(100_000)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(720, { message: 'La vigencia máxima es de 30 días.' })
  validHours: number;
}

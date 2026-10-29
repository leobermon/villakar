import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsInternationalPhone, PHONE_COUNTRIES } from '../../../common/validators/phone';
import { QuoteDto } from '../../pricing/dto/quote.dto';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Terminales de pasajeros del aeropuerto de Cancún. */
export const CUN_TERMINALS = ['T2', 'T3', 'T4'] as const;

export class CustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsEmail()
  @MaxLength(190)
  email: string;

  /** Formato internacional E.164: +529981234567. */
  @IsInternationalPhone()
  phone: string;

  /** País del teléfono (ISO, p. ej. MX); se guarda como país del cliente. */
  @IsIn(PHONE_COUNTRIES, { message: 'Please choose your phone country code.' })
  phoneCountry: string;
}

/**
 * Datos de un tramo. Cuáles son obligatorios depende del tipo de tramo (llegada
 * al aeropuerto, salida al aeropuerto u hotel → hotel); lo valida el servicio.
 * Las horas son locales de Cancún ('HH:MM') y se aplican a la fecha del tramo.
 */
export class LegDetailsDto {
  @IsOptional()
  @Matches(TIME, { message: 'Please choose a valid pickup time.' })
  pickupTime?: string;

  @IsOptional()
  @Matches(TIME, { message: 'Please choose a valid flight time.' })
  flightTime?: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9]{2,3}\s?\d{1,4}[A-Za-z]?$/, { message: 'Please enter a valid flight number, for example AA1234.' })
  flightNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  airline?: string;

  @IsOptional()
  @IsIn(CUN_TERMINALS)
  terminal?: (typeof CUN_TERMINALS)[number];
}

export class CreateReservationDto extends QuoteDto {
  /** Vehículo elegido; el precio se recalcula en el servidor. */
  @IsInt()
  @Min(1)
  vehicleTypeId: number;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  /** Un tramo en ONE_WAY, dos en ROUND_TRIP (ida y regreso). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => LegDetailsDto)
  legs: LegDetailsDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;
}

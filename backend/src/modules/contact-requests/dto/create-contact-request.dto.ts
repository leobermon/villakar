import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsInternationalPhone } from '../../../common/validators/phone';

export class CreateContactRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(190)
  email: string;

  /** Formato internacional E.164: +529981234567. */
  @IsOptional()
  @IsInternationalPhone()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(190)
  hotelName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  googlePlaceId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Please choose a valid travel date.' })
  arrivalDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  passengers?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

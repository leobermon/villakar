import { IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Un evento anónimo del sitio de reservas. Todo se recorta y se valida: es un endpoint público. */
export class TrackEventDto {
  @IsString()
  @MinLength(8)
  @MaxLength(36)
  @Matches(/^[A-Za-z0-9-]+$/)
  sid: string;

  @IsString()
  @Matches(/^[a-z_]{2,40}$/)
  name: string;

  @IsOptional() @IsString() @MaxLength(190) path?: string;
  @IsOptional() @IsString() @MaxLength(20) route?: string;
  @IsOptional() @IsString() @MaxLength(12) tripType?: string;
  @IsOptional() @IsString() @MaxLength(190) hotel?: string;
  @IsOptional() @IsString() @MaxLength(80) label?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000) amount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) passengers?: number;
  @IsOptional() @IsString() @MaxLength(10) device?: string;
  @IsOptional() @IsString() @MaxLength(80) source?: string;
  @IsOptional() @IsObject() props?: Record<string, unknown>;
}

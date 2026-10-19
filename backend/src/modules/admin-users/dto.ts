import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

/** Misma longitud mínima que la contraseña del primer usuario (ADMIN_SEED_PASSWORD). */
export const MIN_PASSWORD = 12;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateAdminUserDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre del usuario.' })
  @MaxLength(120)
  name: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  @MaxLength(190)
  email: string;

  @IsEnum(UserRole, { message: 'Elige un rol válido.' })
  role: UserRole;

  @IsString()
  @MinLength(MIN_PASSWORD, { message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` })
  @MaxLength(200)
  password: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre del usuario.' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  @MaxLength(190)
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Elige un rol válido.' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Si viene, se cambia la contraseña (restablecer). */
  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD, { message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` })
  @MaxLength(200)
  password?: string;
}

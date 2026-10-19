import { ContactRequestStatus, EmailKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResendEmailDto {
  @IsEnum(EmailKind, { message: 'El tipo de correo no es válido.' })
  kind: EmailKind;
}

export class UpdateContactRequestDto {
  @IsOptional()
  @IsEnum(ContactRequestStatus, { message: 'El estado no es válido.' })
  status?: ContactRequestStatus;

  /** null o vacío borra las notas. */
  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: 'Las notas son demasiado largas (máximo 4000 caracteres).' })
  internalNotes?: string | null;
}

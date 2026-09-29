import { IsString, IsUUID, Length } from 'class-validator';

export class AutocompleteQueryDto {
  @IsString()
  @Length(2, 120)
  input: string;

  @IsUUID()
  sessionToken: string;
}

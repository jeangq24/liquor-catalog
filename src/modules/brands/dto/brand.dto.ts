import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({
    maxLength: 120,
    minLength: 1,
    description: 'Nombre de la marca; no puede estar vacío.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name!: string;

  @ApiProperty({
    maxLength: 140,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    description:
      'Slug único en minúsculas, con palabras separadas por guiones.',
  })
  @IsString()
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Descripción de la marca.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Ruta de la imagen del logotipo; no se carga el archivo.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly logoPath?: string | null;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 120,
    minLength: 1,
    description: 'Nuevo nombre de la marca; no puede estar vacío.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 140,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    description:
      'Nuevo slug único en minúsculas, con palabras separadas por guiones.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Nueva descripción de la marca; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Nueva ruta del logotipo; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly logoPath?: string | null;
}

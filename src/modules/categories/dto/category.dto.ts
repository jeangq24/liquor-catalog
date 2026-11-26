import {
  IsInt,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    description: 'Nombre de la categoría; no puede estar vacío.',
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
    format: 'uuid',
    nullable: true,
    description: 'UUID de la categoría padre; null crea una categoría raíz.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly parentId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Descripción de la categoría.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Ruta de imagen de la categoría; no se carga el archivo.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly imagePath?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    description: 'Posición de ordenamiento de la categoría.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  readonly sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 120,
    description: 'Nuevo nombre de la categoría; no puede estar vacío.',
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
    format: 'uuid',
    nullable: true,
    description:
      'UUID de la nueva categoría padre; null convierte la categoría en raíz.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly parentId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Nueva descripción de la categoría; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Nueva ruta de imagen; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly imagePath?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    description: 'Nueva posición de ordenamiento.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  readonly sortOrder?: number;
}

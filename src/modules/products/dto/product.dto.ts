import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 180,
    description: 'Nombre del producto; no puede estar vacío.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/\S/)
  readonly name!: string;

  @ApiProperty({
    maxLength: 200,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    description:
      'Slug único en minúsculas, con palabras separadas por guiones.',
  })
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'UUID de la marca asociada; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly brandId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    uniqueItems: true,
    description: 'UUID únicos de las categorías asociadas.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly categoryIds?: string[];

  @ApiPropertyOptional({
    type: String,
    maxLength: 300,
    nullable: true,
    description: 'Descripción corta del producto; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(300)
  readonly shortDescription?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Descripción completa del producto; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica si el producto se destaca en el catálogo.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isFeatured?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 180,
    description: 'Nuevo nombre del producto; no puede estar vacío.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/\S/)
  readonly name?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 200,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    description:
      'Nuevo slug único en minúsculas, con palabras separadas por guiones.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'UUID de la marca asociada; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly brandId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    uniqueItems: true,
    description: 'UUID únicos que reemplazan las categorías asociadas.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly categoryIds?: string[];

  @ApiPropertyOptional({
    type: String,
    maxLength: 300,
    nullable: true,
    description: 'Nueva descripción corta; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(300)
  readonly shortDescription?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Nueva descripción completa; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Indica si el producto debe destacarse en el catálogo.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isFeatured?: boolean;
}

import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    description: 'Nombre de la presentación comercial; no puede estar vacío.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 80,
    description: 'SKU único de la variante; no puede estar vacío.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly sku!: string;

  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 80,
    nullable: true,
    description: 'Código de barras opcional; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly barcode?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 2147483647,
    nullable: true,
    description: 'Volumen en mililitros; debe ser un entero positivo o null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly volumeMl?: number | null;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 2147483647,
    default: 1,
    description: 'Cantidad de unidades por paquete; entero positivo.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly unitsPerPack?: number;

  @ApiProperty({
    type: String,
    pattern: '^[1-9][0-9]{0,18}$',
    description:
      'Precio vigente positivo en COP como cadena decimal entera, hasta 9223372036854775807.',
  })
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly priceCop!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Precio de referencia en COP como cadena decimal; debe superar el precio vigente.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly compareAtPriceCop?: string | null;
}

export class UpdateVariantDto {
  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 120,
    description: 'Nuevo nombre de la presentación; no puede estar vacío.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name?: string;

  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 80,
    description: 'Nuevo SKU único; no puede estar vacío.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly sku?: string;

  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 80,
    nullable: true,
    description: 'Nuevo código de barras; admite null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly barcode?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 2147483647,
    nullable: true,
    description: 'Nuevo volumen en mililitros; entero positivo o null.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly volumeMl?: number | null;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 2147483647,
    description: 'Nueva cantidad de unidades por paquete; entero positivo.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly unitsPerPack?: number;

  @ApiPropertyOptional({
    type: String,
    pattern: '^[1-9][0-9]{0,18}$',
    description:
      'Nuevo precio vigente positivo en COP como cadena decimal entera, hasta 9223372036854775807.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly priceCop?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Nuevo precio de referencia en COP como cadena decimal; debe superar el precio vigente.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly compareAtPriceCop?: string | null;
}

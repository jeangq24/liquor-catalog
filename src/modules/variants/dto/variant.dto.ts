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
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name!: string;

  @ApiProperty({ minLength: 1, maxLength: 80 })
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
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly unitsPerPack?: number;

  @ApiProperty({
    type: String,
    pattern: '^[1-9][0-9]{0,18}$',
    description: 'COP as a positive decimal string, up to 9223372036854775807.',
  })
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly priceCop!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Decimal-string reference price greater than the current price.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly compareAtPriceCop?: string | null;
}

export class UpdateVariantDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name?: string;

  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 80 })
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
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly volumeMl?: number | null;

  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: 2147483647 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly unitsPerPack?: number;

  @ApiPropertyOptional({
    type: String,
    pattern: '^[1-9][0-9]{0,18}$',
    description: 'COP as a positive decimal string, up to 9223372036854775807.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly priceCop?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Decimal-string reference price greater than the current price.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly compareAtPriceCop?: string | null;
}

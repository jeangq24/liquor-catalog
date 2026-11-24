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

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly sku!: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly barcode?: string | null;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly volumeMl?: number | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly unitsPerPack?: number;

  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly priceCop!: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly compareAtPriceCop?: string | null;
}

export class UpdateVariantDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly sku?: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/\S/)
  readonly barcode?: string | null;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly volumeMl?: number | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly unitsPerPack?: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly priceCop?: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^[1-9][0-9]{0,18}$/)
  readonly compareAtPriceCop?: string | null;
}

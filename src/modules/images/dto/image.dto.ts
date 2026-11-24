import {
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  MAX_SORT_ORDER,
  MAX_STORAGE_PATH_LENGTH,
  MIN_SORT_ORDER,
  STORAGE_PATH_PATTERN,
} from '../image.constants.js';

export class CreateImageDto {
  @IsString()
  @MaxLength(MAX_STORAGE_PATH_LENGTH)
  @Matches(STORAGE_PATH_PATTERN)
  readonly storagePath!: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly variantId?: string | null;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(200)
  readonly altText?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isPrimary?: boolean;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(MIN_SORT_ORDER)
  @Max(MAX_SORT_ORDER)
  readonly sortOrder?: number;
}

export class UpdateImageDto {
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly variantId?: string | null;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(200)
  readonly altText?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isPrimary?: boolean;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(MIN_SORT_ORDER)
  @Max(MAX_SORT_ORDER)
  readonly sortOrder?: number;
}

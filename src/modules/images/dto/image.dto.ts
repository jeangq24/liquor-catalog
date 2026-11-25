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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MAX_SORT_ORDER,
  MAX_STORAGE_PATH_LENGTH,
  MIN_SORT_ORDER,
  STORAGE_PATH_PATTERN,
} from '../image.constants.js';

export class CreateImageDto {
  @ApiProperty({
    maxLength: MAX_STORAGE_PATH_LENGTH,
    pattern: STORAGE_PATH_PATTERN.source,
  })
  @IsString()
  @MaxLength(MAX_STORAGE_PATH_LENGTH)
  @Matches(STORAGE_PATH_PATTERN)
  readonly storagePath!: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly variantId?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(200)
  readonly altText?: string | null;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isPrimary?: boolean;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: MIN_SORT_ORDER,
    maximum: MAX_SORT_ORDER,
    default: 0,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(MIN_SORT_ORDER)
  @Max(MAX_SORT_ORDER)
  readonly sortOrder?: number;
}

export class UpdateImageDto {
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly variantId?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(200)
  readonly altText?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isPrimary?: boolean;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: MIN_SORT_ORDER,
    maximum: MAX_SORT_ORDER,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(MIN_SORT_ORDER)
  @Max(MAX_SORT_ORDER)
  readonly sortOrder?: number;
}

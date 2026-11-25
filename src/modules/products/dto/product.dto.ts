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
  @ApiProperty({ minLength: 1, maxLength: 180 })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/\S/)
  readonly name!: string;

  @ApiProperty({ maxLength: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug!: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly brandId?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid', uniqueItems: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly categoryIds?: string[];

  @ApiPropertyOptional({ type: String, maxLength: 300, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(300)
  readonly shortDescription?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isFeatured?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 180 })
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
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug?: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUUID()
  readonly brandId?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid', uniqueItems: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly categoryIds?: string[];

  @ApiPropertyOptional({ type: String, maxLength: 300, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(300)
  readonly shortDescription?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  readonly isFeatured?: boolean;
}

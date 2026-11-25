import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ maxLength: 120, minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/\S/)
  readonly name!: string;

  @ApiProperty({ maxLength: 140, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  @IsString()
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly logoPath?: string | null;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ type: String, maxLength: 120, minLength: 1 })
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
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly slug?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  readonly logoPath?: string | null;
}

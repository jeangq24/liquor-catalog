import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SearchQueryDto } from '../../../common/pagination/pagination.dto.js';
import { PublicProductSort } from '../public-product.constants.js';

export class ListPublicProductsDto extends SearchQueryDto {
  @ApiPropertyOptional({ type: String, maxLength: 140 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly brandSlug?: string;

  @ApiPropertyOptional({ type: String, maxLength: 140 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  readonly categorySlug?: string;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly isFeatured?: boolean;

  @ApiPropertyOptional({
    type: String,
    pattern: '^(0|[1-9][0-9]{0,18})$',
    description: 'Inclusive minimum COP price as a decimal string.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^(0|[1-9][0-9]{0,18})$/)
  readonly minPriceCop?: string;

  @ApiPropertyOptional({
    type: String,
    pattern: '^(0|[1-9][0-9]{0,18})$',
    description: 'Inclusive maximum COP price as a decimal string.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^(0|[1-9][0-9]{0,18})$/)
  readonly maxPriceCop?: string;

  @ApiPropertyOptional({
    enum: Object.values(PublicProductSort),
    default: PublicProductSort.NAME,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(Object.values(PublicProductSort))
  readonly sort?: (typeof PublicProductSort)[keyof typeof PublicProductSort];
}

import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsUUID, ValidateIf } from 'class-validator';
import { SearchQueryDto } from '../../../common/pagination/pagination.dto.js';
import { ProductStatus } from '../product.constants.js';

export class ListProductsDto extends SearchQueryDto {
  @ApiPropertyOptional({
    enum: Object.values(ProductStatus),
    description: 'Filtra por estado del producto.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(Object.values(ProductStatus))
  readonly status?: (typeof ProductStatus)[keyof typeof ProductStatus];

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filtra por UUID de la marca.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  readonly brandId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filtra por UUID de una categoría asociada.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  readonly categoryId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filtra por estado destacado del producto.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly isFeatured?: boolean;
}

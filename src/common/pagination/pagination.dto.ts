import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
} from './pagination.constants.js';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE,
    default: DEFAULT_PAGE,
    description: 'Número de página solicitado, comenzando en 1.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : value,
  )
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  readonly page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    description: `Cantidad de elementos por página; máximo ${MAX_PAGE_SIZE}.`,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : value,
  )
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  readonly limit: number = DEFAULT_PAGE_SIZE;
}

export class SearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 200,
    description:
      'Búsqueda literal, sin distinguir mayúsculas y minúsculas, por subcadena.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(200)
  @Matches(/\S/)
  readonly search?: string;
}

export class ActiveSearchQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filtra por estado activo o inactivo.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly isActive?: boolean;
}

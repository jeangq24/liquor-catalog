import { IsUUID, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveSearchQueryDto } from '../../../common/pagination/pagination.dto.js';

export class ListCategoriesDto extends ActiveSearchQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filtra por UUID de la categoría padre.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  readonly parentId?: string;
}

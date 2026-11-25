import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsUUID, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export class ListImagesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  readonly variantId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly isPrimary?: boolean;
}

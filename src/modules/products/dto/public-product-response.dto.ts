import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto.js';

export class PublicVariantResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ type: 'integer', nullable: true }) volumeMl!: number | null;
  @ApiProperty({ type: 'integer' }) unitsPerPack!: number;
  @ApiProperty({ type: String, description: 'COP as a decimal string.' })
  priceCop!: string;
  @ApiProperty({ type: String, nullable: true }) compareAtPriceCop!:
    string | null;
}

export class PublicImageResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) variantId!:
    string | null;
  @ApiProperty() storagePath!: string;
  @ApiProperty({ type: String, nullable: true }) altText!: string | null;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
}

export class PublicProductResponseDto extends ProductResponseDto {
  @ApiProperty({ type: [PublicVariantResponseDto] })
  variants!: PublicVariantResponseDto[];
  @ApiProperty({ type: [PublicImageResponseDto] })
  images!: PublicImageResponseDto[];
}

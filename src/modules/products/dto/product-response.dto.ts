import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../product.constants.js';

export class ProductResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable del producto.',
  })
  id!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'UUID de la marca asociada.',
  })
  brandId!: string | null;
  @ApiProperty({ description: 'Nombre del producto.' }) name!: string;
  @ApiProperty({ description: 'Slug único del producto.' }) slug!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Descripción corta del producto.',
  })
  shortDescription!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Descripción completa del producto.',
  })
  description!: string | null;
  @ApiProperty({
    enum: Object.values(ProductStatus),
    description: 'Estado del producto en el catálogo.',
  })
  status!: (typeof ProductStatus)[keyof typeof ProductStatus];
  @ApiProperty({
    description: 'Indica si el producto se destaca en el catálogo.',
  })
  isFeatured!: boolean;
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'UUID de las categorías asociadas.',
  })
  categoryIds!: string[];
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fecha de creación en formato ISO 8601.',
  })
  createdAt!: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fecha de la última actualización en formato ISO 8601.',
  })
  updatedAt!: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Fecha de publicación; null si todavía no se ha publicado.',
  })
  publishedAt!: Date | null;
}

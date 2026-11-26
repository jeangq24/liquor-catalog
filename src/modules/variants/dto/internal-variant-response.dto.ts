import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../../products/product.constants.js';

export class InternalVariantResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la variante en Catalog.',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable del producto asociado.',
  })
  productId!: string;

  @ApiProperty({ description: 'Nombre del producto.' })
  productName!: string;

  @ApiProperty({
    enum: Object.values(ProductStatus),
    description: 'Estado actual del producto.',
  })
  productStatus!: (typeof ProductStatus)[keyof typeof ProductStatus];

  @ApiProperty({ description: 'Nombre de la presentación comercial.' })
  variantName!: string;

  @ApiProperty({ description: 'SKU único de la variante.' })
  sku!: string;

  @ApiProperty({
    type: String,
    pattern: '^[1-9][0-9]{0,18}$',
    example: '120000',
    description:
      'Precio vigente en COP como cadena decimal entera, hasta 9223372036854775807.',
  })
  priceCop!: string;

  @ApiProperty({ description: 'Indica si la variante está activa.' })
  isActive!: boolean;

  @ApiProperty({
    description:
      'Solo es true cuando la variante está activa y el producto está publicado.',
  })
  isPurchasable!: boolean;
}

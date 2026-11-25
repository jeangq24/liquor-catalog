import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../../products/product.constants.js';

export class InternalVariantResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Stable Catalog variant identifier.',
  })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty({ enum: Object.values(ProductStatus) })
  productStatus!: (typeof ProductStatus)[keyof typeof ProductStatus];

  @ApiProperty()
  variantName!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty({
    type: String,
    pattern: '^[1-9][0-9]{0,18}$',
    example: '120000',
    description:
      'Current COP price as a decimal string, up to 9223372036854775807.',
  })
  priceCop!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({
    description:
      'True only when the variant is active and the product is published.',
  })
  isPurchasable!: boolean;
}

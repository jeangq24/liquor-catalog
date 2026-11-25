import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../product.constants.js';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) brandId!:
    string | null;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true }) shortDescription!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ enum: Object.values(ProductStatus) })
  status!: (typeof ProductStatus)[keyof typeof ProductStatus];
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty({ type: [String], format: 'uuid' }) categoryIds!: string[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;
}

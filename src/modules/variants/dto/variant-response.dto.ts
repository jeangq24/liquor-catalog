import { ApiProperty } from '@nestjs/swagger';

export class VariantResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ type: String, nullable: true }) barcode!: string | null;
  @ApiProperty({ type: 'integer', nullable: true }) volumeMl!: number | null;
  @ApiProperty({ type: 'integer' }) unitsPerPack!: number;
  @ApiProperty({
    type: String,
    example: '120000',
    description: 'Positive integer COP amount as a decimal string.',
  })
  priceCop!: string;
  @ApiProperty({ type: String, nullable: true }) compareAtPriceCop!:
    string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

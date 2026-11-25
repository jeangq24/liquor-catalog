import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) variantId!:
    string | null;
  @ApiProperty() storagePath!: string;
  @ApiProperty({ type: String, nullable: true }) altText!: string | null;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

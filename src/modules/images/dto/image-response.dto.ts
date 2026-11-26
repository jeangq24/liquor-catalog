import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la referencia de imagen.',
  })
  id!: string;
  @ApiProperty({ format: 'uuid', description: 'UUID del producto asociado.' })
  productId!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'UUID de la variante asociada; null indica una imagen del producto.',
  })
  variantId!: string | null;
  @ApiProperty({
    description: 'Ruta relativa del archivo registrada en PostgreSQL.',
  })
  storagePath!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Texto alternativo de la imagen.',
  })
  altText!: string | null;
  @ApiProperty({
    description: 'Indica si es la imagen principal de su ámbito.',
  })
  isPrimary!: boolean;
  @ApiProperty({ type: 'integer', description: 'Posición de ordenamiento.' })
  sortOrder!: number;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fecha de creación en formato ISO 8601.',
  })
  createdAt!: Date;
}

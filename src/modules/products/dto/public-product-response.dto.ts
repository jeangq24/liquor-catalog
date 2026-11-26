import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto.js';

export class PublicVariantResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la variante.',
  })
  id!: string;
  @ApiProperty({ description: 'Nombre de la presentación comercial.' })
  name!: string;
  @ApiProperty({ description: 'SKU único de la variante.' })
  sku!: string;
  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Volumen en mililitros; null si no aplica.',
  })
  volumeMl!: number | null;
  @ApiProperty({
    type: 'integer',
    description: 'Unidades incluidas por paquete.',
  })
  unitsPerPack!: number;
  @ApiProperty({
    type: String,
    description: 'Precio vigente en COP como cadena decimal entera.',
  })
  priceCop!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Precio de referencia en COP; null si no está definido.',
  })
  compareAtPriceCop!: string | null;
}

export class PublicImageResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la imagen.',
  })
  id!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'UUID de la variante asociada; null indica una imagen del producto.',
  })
  variantId!: string | null;
  @ApiProperty({
    description:
      'Ruta registrada del archivo; no implica que exista almacenamiento conectado.',
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
  @ApiProperty({
    type: 'integer',
    description: 'Posición de ordenamiento de la imagen.',
  })
  sortOrder!: number;
}

export class PublicProductResponseDto extends ProductResponseDto {
  @ApiProperty({
    type: [PublicVariantResponseDto],
    description: 'Variantes activas del producto.',
  })
  variants!: PublicVariantResponseDto[];
  @ApiProperty({
    type: [PublicImageResponseDto],
    description:
      'Imágenes registradas del producto y de sus variantes activas.',
  })
  images!: PublicImageResponseDto[];
}

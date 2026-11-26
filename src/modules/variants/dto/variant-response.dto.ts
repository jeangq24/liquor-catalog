import { ApiProperty } from '@nestjs/swagger';

export class VariantResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la variante.',
  })
  id!: string;
  @ApiProperty({
    format: 'uuid',
    description: 'UUID del producto al que pertenece la variante.',
  })
  productId!: string;
  @ApiProperty({ description: 'Nombre de la presentación comercial.' })
  name!: string;
  @ApiProperty({ description: 'SKU único de la variante.' })
  sku!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Código de barras, si está registrado.',
  })
  barcode!: string | null;
  @ApiProperty({
    type: 'integer',
    nullable: true,
    description: 'Volumen en mililitros; null si no aplica.',
  })
  volumeMl!: number | null;
  @ApiProperty({
    type: 'integer',
    description: 'Cantidad de unidades por paquete.',
  })
  unitsPerPack!: number;
  @ApiProperty({
    type: String,
    example: '120000',
    description: 'Precio vigente positivo en COP como cadena decimal entera.',
  })
  priceCop!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Precio de referencia en COP; debe superar el precio vigente.',
  })
  compareAtPriceCop!: string | null;
  @ApiProperty({ description: 'Indica si la variante está activa.' })
  isActive!: boolean;
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
}

import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la categoría.',
  })
  id!: string;
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'UUID de la categoría padre; null indica una categoría raíz.',
  })
  parentId!: string | null;
  @ApiProperty({ description: 'Nombre de la categoría.' }) name!: string;
  @ApiProperty({ description: 'Slug único de la categoría.' }) slug!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Descripción de la categoría.',
  })
  description!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Ruta de imagen de la categoría, si está registrada.',
  })
  imagePath!: string | null;
  @ApiProperty({ description: 'Indica si la categoría está activa.' })
  isActive!: boolean;
  @ApiProperty({ type: 'integer', description: 'Posición de ordenamiento.' })
  sortOrder!: number;
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

export class CategoryTreeResponseDto extends CategoryResponseDto {
  @ApiProperty({
    type: () => [CategoryTreeResponseDto],
    description: 'Categorías hijas activas.',
  })
  children!: CategoryTreeResponseDto[];
}

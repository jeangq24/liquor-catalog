import { ApiProperty } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador estable de la marca.',
  })
  id!: string;
  @ApiProperty({ description: 'Nombre de la marca.' }) name!: string;
  @ApiProperty({ description: 'Slug único de la marca.' }) slug!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Descripción de la marca.',
  })
  description!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Ruta del logotipo, si está registrada.',
  })
  logoPath!: string | null;
  @ApiProperty({ description: 'Indica si la marca está activa.' })
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

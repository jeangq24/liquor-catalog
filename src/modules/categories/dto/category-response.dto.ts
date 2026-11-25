import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) parentId!:
    string | null;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) imagePath!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: 'integer' }) sortOrder!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export class CategoryTreeResponseDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryTreeResponseDto] })
  children!: CategoryTreeResponseDto[];
}

import { brands } from '../../infrastructure/database/schema/catalog.schema.js';
import type { BrandResponseDto } from './dto/brand-response.dto.js';

export function mapBrand(brand: typeof brands.$inferSelect) {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    logoPath: brand.logoPath,
    isActive: brand.isActive,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  } satisfies BrandResponseDto;
}

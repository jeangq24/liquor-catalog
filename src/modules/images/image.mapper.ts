import type { productImages } from '../../infrastructure/database/schema/catalog.schema.js';

type Image = typeof productImages.$inferSelect;

export function mapImage(image: Image) {
  return {
    id: image.id,
    productId: image.productId,
    variantId: image.variantId,
    storagePath: image.storagePath,
    altText: image.altText,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt,
  };
}

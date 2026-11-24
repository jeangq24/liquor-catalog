import {
  productImages,
  products,
  productVariants,
} from '../../infrastructure/database/schema/catalog.schema.js';

export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;

export function mapProduct(product: Product, categoryIds: string[]) {
  return {
    id: product.id,
    brandId: product.brandId,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    status: product.status,
    isFeatured: product.isFeatured,
    categoryIds,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    publishedAt: product.publishedAt,
  };
}

export function mapPublicProduct(
  product: Product,
  categoryIds: string[],
  variants: ProductVariant[],
  images: ProductImage[],
) {
  const activeIds = new Set(variants.map((variant) => variant.id));
  return {
    ...mapProduct(product, categoryIds),
    variants: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      volumeMl: variant.volumeMl,
      unitsPerPack: variant.unitsPerPack,
      priceCop: variant.priceCop.toString(),
      compareAtPriceCop: variant.compareAtPriceCop?.toString() ?? null,
    })),
    images: images
      .filter(
        (image) => image.variantId === null || activeIds.has(image.variantId),
      )
      .map((image) => ({
        id: image.id,
        variantId: image.variantId,
        storagePath: image.storagePath,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
  };
}

import type { productVariants } from '../../infrastructure/database/schema/catalog.schema.js';

export type Variant = typeof productVariants.$inferSelect;

export function mapVariant(variant: Variant) {
  return {
    ...variant,
    priceCop: variant.priceCop.toString(),
    compareAtPriceCop: variant.compareAtPriceCop?.toString() ?? null,
  };
}

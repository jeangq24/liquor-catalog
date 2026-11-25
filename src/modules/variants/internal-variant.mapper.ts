import type {
  products,
  productVariants,
} from '../../infrastructure/database/schema/catalog.schema.js';
import { ProductStatus } from '../products/product.constants.js';
import type { InternalVariantResponseDto } from './dto/internal-variant-response.dto.js';

interface InternalVariantRow {
  id: typeof productVariants.$inferSelect.id;
  productId: typeof products.$inferSelect.id;
  productName: typeof products.$inferSelect.name;
  productStatus: typeof products.$inferSelect.status;
  variantName: typeof productVariants.$inferSelect.name;
  sku: typeof productVariants.$inferSelect.sku;
  priceCop: typeof productVariants.$inferSelect.priceCop;
  isActive: typeof productVariants.$inferSelect.isActive;
}

export function mapInternalVariant(row: InternalVariantRow) {
  return {
    ...row,
    priceCop: row.priceCop.toString(),
    isPurchasable:
      row.isActive && row.productStatus === ProductStatus.PUBLISHED,
  } satisfies InternalVariantResponseDto;
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lte,
  sql,
} from 'drizzle-orm';
import { MAX_COP_PRICE } from '../../common/money/price.constants.js';
import {
  mapPage,
  pageOffset,
  searchPattern,
} from '../../common/pagination/page.js';
import type {
  Database,
  DatabaseExecutor,
  DatabaseTransaction,
} from '../../infrastructure/database/database.types.js';
import {
  brands,
  categories,
  productCategories,
  productImages,
  products,
  productVariants,
} from '../../infrastructure/database/schema/catalog.schema.js';
import type { ListPublicProductsDto } from './dto/list-public-products.dto.js';
import { ProductStatus } from './product.constants.js';
import { mapPublicProduct, type Product } from './product.mapper.js';
import { PublicProductSort } from './public-product.constants.js';

interface ProductScope {
  readonly brandSlug?: string;
  readonly categorySlug?: string;
}

@Injectable()
export class PublicProductsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(query: ListPublicProductsDto, scope: ProductScope = {}) {
    const minPrice =
      query.minPriceCop === undefined ? undefined : BigInt(query.minPriceCop);
    const maxPrice =
      query.maxPriceCop === undefined ? undefined : BigInt(query.maxPriceCop);
    if (
      (minPrice !== undefined && minPrice > MAX_COP_PRICE) ||
      (maxPrice !== undefined && maxPrice > MAX_COP_PRICE) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    ) {
      throw new BadRequestException('Invalid COP price range');
    }

    return this.db.transaction(
      async (tx) => {
        await this.validateScope(tx, scope);
        const filter = and(
          eq(products.status, ProductStatus.PUBLISHED),
          query.search === undefined
            ? undefined
            : ilike(products.name, searchPattern(query.search)),
          query.isFeatured === undefined
            ? undefined
            : eq(products.isFeatured, query.isFeatured),
          ...[scope.brandSlug, query.brandSlug].map((slug) =>
            slug === undefined ? undefined : this.brandFilter(tx, slug),
          ),
          ...[scope.categorySlug, query.categorySlug].map((slug) =>
            slug === undefined ? undefined : this.categoryFilter(tx, slug),
          ),
          exists(
            tx
              .select({ id: productVariants.id })
              .from(productVariants)
              .where(
                and(
                  eq(productVariants.productId, products.id),
                  eq(productVariants.isActive, true),
                  minPrice === undefined
                    ? undefined
                    : gte(productVariants.priceCop, minPrice),
                  maxPrice === undefined
                    ? undefined
                    : lte(productVariants.priceCop, maxPrice),
                ),
              ),
          ),
        );
        const [{ total }] = await tx
          .select({ total: count() })
          .from(products)
          .where(filter);
        const minimumActivePrice = sql<bigint>`(select min(${productVariants.priceCop}) from ${productVariants} where ${productVariants.productId} = ${products.id} and ${productVariants.isActive} = true)`;
        const order =
          query.sort === PublicProductSort.PRICE_ASC
            ? [asc(minimumActivePrice), asc(products.name), asc(products.id)]
            : query.sort === PublicProductSort.PRICE_DESC
              ? [desc(minimumActivePrice), asc(products.name), asc(products.id)]
              : query.sort === PublicProductSort.NEWEST
                ? [
                    sql`${products.publishedAt} desc nulls last`,
                    asc(products.id),
                  ]
                : [asc(products.name), asc(products.id)];
        const rows = await tx
          .select()
          .from(products)
          .where(filter)
          .orderBy(...order)
          .limit(query.limit)
          .offset(pageOffset(query));
        return mapPage(await this.mapProducts(rows, tx), total, query);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async findBySlug(slug: string) {
    return this.db.transaction(
      async (tx) => {
        const [product] = await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.slug, slug),
              eq(products.status, ProductStatus.PUBLISHED),
            ),
          );
        if (!product) throw new NotFoundException('Product not found');
        return (await this.mapProducts([product], tx))[0];
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  private brandFilter(tx: DatabaseTransaction, slug: string) {
    return exists(
      tx
        .select({ id: brands.id })
        .from(brands)
        .where(
          and(
            eq(brands.id, products.brandId),
            eq(brands.slug, slug),
            eq(brands.isActive, true),
          ),
        ),
    );
  }

  private categoryFilter(tx: DatabaseTransaction, slug: string) {
    return exists(
      tx
        .select({ id: productCategories.categoryId })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(
          and(
            eq(productCategories.productId, products.id),
            eq(categories.slug, slug),
            eq(categories.isActive, true),
          ),
        ),
    );
  }

  private async validateScope(tx: DatabaseTransaction, scope: ProductScope) {
    if (scope.brandSlug !== undefined) {
      const [brand] = await tx
        .select({ id: brands.id })
        .from(brands)
        .where(
          and(eq(brands.slug, scope.brandSlug), eq(brands.isActive, true)),
        );
      if (!brand) throw new NotFoundException('Brand not found');
    }
    if (scope.categorySlug !== undefined) {
      const [category] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.slug, scope.categorySlug),
            eq(categories.isActive, true),
          ),
        );
      if (!category) throw new NotFoundException('Category not found');
    }
  }

  private async mapProducts(rows: Product[], executor: DatabaseExecutor) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const relations = await executor
      .select({
        productId: productCategories.productId,
        categoryId: productCategories.categoryId,
      })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(
        and(
          inArray(productCategories.productId, ids),
          eq(categories.isActive, true),
        ),
      )
      .orderBy(productCategories.categoryId);
    const variants = await executor
      .select()
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productId, ids),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(productVariants.name, productVariants.id);
    const images = await executor
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(productImages.sortOrder, productImages.id);
    return rows.map((row) =>
      mapPublicProduct(
        row,
        relations
          .filter((item) => item.productId === row.id)
          .map((item) => item.categoryId),
        variants.filter((variant) => variant.productId === row.id),
        images.filter((image) => image.productId === row.id),
      ),
    );
  }
}

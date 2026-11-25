import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, ilike, ne, or } from 'drizzle-orm';
import { rethrowCatalogDatabaseError } from '../../common/database/database-error.js';
import { MAX_COP_PRICE } from '../../common/money/price.constants.js';
import {
  mapPage,
  pageOffset,
  searchPattern,
} from '../../common/pagination/page.js';
import type { ActiveSearchQueryDto } from '../../common/pagination/pagination.dto.js';
import type {
  Database,
  DatabaseTransaction,
} from '../../infrastructure/database/database.types.js';
import {
  products,
  productVariants,
} from '../../infrastructure/database/schema/catalog.schema.js';
import { ProductStatus } from '../products/product.constants.js';
import type { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';
import { mapVariant } from './variant.mapper.js';

@Injectable()
export class VariantsService {
  private readonly logger = new Logger(VariantsService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(productId: string, query: ActiveSearchQueryDto) {
    const filter = and(
      eq(productVariants.productId, productId),
      query.isActive === undefined
        ? undefined
        : eq(productVariants.isActive, query.isActive),
      query.search === undefined
        ? undefined
        : or(
            ilike(productVariants.name, searchPattern(query.search)),
            ilike(productVariants.sku, searchPattern(query.search)),
            ilike(productVariants.barcode, searchPattern(query.search)),
          ),
    );
    return this.db.transaction(
      async (tx) => {
        const [product] = await tx
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, productId));
        if (!product) throw new NotFoundException('Product not found');
        const [{ total }] = await tx
          .select({ total: count() })
          .from(productVariants)
          .where(filter);
        const rows = await tx
          .select()
          .from(productVariants)
          .where(filter)
          .orderBy(productVariants.name, productVariants.id)
          .limit(query.limit)
          .offset(pageOffset(query));
        return mapPage(rows.map(mapVariant), total, query);
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async find(id: string) {
    const [variant] = await this.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, id));
    if (!variant) throw new NotFoundException('Variant not found');
    return mapVariant(variant);
  }

  async findInternal(id: string) {
    const [row] = await this.db
      .select({
        id: productVariants.id,
        productId: products.id,
        productName: products.name,
        productStatus: products.status,
        variantName: productVariants.name,
        sku: productVariants.sku,
        priceCop: productVariants.priceCop,
        isActive: productVariants.isActive,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(productVariants.id, id));
    if (!row) throw new NotFoundException('Variant not found');
    return {
      ...row,
      priceCop: row.priceCop.toString(),
      isPurchasable:
        row.isActive && row.productStatus === ProductStatus.PUBLISHED,
    };
  }

  async create(productId: string, dto: CreateVariantDto, actor: string) {
    const price = BigInt(dto.priceCop);
    const comparePrice =
      dto.compareAtPriceCop == null ? null : BigInt(dto.compareAtPriceCop);
    this.validatePrices(price, comparePrice);
    try {
      const variant = await this.db.transaction(async (tx) => {
        await this.lockProduct(tx, productId);
        const [created] = await tx
          .insert(productVariants)
          .values({
            productId,
            name: dto.name,
            sku: dto.sku,
            barcode: dto.barcode,
            volumeMl: dto.volumeMl,
            unitsPerPack: dto.unitsPerPack,
            priceCop: price,
            compareAtPriceCop: comparePrice,
          })
          .returning();
        return created;
      });
      this.audit('create', variant.id, actor);
      return mapVariant(variant);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateVariantDto, actor: string) {
    try {
      const result = await this.db.transaction(async (tx) => {
        const { variant } = await this.lockVariant(tx, id);
        const price =
          dto.priceCop === undefined ? variant.priceCop : BigInt(dto.priceCop);
        const comparePrice =
          dto.compareAtPriceCop === undefined
            ? variant.compareAtPriceCop
            : dto.compareAtPriceCop === null
              ? null
              : BigInt(dto.compareAtPriceCop);
        this.validatePrices(price, comparePrice);
        const [updated] = await tx
          .update(productVariants)
          .set({
            name: dto.name,
            sku: dto.sku,
            barcode: dto.barcode,
            volumeMl: dto.volumeMl,
            unitsPerPack: dto.unitsPerPack,
            priceCop: price,
            compareAtPriceCop: comparePrice,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, id))
          .returning();
        return updated;
      });
      this.audit(
        dto.priceCop !== undefined || dto.compareAtPriceCop !== undefined
          ? 'update-price'
          : 'update',
        id,
        actor,
      );
      return mapVariant(result);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async setActive(id: string, isActive: boolean, actor: string) {
    const variant = await this.db.transaction(async (tx) => {
      const current = await this.lockVariant(tx, id);
      if (current.variant.isActive === isActive) return current.variant;
      if (!isActive && current.product.status === ProductStatus.PUBLISHED) {
        const [other] = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, current.product.id),
              eq(productVariants.isActive, true),
              ne(productVariants.id, id),
            ),
          )
          .limit(1);
        if (!other)
          throw new ConflictException(
            'Published product requires an active variant',
          );
      }
      const [updated] = await tx
        .update(productVariants)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(productVariants.id, id))
        .returning();
      return updated;
    });
    this.audit(isActive ? 'activate' : 'deactivate', id, actor);
    return mapVariant(variant);
  }

  private async lockProduct(tx: DatabaseTransaction, id: string) {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, id))
      .for('update');
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async lockVariant(tx: DatabaseTransaction, id: string) {
    const [reference] = await tx
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.id, id));
    if (!reference) throw new NotFoundException('Variant not found');
    const product = await this.lockProduct(tx, reference.productId);
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, id))
      .for('update');
    if (!variant) throw new NotFoundException('Variant not found');
    return { product, variant };
  }

  private validatePrices(price: bigint, comparePrice: bigint | null) {
    if (
      price <= 0n ||
      price > MAX_COP_PRICE ||
      (comparePrice !== null &&
        (comparePrice > MAX_COP_PRICE || comparePrice <= price))
    ) {
      throw new BadRequestException(
        'Prices must fit PostgreSQL BIGINT; reference price must exceed the current price',
      );
    }
  }

  private audit(action: string, resourceId: string, actor: string) {
    this.logger.log({
      action: `catalog.variants.${action}`,
      resourceId,
      actor,
    });
  }
}

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { rethrowCatalogDatabaseError } from '../../common/database/database-error.js';
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
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductStatus } from './product.constants.js';
import {
  mapProduct,
  mapPublicProduct,
  type Product,
} from './product.mapper.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list() {
    const rows = await this.db
      .select()
      .from(products)
      .orderBy(products.name, products.id);
    return this.mapProducts(rows, this.db);
  }

  async findById(id: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id));
    if (!product) throw new NotFoundException('Product not found');
    return (await this.mapProducts([product], this.db))[0];
  }

  async findBySlug(slug: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.slug, slug));
    if (!product) throw new NotFoundException('Product not found');
    return (await this.mapProducts([product], this.db))[0];
  }

  async listPublic() {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.status, ProductStatus.PUBLISHED))
      .orderBy(products.name, products.id);
    return this.mapPublicProducts(rows);
  }

  async findPublicBySlug(slug: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.slug, slug),
          eq(products.status, ProductStatus.PUBLISHED),
        ),
      );
    if (!product) throw new NotFoundException('Product not found');
    return (await this.mapPublicProducts([product]))[0];
  }

  async create(dto: CreateProductDto, actor: string) {
    try {
      const result = await this.db.transaction(async (tx) => {
        await this.validateReferences(tx, dto.brandId, dto.categoryIds);
        const [product] = await tx
          .insert(products)
          .values({
            name: dto.name,
            slug: dto.slug,
            brandId: dto.brandId,
            shortDescription: dto.shortDescription,
            description: dto.description,
            isFeatured: dto.isFeatured,
          })
          .returning();
        await this.replaceCategories(tx, product.id, dto.categoryIds ?? []);
        return (await this.mapProducts([product], tx))[0];
      });
      this.audit('create', result.id, actor);
      return result;
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateProductDto, actor: string) {
    try {
      const result = await this.db.transaction(async (tx) => {
        await this.lockProduct(tx, id);
        await this.validateReferences(tx, dto.brandId, dto.categoryIds);
        const [product] = await tx
          .update(products)
          .set({
            name: dto.name,
            slug: dto.slug,
            brandId: dto.brandId,
            shortDescription: dto.shortDescription,
            description: dto.description,
            isFeatured: dto.isFeatured,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id))
          .returning();
        if (dto.categoryIds !== undefined) {
          await this.replaceCategories(tx, id, dto.categoryIds);
        }
        return (await this.mapProducts([product], tx))[0];
      });
      this.audit('update', id, actor);
      return result;
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async publish(id: string, actor: string) {
    const result = await this.db.transaction(async (tx) => {
      const current = await this.lockProduct(tx, id);
      const [variant] = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, id),
            eq(productVariants.isActive, true),
          ),
        )
        .limit(1)
        .for('update');
      if (!variant)
        throw new ConflictException('Product requires an active variant');
      if (current.status === ProductStatus.PUBLISHED) {
        return (await this.mapProducts([current], tx))[0];
      }
      const now = new Date();
      const [product] = await tx
        .update(products)
        .set({
          status: ProductStatus.PUBLISHED,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(products.id, id))
        .returning();
      return (await this.mapProducts([product], tx))[0];
    });
    this.audit('publish', id, actor);
    return result;
  }

  async archive(id: string, actor: string) {
    const result = await this.db.transaction(async (tx) => {
      const current = await this.lockProduct(tx, id);
      if (current.status === ProductStatus.ARCHIVED) {
        return (await this.mapProducts([current], tx))[0];
      }
      const [product] = await tx
        .update(products)
        .set({ status: ProductStatus.ARCHIVED, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      return (await this.mapProducts([product], tx))[0];
    });
    this.audit('archive', id, actor);
    return result;
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

  private async validateReferences(
    tx: DatabaseTransaction,
    brandId: string | null | undefined,
    categoryIds: string[] | undefined,
  ) {
    if (brandId) {
      const [brand] = await tx
        .select({ id: brands.id })
        .from(brands)
        .where(eq(brands.id, brandId))
        .for('key share');
      if (!brand) throw new NotFoundException('Brand not found');
    }
    if (categoryIds?.length) {
      const found = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(inArray(categories.id, categoryIds))
        .for('key share');
      if (found.length !== categoryIds.length) {
        throw new NotFoundException('One or more categories were not found');
      }
    }
  }

  private async replaceCategories(
    tx: DatabaseTransaction,
    productId: string,
    categoryIds: string[],
  ) {
    await tx
      .delete(productCategories)
      .where(eq(productCategories.productId, productId));
    if (categoryIds.length) {
      await tx
        .insert(productCategories)
        .values(categoryIds.map((categoryId) => ({ productId, categoryId })));
    }
  }

  private async mapProducts(rows: Product[], executor: DatabaseExecutor) {
    if (!rows.length) return [];
    const relations = await executor
      .select({
        productId: productCategories.productId,
        categoryId: productCategories.categoryId,
      })
      .from(productCategories)
      .where(
        inArray(
          productCategories.productId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(productCategories.categoryId);
    return rows.map((row) =>
      mapProduct(
        row,
        relations
          .filter((item) => item.productId === row.id)
          .map((item) => item.categoryId),
      ),
    );
  }

  private async mapPublicProducts(rows: Product[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const relations = await this.db
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
    const variants = await this.db
      .select()
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productId, ids),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(productVariants.name, productVariants.id);
    const images = await this.db
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

  private audit(action: string, resourceId: string, actor: string) {
    this.logger.log({
      action: `catalog.products.${action}`,
      resourceId,
      actor,
    });
  }
}

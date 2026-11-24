import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { rethrowCatalogDatabaseError } from '../../common/database/database-error.js';
import type {
  Database,
  DatabaseTransaction,
} from '../../infrastructure/database/database.types.js';
import {
  productImages,
  products,
  productVariants,
} from '../../infrastructure/database/schema/catalog.schema.js';
import type { CreateImageDto, UpdateImageDto } from './dto/image.dto.js';
import { mapImage } from './image.mapper.js';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(productId: string) {
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) throw new NotFoundException('Product not found');
    const images = await this.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder, productImages.id);
    return images.map(mapImage);
  }

  async find(id: string) {
    const [image] = await this.db
      .select()
      .from(productImages)
      .where(eq(productImages.id, id));
    if (!image) throw new NotFoundException('Image not found');
    return mapImage(image);
  }

  async create(productId: string, dto: CreateImageDto, actor: string) {
    try {
      const image = await this.db.transaction(async (tx) => {
        await this.lockProduct(tx, productId);
        const variantId = dto.variantId ?? null;
        await this.validateVariant(tx, productId, variantId);
        if (dto.isPrimary) await this.clearPrimary(tx, productId, variantId);
        const [created] = await tx
          .insert(productImages)
          .values({
            productId,
            variantId,
            storagePath: dto.storagePath,
            altText: dto.altText,
            isPrimary: dto.isPrimary,
            sortOrder: dto.sortOrder,
          })
          .returning();
        return created;
      });
      this.audit('create', image.id, actor);
      return mapImage(image);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateImageDto, actor: string) {
    try {
      const image = await this.db.transaction(async (tx) => {
        const current = await this.lockImage(tx, id);
        const variantId =
          dto.variantId === undefined ? current.variantId : dto.variantId;
        await this.validateVariant(tx, current.productId, variantId);
        const isPrimary = dto.isPrimary ?? current.isPrimary;
        if (isPrimary) {
          await this.clearPrimary(tx, current.productId, variantId, id);
        }
        const [updated] = await tx
          .update(productImages)
          .set({
            variantId,
            altText: dto.altText,
            isPrimary,
            sortOrder: dto.sortOrder,
          })
          .where(eq(productImages.id, id))
          .returning();
        return updated;
      });
      this.audit('update', id, actor);
      return mapImage(image);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async remove(id: string): Promise<never> {
    await this.find(id);
    throw new ServiceUnavailableException(
      'Image deletion is unavailable until storage is integrated',
    );
  }

  private async lockProduct(tx: DatabaseTransaction, id: string) {
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .for('update');
    if (!product) throw new NotFoundException('Product not found');
  }

  private async lockImage(tx: DatabaseTransaction, id: string) {
    const [reference] = await tx
      .select({ productId: productImages.productId })
      .from(productImages)
      .where(eq(productImages.id, id));
    if (!reference) throw new NotFoundException('Image not found');
    await this.lockProduct(tx, reference.productId);
    const [image] = await tx
      .select()
      .from(productImages)
      .where(eq(productImages.id, id))
      .for('update');
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  private async validateVariant(
    tx: DatabaseTransaction,
    productId: string,
    variantId: string | null,
  ) {
    if (variantId === null) return;
    const [variant] = await tx
      .select({ productId: productVariants.productId })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .for('key share');
    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.productId !== productId) {
      throw new BadRequestException('Variant does not belong to this product');
    }
  }

  private async clearPrimary(
    tx: DatabaseTransaction,
    productId: string,
    variantId: string | null,
    exceptId?: string,
  ) {
    await tx
      .update(productImages)
      .set({ isPrimary: false })
      .where(
        and(
          eq(productImages.productId, productId),
          variantId === null
            ? isNull(productImages.variantId)
            : eq(productImages.variantId, variantId),
          eq(productImages.isPrimary, true),
          exceptId === undefined ? undefined : ne(productImages.id, exceptId),
        ),
      );
  }

  private audit(action: string, resourceId: string, actor: string) {
    this.logger.log({ action: `catalog.images.${action}`, resourceId, actor });
  }
}

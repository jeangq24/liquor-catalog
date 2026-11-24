import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import { rethrowCatalogDatabaseError } from '../../common/database/database-error.js';
import type { Database } from '../../infrastructure/database/database.types.js';
import { brands } from '../../infrastructure/database/schema/catalog.schema.js';
import { mapBrand } from './brand.mapper.js';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto.js';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(publicOnly = false) {
    const rows = publicOnly
      ? await this.db
          .select()
          .from(brands)
          .where(eq(brands.isActive, true))
          .orderBy(brands.name, brands.id)
      : await this.db.select().from(brands).orderBy(brands.name, brands.id);
    return rows.map(mapBrand);
  }

  async findById(id: string) {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, id));
    if (!brand) throw new NotFoundException('Brand not found');
    return mapBrand(brand);
  }

  async create(dto: CreateBrandDto, actor: string) {
    try {
      const [brand] = await this.db.insert(brands).values(dto).returning();
      this.audit('create', brand.id, actor);
      return mapBrand(brand);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateBrandDto, actor: string) {
    try {
      const [brand] = await this.db
        .update(brands)
        .set({
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          logoPath: dto.logoPath,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, id))
        .returning();
      if (!brand) throw new NotFoundException('Brand not found');
      this.audit('update', id, actor);
      return mapBrand(brand);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async setActive(id: string, isActive: boolean, actor: string) {
    const [brand] = await this.db
      .update(brands)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    if (!brand) throw new NotFoundException('Brand not found');
    this.audit(isActive ? 'activate' : 'deactivate', id, actor);
    return mapBrand(brand);
  }

  private audit(action: string, resourceId: string, actor: string) {
    this.logger.log({ action: `catalog.brands.${action}`, resourceId, actor });
  }
}

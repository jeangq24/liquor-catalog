import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq, sql } from 'drizzle-orm';
import { rethrowCatalogDatabaseError } from '../../common/database/database-error.js';
import type { Database } from '../../infrastructure/database/database.types.js';
import { categories } from '../../infrastructure/database/schema/catalog.schema.js';
import { mapCategory, type CategoryTreeNode } from './category.mapper.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';

// Serializa las escrituras jerárquicas entre instancias de Catalog.
const CATEGORY_LOCK_NAMESPACE = 1128354865;
const CATEGORY_LOCK_KEY = 1;
type Category = typeof categories.$inferSelect;

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  async list(publicOnly = false) {
    const rows = publicOnly
      ? await this.db
          .select()
          .from(categories)
          .where(eq(categories.isActive, true))
          .orderBy(categories.sortOrder, categories.name, categories.id)
      : await this.db
          .select()
          .from(categories)
          .orderBy(categories.sortOrder, categories.name, categories.id);
    return rows.map(mapCategory);
  }

  async tree(publicOnly = false): Promise<CategoryTreeNode[]> {
    const rows = await this.list(publicOnly);
    const nodes = new Map<string, CategoryTreeNode>(
      rows.map((category) => [category.id, { ...category, children: [] }]),
    );
    const roots: CategoryTreeNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else if (!node.parentId) roots.push(node);
    }
    return roots;
  }

  async findById(id: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    if (!category) throw new NotFoundException('Category not found');
    return mapCategory(category);
  }

  async findBySlug(slug: string) {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug));
    if (!category) throw new NotFoundException('Category not found');
    return mapCategory(category);
  }

  async create(dto: CreateCategoryDto, actor: string) {
    try {
      const result = await this.db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(${CATEGORY_LOCK_NAMESPACE}, ${CATEGORY_LOCK_KEY})`,
        );
        const all = await tx.select().from(categories);
        this.validateParent(all, null, dto.parentId ?? null, true);
        const [category] = await tx.insert(categories).values(dto).returning();
        return category;
      });
      this.audit('create', result.id, actor);
      return mapCategory(result);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto, actor: string) {
    try {
      const result = await this.db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(${CATEGORY_LOCK_NAMESPACE}, ${CATEGORY_LOCK_KEY})`,
        );
        const all = await tx.select().from(categories);
        const current = all.find((category) => category.id === id);
        if (!current) throw new NotFoundException('Category not found');
        this.validateParent(
          all,
          id,
          dto.parentId === undefined ? current.parentId : dto.parentId,
          current.isActive,
        );
        const [category] = await tx
          .update(categories)
          .set({
            name: dto.name,
            slug: dto.slug,
            parentId: dto.parentId,
            description: dto.description,
            imagePath: dto.imagePath,
            sortOrder: dto.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, id))
          .returning();
        return category;
      });
      this.audit('update', id, actor);
      return mapCategory(result);
    } catch (error) {
      rethrowCatalogDatabaseError(error);
    }
  }

  async setActive(id: string, isActive: boolean, actor: string) {
    const result = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(${CATEGORY_LOCK_NAMESPACE}, ${CATEGORY_LOCK_KEY})`,
      );
      const all = await tx.select().from(categories);
      const current = all.find((category) => category.id === id);
      if (!current) throw new NotFoundException('Category not found');
      if (isActive) this.validateParent(all, id, current.parentId, true);
      else if (this.hasActiveDescendant(all, id)) {
        throw new ConflictException('Category has active subcategories');
      }
      const [category] = await tx
        .update(categories)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();
      return category;
    });
    this.audit(isActive ? 'activate' : 'deactivate', id, actor);
    return mapCategory(result);
  }

  private validateParent(
    all: Category[],
    id: string | null,
    parentId: string | null,
    active: boolean,
  ) {
    if (!parentId) return;
    const byId = new Map(all.map((category) => [category.id, category]));
    const parent = byId.get(parentId);
    if (!parent) throw new NotFoundException('Parent category not found');
    if (active && !parent.isActive)
      throw new BadRequestException('Parent category is inactive');
    const visited = new Set<string>();
    let current: Category | undefined = parent;
    while (current) {
      if (current.id === id || visited.has(current.id)) {
        throw new BadRequestException(
          'Category hierarchy cannot contain cycles',
        );
      }
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }

  private hasActiveDescendant(all: Category[], id: string): boolean {
    const descendants = new Set([id]);
    let previousSize = 0;
    while (descendants.size !== previousSize) {
      previousSize = descendants.size;
      for (const category of all) {
        if (category.parentId && descendants.has(category.parentId)) {
          if (category.isActive) return true;
          descendants.add(category.id);
        }
      }
    }
    return false;
  }

  private audit(action: string, resourceId: string, actor: string) {
    this.logger.log({
      action: `catalog.categories.${action}`,
      resourceId,
      actor,
    });
  }
}

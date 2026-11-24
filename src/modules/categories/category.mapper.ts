import { categories } from '../../infrastructure/database/schema/catalog.schema.js';

export function mapCategory(category: typeof categories.$inferSelect) {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imagePath: category.imagePath,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export interface CategoryTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryTreeNode[];
}

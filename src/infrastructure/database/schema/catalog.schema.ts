import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const catalogSchema = pgSchema('catalog');

export const productStatusEnum = catalogSchema.enum('product_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

export const brands = catalogSchema.table('brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 140 }).notNull().unique(),
  description: text('description'),
  logoPath: text('logo_path'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

export const categories = catalogSchema.table(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull().unique(),
    description: text('description'),
    imagePath: text('image_path'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    parentForeignKey: foreignKey({
      name: 'fk_categories_parent',
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('restrict'),
    parentCheck: check(
      'chk_category_not_own_parent',
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),
    parentIndex: index('idx_categories_parent').on(table.parentId),
    activeSortIndex: index('idx_categories_active_order').on(
      table.isActive,
      table.sortOrder,
    ),
  }),
);

export const products = catalogSchema.table(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id'),
    name: varchar('name', { length: 180 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    shortDescription: varchar('short_description', { length: 300 }),
    description: text('description'),
    status: productStatusEnum('status').notNull().default('DRAFT'),
    isFeatured: boolean('is_featured').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => ({
    brandForeignKey: foreignKey({
      name: 'fk_products_brand',
      columns: [table.brandId],
      foreignColumns: [brands.id],
    }).onDelete('restrict'),
    brandIndex: index('idx_products_brand').on(table.brandId),
    statusIndex: index('idx_products_status').on(table.status),
    featuredIndex: index('idx_products_featured')
      .on(table.isFeatured)
      .where(sql`${table.isFeatured} = TRUE`),
  }),
);

export const productVariants = catalogSchema.table(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    sku: varchar('sku', { length: 80 }).notNull().unique(),
    barcode: varchar('barcode', { length: 80 }).unique(),
    volumeMl: integer('volume_ml'),
    unitsPerPack: integer('units_per_pack').notNull().default(1),
    priceCop: bigint('price_cop', { mode: 'bigint' }).notNull(),
    compareAtPriceCop: bigint('compare_at_price_cop', { mode: 'bigint' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productForeignKey: foreignKey({
      name: 'fk_variants_product',
      columns: [table.productId],
      foreignColumns: [products.id],
    }).onDelete('restrict'),
    productAndIdUnique: unique('uq_product_variants_id_product').on(
      table.id,
      table.productId,
    ),
    volumeCheck: check(
      'chk_variant_volume',
      sql`${table.volumeMl} IS NULL OR ${table.volumeMl} > 0`,
    ),
    packQuantityCheck: check(
      'chk_variant_pack_quantity',
      sql`${table.unitsPerPack} > 0`,
    ),
    priceCheck: check('chk_variant_price', sql`${table.priceCop} > 0`),
    comparePriceCheck: check(
      'chk_variant_compare_price',
      sql`${table.compareAtPriceCop} IS NULL OR ${table.compareAtPriceCop} > ${table.priceCop}`,
    ),
    productIndex: index('idx_variants_product').on(table.productId),
    activeIndex: index('idx_variants_active').on(
      table.productId,
      table.isActive,
    ),
    priceIndex: index('idx_variants_price').on(table.priceCop),
  }),
);

export const productCategories = catalogSchema.table(
  'product_categories',
  {
    productId: uuid('product_id').notNull(),
    categoryId: uuid('category_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({
      name: 'pk_product_categories',
      columns: [table.productId, table.categoryId],
    }),
    productForeignKey: foreignKey({
      name: 'fk_product_categories_product',
      columns: [table.productId],
      foreignColumns: [products.id],
    }).onDelete('cascade'),
    categoryForeignKey: foreignKey({
      name: 'fk_product_categories_category',
      columns: [table.categoryId],
      foreignColumns: [categories.id],
    }).onDelete('restrict'),
    categoryIndex: index('idx_product_categories_category').on(
      table.categoryId,
    ),
  }),
);

export const productImages = catalogSchema.table(
  'product_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id'),
    storagePath: text('storage_path').notNull().unique(),
    altText: varchar('alt_text', { length: 200 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productForeignKey: foreignKey({
      name: 'fk_product_images_product',
      columns: [table.productId],
      foreignColumns: [products.id],
    }).onDelete('cascade'),
    variantProductForeignKey: foreignKey({
      name: 'fk_product_images_variant_product',
      columns: [table.variantId, table.productId],
      foreignColumns: [productVariants.id, productVariants.productId],
    }).onDelete('restrict'),
    productOrderIndex: index('idx_product_images_product_order').on(
      table.productId,
      table.sortOrder,
    ),
    variantOrderIndex: index('idx_product_images_variant_order')
      .on(table.variantId, table.sortOrder)
      .where(sql`${table.variantId} IS NOT NULL`),
    productPrimaryUnique: uniqueIndex('uq_product_primary_image')
      .on(table.productId)
      .where(sql`${table.variantId} IS NULL AND ${table.isPrimary} = TRUE`),
    variantPrimaryUnique: uniqueIndex('uq_variant_primary_image')
      .on(table.variantId)
      .where(sql`${table.variantId} IS NOT NULL AND ${table.isPrimary} = TRUE`),
  }),
);

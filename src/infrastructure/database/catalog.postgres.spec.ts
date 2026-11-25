import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Catalog PostgreSQL schema', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  it('creates the six catalog tables and product status enum', async () => {
    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'catalog' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'brands',
      'categories',
      'product_categories',
      'product_images',
      'product_variants',
      'products',
    ]);

    const statuses = await client.query<{ enumlabel: string }>(
      `SELECT e.enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'catalog' AND t.typname = 'product_status'
       ORDER BY e.enumsortorder`,
    );
    expect(statuses.rows.map((row) => row.enumlabel)).toEqual([
      'DRAFT',
      'PUBLISHED',
      'ARCHIVED',
    ]);
  });

  it('enforces internal relationships and prevents mismatched variant images', async () => {
    const brand = await client.query<{ id: string }>(
      `INSERT INTO catalog.brands (name, slug) VALUES ('Brand', 'brand') RETURNING id`,
    );
    const category = await client.query<{ id: string }>(
      `INSERT INTO catalog.categories (name, slug) VALUES ('Category', 'category') RETURNING id`,
    );
    const product = await client.query<{ id: string }>(
      `INSERT INTO catalog.products (name, slug, brand_id)
       VALUES ('Product', 'product', $1) RETURNING id`,
      [brand.rows[0].id],
    );
    const otherProduct = await client.query<{ id: string }>(
      `INSERT INTO catalog.products (name, slug)
       VALUES ('Other', 'other') RETURNING id`,
    );
    const variant = await client.query<{ id: string }>(
      `INSERT INTO catalog.product_variants (product_id, name, sku, price_cop)
       VALUES ($1, 'Variant', 'SKU', 1000) RETURNING id`,
      [product.rows[0].id],
    );
    await client.query(
      'INSERT INTO catalog.product_categories (product_id, category_id) VALUES ($1, $2)',
      [product.rows[0].id, category.rows[0].id],
    );
    await client.query(
      `INSERT INTO catalog.product_images (product_id, variant_id, storage_path)
       VALUES ($1, $2, 'valid-image')`,
      [product.rows[0].id, variant.rows[0].id],
    );
    await expect(
      client.query(
        `INSERT INTO catalog.product_images (product_id, variant_id, storage_path)
         VALUES ($1, $2, 'invalid-image')`,
        [otherProduct.rows[0].id, variant.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it.each([
    ['zero price', 0, null, null, 1],
    ['reference price not above price', 1000, 1000, null, 1],
    ['zero volume', 1000, null, 0, 1],
    ['zero pack quantity', 1000, null, null, 0],
  ])('rejects %s', async (_label, price, comparePrice, volume, units) => {
    const product = await client.query<{ id: string }>(
      `INSERT INTO catalog.products (name, slug) VALUES ('Product', 'product') RETURNING id`,
    );
    await expect(
      client.query(
        `INSERT INTO catalog.product_variants
         (product_id, name, sku, price_cop, compare_at_price_cop, volume_ml, units_per_pack)
         VALUES ($1, 'Variant', 'SKU', $2, $3, $4, $5)`,
        [product.rows[0].id, price, comparePrice, volume, units],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects duplicate SKUs', async () => {
    const product = await client.query<{ id: string }>(
      `INSERT INTO catalog.products (name, slug) VALUES ('Product', 'product') RETURNING id`,
    );
    await client.query(
      `INSERT INTO catalog.product_variants (product_id, name, sku, price_cop)
       VALUES ($1, 'Variant', 'SKU', 1000)`,
      [product.rows[0].id],
    );
    await expect(
      client.query(
        `INSERT INTO catalog.product_variants (product_id, name, sku, price_cop)
         VALUES ($1, 'Another', 'SKU', 2000)`,
        [product.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('rejects a category as its own parent', async () => {
    const id = randomUUID();
    await expect(
      client.query(
        `INSERT INTO catalog.categories (id, parent_id, name, slug)
         VALUES ($1, $1, 'Category', 'category')`,
        [id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('allows only one primary product image', async () => {
    const product = await client.query<{ id: string }>(
      `INSERT INTO catalog.products (name, slug) VALUES ('Product', 'product') RETURNING id`,
    );
    await client.query(
      `INSERT INTO catalog.product_images (product_id, storage_path, is_primary)
       VALUES ($1, 'primary', true)`,
      [product.rows[0].id],
    );
    await expect(
      client.query(
        `INSERT INTO catalog.product_images (product_id, storage_path, is_primary)
         VALUES ($1, 'second-primary', true)`,
        [product.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
});

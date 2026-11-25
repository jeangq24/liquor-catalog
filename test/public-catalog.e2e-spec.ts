import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { createPublicOpenApiDocument } from '../src/common/openapi/catalog-openapi.js';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Public catalog', () => {
  let app: INestApplication<App>;
  let db: Client;
  const suffix = randomUUID();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const brandIds: string[] = [];
  const categoryIds: string[] = [];
  const productIds: string[] = [];
  const slugs = {
    brand: `public-brand-${suffix}`,
    inactiveBrand: `public-inactive-brand-${suffix}`,
    category: `public-category-${suffix}`,
    child: `public-child-${suffix}`,
    inactiveCategory: `public-inactive-category-${suffix}`,
  };
  let activeVariantId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = new Client({ connectionString: databaseUrl });
    await db.connect();
    for (const [slug, active] of [
      [slugs.brand, true],
      [slugs.inactiveBrand, false],
    ] as const) {
      const result = await db.query<{ id: string }>(
        'INSERT INTO catalog.brands (name, slug, is_active) VALUES ($1, $2, $3) RETURNING id',
        [slug, slug, active],
      );
      brandIds.push(result.rows[0].id);
    }
    for (const [slug, parent, active] of [
      [slugs.category, null, true],
      [slugs.child, 'parent', true],
      [slugs.inactiveCategory, null, false],
    ] as const) {
      const result = await db.query<{ id: string }>(
        'INSERT INTO catalog.categories (name, slug, parent_id, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
        [slug, slug, parent === null ? null : categoryIds[0], active],
      );
      categoryIds.push(result.rows[0].id);
    }
    for (const [index, status] of [
      'PUBLISHED',
      'PUBLISHED',
      'PUBLISHED',
      'PUBLISHED',
      'DRAFT',
      'ARCHIVED',
    ].entries()) {
      const product = await db.query<{ id: string }>(
        `INSERT INTO catalog.products (name, slug, brand_id, status, is_featured, published_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          `${String.fromCharCode(65 + index)} ${suffix}`,
          `public-product-${index}-${suffix}`,
          brandIds[index === 3 ? 1 : 0],
          status,
          index === 0,
          new Date(Date.UTC(2024, 0, index + 1)),
        ],
      );
      productIds.push(product.rows[0].id);
      const categoryId =
        index === 1
          ? categoryIds[1]
          : index === 3
            ? categoryIds[2]
            : categoryIds[0];
      await db.query(
        'INSERT INTO catalog.product_categories (product_id, category_id) VALUES ($1, $2)',
        [product.rows[0].id, categoryId],
      );
      const price = [100, 250, 500, 100, 100, 100][index];
      const variant = await db.query<{ id: string }>(
        'INSERT INTO catalog.product_variants (product_id, name, sku, price_cop) VALUES ($1, $2, $3, $4) RETURNING id',
        [product.rows[0].id, 'Active', `public-sku-${index}-${suffix}`, price],
      );
      if (index === 0) activeVariantId = variant.rows[0].id;
    }
    await db.query(
      `INSERT INTO catalog.product_variants (product_id, name, sku, price_cop, is_active)
       VALUES ($1, 'High', $2, 400, true), ($1, 'Inactive', $3, 250, false)`,
      [productIds[0], `public-high-${suffix}`, `public-inactive-${suffix}`],
    );
    await db.query(
      'INSERT INTO catalog.product_categories (product_id, category_id) VALUES ($1, $2)',
      [productIds[0], categoryIds[2]],
    );
    await db.query(
      `INSERT INTO catalog.product_images (product_id, variant_id, storage_path, sort_order)
       SELECT product_id, id, $2 || '/' || id::text, CASE WHEN is_active THEN 2 ELSE 1 END
       FROM catalog.product_variants WHERE product_id = $1 AND name <> 'High'`,
      [productIds[0], `public-images/${suffix}`],
    );
    await db.query(
      'INSERT INTO catalog.product_images (product_id, storage_path, sort_order) VALUES ($1, $2, 0)',
      [productIds[0], `public-images/${suffix}/general`],
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (db) {
      if (productIds.length) {
        await db.query(
          'DELETE FROM catalog.product_images WHERE product_id = ANY($1::uuid[])',
          [productIds],
        );
        await db.query(
          'DELETE FROM catalog.product_variants WHERE product_id = ANY($1::uuid[])',
          [productIds],
        );
        await db.query(
          'DELETE FROM catalog.product_categories WHERE product_id = ANY($1::uuid[])',
          [productIds],
        );
        await db.query(
          'DELETE FROM catalog.products WHERE id = ANY($1::uuid[])',
          [productIds],
        );
      }
      if (categoryIds.length) {
        await db.query('DELETE FROM catalog.categories WHERE id = $1', [
          categoryIds[1],
        ]);
        await db.query(
          'DELETE FROM catalog.categories WHERE id = ANY($1::uuid[])',
          [categoryIds],
        );
      }
      if (brandIds.length)
        await db.query(
          'DELETE FROM catalog.brands WHERE id = ANY($1::uuid[])',
          [brandIds],
        );
      await db.end();
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('lists only published products with stable pagination and public details', async () => {
    const api = request(app.getHttpServer());
    const first = await api
      .get('/public/v1/products')
      .query({ search: suffix, page: 1, limit: 1 })
      .expect(200);
    const second = await api
      .get('/public/v1/products')
      .query({ search: suffix, page: 2, limit: 1 })
      .expect(200);
    const empty = await api
      .get('/public/v1/products')
      .query({ search: suffix, page: 5, limit: 1 })
      .expect(200);
    expect(first.body).toMatchObject({
      page: 1,
      limit: 1,
      total: 4,
      items: [{ id: productIds[0] }],
    });
    expect(second.body).toMatchObject({
      page: 2,
      limit: 1,
      total: 4,
      items: [{ id: productIds[1] }],
    });
    expect(empty.body).toMatchObject({
      page: 5,
      limit: 1,
      total: 4,
      items: [],
    });
    const item = first.body.items[0];
    expect(item.categoryIds).toEqual([categoryIds[0]]);
    expect(
      item.variants.map((variant: { priceCop: string }) => variant.priceCop),
    ).toEqual(['100', '400']);
    expect(item.images).toEqual([
      expect.objectContaining({ variantId: null }),
      expect.objectContaining({ variantId: activeVariantId }),
    ]);
    await api.get(`/public/v1/products/public-product-4-${suffix}`).expect(404);
    await api.get(`/public/v1/products/public-product-5-${suffix}`).expect(404);
    const detail = await api
      .get(`/public/v1/products/public-product-0-${suffix}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      id: productIds[0],
      variants: item.variants,
      images: item.images,
    });
  });

  it('filters by active brand, direct active category and featured status', async () => {
    const api = request(app.getHttpServer());
    const byBrand = await api
      .get(`/public/v1/brands/${slugs.brand}/products`)
      .query({ search: suffix })
      .expect(200);
    expect(byBrand.body.total).toBe(3);
    const byCategory = await api
      .get(`/public/v1/categories/${slugs.category}/products`)
      .query({ search: suffix })
      .expect(200);
    expect(
      byCategory.body.items.map((item: { id: string }) => item.id),
    ).toEqual([productIds[0], productIds[2]]);
    const child = await api
      .get(`/public/v1/categories/${slugs.child}/products`)
      .query({ search: suffix })
      .expect(200);
    expect(child.body.items.map((item: { id: string }) => item.id)).toEqual([
      productIds[1],
    ]);
    const featured = await api
      .get('/public/v1/products')
      .query({
        search: suffix,
        brandSlug: slugs.brand,
        categorySlug: slugs.category,
        isFeatured: 'true',
      })
      .expect(200);
    expect(featured.body).toMatchObject({
      total: 1,
      items: [{ id: productIds[0] }],
    });
    await api
      .get(`/public/v1/brands/${slugs.inactiveBrand}/products`)
      .expect(404);
    await api
      .get(`/public/v1/categories/${slugs.inactiveCategory}/products`)
      .expect(404);
    await api.get('/public/v1/brands/missing/products').expect(404);
    await api.get('/public/v1/categories/missing/products').expect(404);
    const inactiveFilter = await api
      .get('/public/v1/products')
      .query({ brandSlug: slugs.inactiveBrand })
      .expect(200);
    expect(inactiveFilter.body.total).toBe(0);
  });

  it('applies both price bounds to one active variant and sorts by minimum active price', async () => {
    const api = request(app.getHttpServer());
    const ranged = await api
      .get('/public/v1/products')
      .query({ search: suffix, minPriceCop: '200', maxPriceCop: '300' })
      .expect(200);
    expect(ranged.body.items.map((item: { id: string }) => item.id)).toEqual([
      productIds[1],
    ]);
    const asc = await api
      .get('/public/v1/products')
      .query({ search: suffix, brandSlug: slugs.brand, sort: 'price_asc' })
      .expect(200);
    expect(asc.body.items.map((item: { id: string }) => item.id)).toEqual([
      productIds[0],
      productIds[1],
      productIds[2],
    ]);
    const desc = await api
      .get('/public/v1/products')
      .query({ search: suffix, brandSlug: slugs.brand, sort: 'price_desc' })
      .expect(200);
    expect(desc.body.items.map((item: { id: string }) => item.id)).toEqual([
      productIds[2],
      productIds[1],
      productIds[0],
    ]);
    const newest = await api
      .get('/public/v1/products')
      .query({ search: suffix, brandSlug: slugs.brand, sort: 'newest' })
      .expect(200);
    expect(newest.body.items.map((item: { id: string }) => item.id)).toEqual([
      productIds[2],
      productIds[1],
      productIds[0],
    ]);
    const literal = await api
      .get('/public/v1/products')
      .query({ search: `${suffix}%` })
      .expect(200);
    expect(literal.body.total).toBe(0);
  });

  it('validates pagination, filters and BIGINT price bounds', async () => {
    const api = request(app.getHttpServer());
    for (const query of [
      { page: '0' },
      { limit: '101' },
      { sort: 'invalid' },
      { isFeatured: 'yes' },
      { minPriceCop: '-1' },
      { maxPriceCop: '1.5' },
      { minPriceCop: '9223372036854775808' },
      { minPriceCop: '400', maxPriceCop: '100' },
      { brandSlug: 'bad slug' },
      { unknown: 'value' },
    ])
      await api.get('/public/v1/products').query(query).expect(400);
    await api
      .get('/public/v1/products')
      .query({
        minPriceCop: '9223372036854775807',
        maxPriceCop: '9223372036854775807',
      })
      .expect(200);
  });

  it('filters prices above JavaScript safe integer precision exactly', async () => {
    const api = request(app.getHttpServer());
    const product = await db.query<{ id: string }>(
      `INSERT INTO catalog.products (name, slug, status, published_at)
       VALUES ($1, $2, 'PUBLISHED', now()) RETURNING id`,
      [`Precision ${suffix}`, `public-precision-${suffix}`],
    );
    const id = product.rows[0].id;
    productIds.push(id);
    await db.query(
      'INSERT INTO catalog.product_variants (product_id, name, sku, price_cop) VALUES ($1, $2, $3, $4)',
      [id, 'Exact price', `precision-${suffix}`, '9007199254740993'],
    );
    const match = await api
      .get('/public/v1/products')
      .query({
        search: `Precision ${suffix}`,
        minPriceCop: '9007199254740993',
        maxPriceCop: '9007199254740993',
      })
      .expect(200);
    expect(match.body).toMatchObject({
      total: 1,
      items: [{ id, variants: [{ priceCop: '9007199254740993' }] }],
    });
    const below = await api
      .get('/public/v1/products')
      .query({
        search: `Precision ${suffix}`,
        maxPriceCop: '9007199254740992',
      })
      .expect(200);
    const above = await api
      .get('/public/v1/products')
      .query({
        search: `Precision ${suffix}`,
        minPriceCop: '9007199254740994',
      })
      .expect(200);
    expect(below.body.total).toBe(0);
    expect(above.body.total).toBe(0);
  });

  it('documents the public endpoints without administrative security', () => {
    const doc = createPublicOpenApiDocument(app);
    expect(
      Object.keys(doc.paths).every((path) => path.startsWith('/public/v1/')),
    ).toBe(true);
    expect(doc.paths['/public/v1/products']?.get?.security).toBeUndefined();
    expect(doc.paths['/public/v1/brands/{slug}/products']?.get).toBeDefined();
    expect(
      doc.paths['/public/v1/categories/{slug}/products']?.get,
    ).toBeDefined();
    expect(doc.components?.schemas?.PublicProductResponseDto).toMatchObject({
      properties: { variants: { type: 'array' }, images: { type: 'array' } },
    });
  });
});

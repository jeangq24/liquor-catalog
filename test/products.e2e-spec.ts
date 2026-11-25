import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;
const token = 'products-test-token-with-at-least-32-characters';
const actor = randomUUID();
const permissions = [
  'catalog.products.read',
  'catalog.products.create',
  'catalog.products.update',
  'catalog.products.deactivate',
].join(',');

function idFrom(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    typeof body.id !== 'string'
  ) {
    throw new Error('Response does not contain an id');
  }
  return body.id;
}

describe.skipIf(!databaseUrl)('Products HTTP API', () => {
  let app: INestApplication<App>;
  let db: Client;
  const suffix = randomUUID();
  const productIds: string[] = [];
  const categoryIds: string[] = [];
  let brandId: string;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalToken = process.env.CATALOG_INTERNAL_API_TOKEN;
  const auth = {
    Authorization: `Bearer ${token}`,
    'X-Actor-Id': actor,
    'X-Actor-Permissions': permissions,
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.CATALOG_INTERNAL_API_TOKEN = token;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = new Client({ connectionString: databaseUrl });
    await db.connect();
    const brand = await db.query<{ id: string }>(
      'INSERT INTO catalog.brands (name, slug) VALUES ($1, $2) RETURNING id',
      ['Product test brand', `product-brand-${suffix}`],
    );
    brandId = brand.rows[0].id;
    for (const name of ['first', 'second']) {
      const category = await db.query<{ id: string }>(
        'INSERT INTO catalog.categories (name, slug) VALUES ($1, $2) RETURNING id',
        [name, `${name}-${suffix}`],
      );
      categoryIds.push(category.rows[0].id);
    }
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
          'DELETE FROM catalog.products WHERE id = ANY($1::uuid[])',
          [productIds],
        );
      }
      if (categoryIds.length) {
        await db.query(
          'DELETE FROM catalog.categories WHERE id = ANY($1::uuid[])',
          [categoryIds],
        );
      }
      if (brandId)
        await db.query('DELETE FROM catalog.brands WHERE id = $1', [brandId]);
      await db.end();
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalToken === undefined)
      delete process.env.CATALOG_INTERNAL_API_TOKEN;
    else process.env.CATALOG_INTERNAL_API_TOKEN = originalToken;
  });

  it('enforces authentication, permissions, and DTO validation', async () => {
    const api = request(app.getHttpServer());
    await api.get('/admin/v1/products').expect(401);
    await api
      .post('/admin/v1/products')
      .set({ ...auth, 'X-Actor-Permissions': 'catalog.products.read' })
      .send({ name: 'No permission', slug: `unauthorized-${suffix}` })
      .expect(403);
    await api
      .post('/admin/v1/products')
      .set(auth)
      .send({ name: 'Invalid', slug: `invalid-${suffix}`, status: 'PUBLISHED' })
      .expect(400);
    await api
      .post('/admin/v1/products')
      .set(auth)
      .send({
        name: 'Invalid',
        slug: `invalid-${suffix}`,
        categoryIds: [categoryIds[0], categoryIds[0]],
      })
      .expect(400);
  });

  it('creates and updates products with atomic brand and category associations', async () => {
    const api = request(app.getHttpServer());
    const slug = `associations-${suffix}`;
    await api
      .post('/admin/v1/products')
      .set(auth)
      .send({ name: 'Missing category', slug, categoryIds: [randomUUID()] })
      .expect(404);
    const missing = await db.query<{ count: string }>(
      'SELECT count(*) FROM catalog.products WHERE slug = $1',
      [slug],
    );
    expect(missing.rows[0].count).toBe('0');
    const created = await api
      .post('/admin/v1/products')
      .set(auth)
      .send({ name: 'Product', slug, brandId, categoryIds, isFeatured: true })
      .expect(201);
    const id = idFrom(created.body);
    productIds.push(id);
    expect(created.body.status).toBe('DRAFT');
    expect(created.body.categoryIds).toHaveLength(2);
    await api
      .post('/admin/v1/products')
      .set(auth)
      .send({ name: 'Duplicate', slug })
      .expect(409);
    await api
      .patch(`/admin/v1/products/${id}`)
      .set(auth)
      .send({ name: 'Should roll back', categoryIds: [randomUUID()] })
      .expect(404);
    await api
      .get(`/admin/v1/products/${id}`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Product');
        expect(body.categoryIds).toHaveLength(2);
      });
    await api
      .patch(`/admin/v1/products/${id}`)
      .set(auth)
      .send({
        name: 'Updated',
        brandId: null,
        categoryIds: [categoryIds[1]],
        isFeatured: false,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.brandId).toBeNull();
        expect(body.categoryIds).toEqual([categoryIds[1]]);
        expect(body.isFeatured).toBe(false);
      });
    await api
      .get(`/admin/v1/products/slug/${slug}`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(id);
      });
    await api
      .patch(`/admin/v1/products/${id}`)
      .set(auth)
      .send({ categoryIds: [] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.categoryIds).toEqual([]);
      });
    await api
      .get('/admin/v1/products')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.some((product: { id: string }) => product.id === id),
        ).toBe(true);
      });
    await api.get(`/public/v1/products/${slug}`).expect(404);
  });

  it('publishes only with active variants, hides archived products and republishes', async () => {
    const api = request(app.getHttpServer());
    const slug = `published-${suffix}`;
    const created = await api
      .post('/admin/v1/products')
      .set(auth)
      .send({ name: 'Published product', slug, categoryIds: [categoryIds[0]] })
      .expect(201);
    const id = idFrom(created.body);
    productIds.push(id);
    await api.patch(`/admin/v1/products/${id}/publish`).set(auth).expect(409);
    const inactive = await db.query<{ id: string }>(
      `INSERT INTO catalog.product_variants (product_id, name, sku, price_cop, is_active)
       VALUES ($1, 'Inactive', $2, 1000, false) RETURNING id`,
      [id, `inactive-${suffix}`],
    );
    await api.patch(`/admin/v1/products/${id}/publish`).set(auth).expect(409);
    const active = await db.query<{ id: string }>(
      `INSERT INTO catalog.product_variants (product_id, name, sku, price_cop, compare_at_price_cop)
       VALUES ($1, 'Active', $2, 9007199254740993, 9007199254740994) RETURNING id`,
      [id, `active-${suffix}`],
    );
    await db.query(
      `INSERT INTO catalog.product_images (product_id, variant_id, storage_path)
       VALUES ($1, $2, $3), ($1, $4, $5)`,
      [
        id,
        active.rows[0].id,
        `active-image-${suffix}`,
        inactive.rows[0].id,
        `inactive-image-${suffix}`,
      ],
    );
    const published = await api
      .patch(`/admin/v1/products/${id}/publish`)
      .set(auth)
      .expect(200);
    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.publishedAt).toBeTruthy();
    await api
      .get(`/public/v1/products/${slug}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.variants).toHaveLength(1);
        expect(body.variants[0].id).toBe(active.rows[0].id);
        expect(body.variants[0].priceCop).toBe('9007199254740993');
        expect(body.variants[0].compareAtPriceCop).toBe('9007199254740994');
        expect(body.images).toHaveLength(1);
        expect(body.images[0].variantId).toBe(active.rows[0].id);
      });
    await api
      .patch(`/admin/v1/products/${id}/publish`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.publishedAt).toBe(published.body.publishedAt);
      });
    await api
      .patch(`/admin/v1/products/${id}/archive`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ARCHIVED');
      });
    await api.get(`/public/v1/products/${slug}`).expect(404);
    await api
      .get('/public/v1/products')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.some((product: { id: string }) => product.id === id),
        ).toBe(false);
      });
    await db.query(
      'UPDATE catalog.product_variants SET is_active = false WHERE id = $1',
      [active.rows[0].id],
    );
    await api.patch(`/admin/v1/products/${id}/publish`).set(auth).expect(409);
    await db.query(
      'UPDATE catalog.product_variants SET is_active = true WHERE id = $1',
      [active.rows[0].id],
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    const republished = await api
      .patch(`/admin/v1/products/${id}/publish`)
      .set(auth)
      .expect(200);
    expect(republished.body.status).toBe('PUBLISHED');
    expect(Date.parse(republished.body.publishedAt)).toBeGreaterThan(
      Date.parse(published.body.publishedAt),
    );
    await api.get(`/public/v1/products/${slug}`).expect(200);
  });
});

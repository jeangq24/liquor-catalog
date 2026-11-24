import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  createAdminOpenApiDocument,
  setupAdminSwagger,
} from '../src/common/openapi/catalog-openapi.js';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;
const token = 'admin-api-test-token-at-least-32-characters-long';
const auth = {
  Authorization: `Bearer ${token}`,
  'X-Actor-Id': randomUUID(),
  'X-Actor-Permissions': [
    'catalog.brands.read',
    'catalog.categories.read',
    'catalog.products.read',
  ].join(','),
};

describe.skipIf(!databaseUrl)('Administrative queries and OpenAPI', () => {
  let app: INestApplication<App>;
  let db: Client;
  const suffix = randomUUID();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalToken = process.env.CATALOG_INTERNAL_API_TOKEN;
  const productIds: string[] = [];
  const brandIds: string[] = [];
  const categoryIds: string[] = [];
  let variantId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.CATALOG_INTERNAL_API_TOKEN = token;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    setupAdminSwagger(app);
    await app.init();
    db = new Client({ connectionString: databaseUrl });
    await db.connect();
    const brands = await db.query<{ id: string }>(
      `INSERT INTO catalog.brands (name, slug, is_active) VALUES
      ($1, $2, true), ($3, $4, false) RETURNING id`,
      [
        `Test ${suffix} Alpha`,
        `alpha-${suffix}`,
        `Test ${suffix} Beta`,
        `beta-${suffix}`,
      ],
    );
    brandIds.push(...brands.rows.map((row) => row.id));
    const categories = await db.query<{ id: string }>(
      `INSERT INTO catalog.categories (name, slug, is_active) VALUES
      ($1, $2, true), ($3, $4, false) RETURNING id`,
      [
        `Test ${suffix} Alpha`,
        `alpha-category-${suffix}`,
        `Test ${suffix} Beta`,
        `beta-category-${suffix}`,
      ],
    );
    categoryIds.push(...categories.rows.map((row) => row.id));
    for (const [index, name] of ['Alpha', 'Beta', 'Other'].entries()) {
      const result = await db.query<{ id: string }>(
        `INSERT INTO catalog.products (name, slug, brand_id, is_featured, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          `Test ${suffix} ${name}`,
          `${name.toLowerCase()}-product-${suffix}`,
          brandIds[index === 2 ? 1 : 0],
          index !== 2,
          index === 2 ? 'ARCHIVED' : 'DRAFT',
        ],
      );
      productIds.push(result.rows[0].id);
      if (index !== 2) {
        await db.query(
          'INSERT INTO catalog.product_categories (product_id, category_id) VALUES ($1, $2)',
          [result.rows[0].id, categoryIds[0]],
        );
      }
    }
    for (const [index, name] of ['Alpha', 'Beta', 'Gamma'].entries()) {
      const result = await db.query<{ id: string }>(
        'INSERT INTO catalog.product_variants (product_id, name, sku, barcode, price_cop, is_active) VALUES ($1, $2, $3, $4, 100, $5) RETURNING id',
        [
          productIds[0],
          name,
          `sku-${name}-${suffix}`,
          `barcode-${name}-${suffix}`,
          index !== 2,
        ],
      );
      if (index === 0) variantId = result.rows[0].id;
      await db.query(
        'INSERT INTO catalog.product_images (product_id, variant_id, storage_path, is_primary, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [
          productIds[0],
          result.rows[0].id,
          `test/${suffix}/${name}.webp`,
          index === 0,
          index,
        ],
      );
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
          'DELETE FROM catalog.product_categories WHERE product_id = ANY($1::uuid[])',
          [productIds],
        );
        await db.query(
          'DELETE FROM catalog.products WHERE id = ANY($1::uuid[])',
          [productIds],
        );
      }
      if (categoryIds.length)
        await db.query(
          'DELETE FROM catalog.categories WHERE id = ANY($1::uuid[])',
          [categoryIds],
        );
      if (brandIds.length)
        await db.query(
          'DELETE FROM catalog.brands WHERE id = ANY($1::uuid[])',
          [brandIds],
        );
      await db.end();
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalToken === undefined)
      delete process.env.CATALOG_INTERNAL_API_TOKEN;
    else process.env.CATALOG_INTERNAL_API_TOKEN = originalToken;
  });

  it('paginates and filters products with correct totals, including empty pages', async () => {
    const api = request(app.getHttpServer());
    const filters = {
      search: suffix,
      status: 'DRAFT',
      brandId: brandIds[0],
      categoryId: categoryIds[0],
      isFeatured: 'true',
      limit: '1',
    };
    const first = await api
      .get('/admin/v1/products')
      .query({ ...filters, page: '1' })
      .set(auth)
      .expect(200);
    const second = await api
      .get('/admin/v1/products')
      .query({ ...filters, page: '2' })
      .set(auth)
      .expect(200);
    const empty = await api
      .get('/admin/v1/products')
      .query({ ...filters, page: '3' })
      .set(auth)
      .expect(200);
    expect(first.body).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      items: [{ id: productIds[0], categoryIds: [categoryIds[0]] }],
    });
    expect(second.body).toMatchObject({
      page: 2,
      limit: 1,
      total: 2,
      items: [{ id: productIds[1] }],
    });
    expect(empty.body).toMatchObject({
      page: 3,
      limit: 1,
      total: 2,
      items: [],
    });
    const wildcard = await api
      .get('/admin/v1/products')
      .query({ search: `${suffix}%` })
      .set(auth)
      .expect(200);
    expect(wildcard.body.total).toBe(0);
  });

  it('filters brands, categories, variants and images and applies defaults', async () => {
    const api = request(app.getHttpServer());
    const brands = await api
      .get('/admin/v1/brands')
      .query({ search: suffix, isActive: 'false' })
      .set(auth)
      .expect(200);
    expect(brands.body).toMatchObject({
      page: 1,
      limit: 25,
      total: 1,
      items: [{ id: brandIds[1], isActive: false }],
    });
    const categories = await api
      .get('/admin/v1/categories')
      .query({ search: suffix, isActive: 'true' })
      .set(auth)
      .expect(200);
    expect(categories.body).toMatchObject({
      total: 1,
      items: [{ id: categoryIds[0] }],
    });
    const variants = await api
      .get(`/admin/v1/products/${productIds[0]}/variants`)
      .query({ search: `barcode-Alpha-${suffix}`, isActive: 'true' })
      .set(auth)
      .expect(200);
    expect(variants.body).toMatchObject({
      total: 1,
      items: [{ id: variantId }],
    });
    const images = await api
      .get(`/admin/v1/products/${productIds[0]}/images`)
      .query({ variantId, isPrimary: 'true' })
      .set(auth)
      .expect(200);
    expect(images.body).toMatchObject({
      total: 1,
      items: [{ variantId, isPrimary: true }],
    });
    const tree = await api
      .get('/admin/v1/categories/tree')
      .set(auth)
      .expect(200);
    expect(Array.isArray(tree.body)).toBe(true);
  });

  it('rejects invalid pagination and filters rather than coercing input', async () => {
    const api = request(app.getHttpServer());
    for (const query of [
      { page: '0' },
      { page: '1.5' },
      { page: '1000001' },
      { limit: '101' },
      { limit: '' },
      { isFeatured: 'yes' },
      { status: 'INVALID' },
      { brandId: 'invalid' },
      { search: ' ' },
      { unknown: 'value' },
    ]) {
      await api.get('/admin/v1/products').query(query).set(auth).expect(400);
    }
  });

  it('documents and protects every administrative operation', async () => {
    const document = createAdminOpenApiDocument(app);
    const api = request(app.getHttpServer());
    const json = await api.get('/docs-json').expect(200);
    expect(json.body.info.title).toBe('LicoresYaaa Catalog Admin API');
    expect(
      Object.keys(document.paths).every((path) =>
        path.startsWith('/admin/v1/'),
      ),
    ).toBe(true);
    expect(
      document.paths['/admin/v1/products']?.get?.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              items: { type: 'array' },
              total: { type: 'integer' },
            },
          },
        },
      },
    });
    expect(document.components?.schemas?.CreateVariantDto).toMatchObject({
      required: expect.arrayContaining(['name', 'sku', 'priceCop']),
      properties: { priceCop: { type: 'string' } },
    });
    let operations = 0;
    for (const [path, entry] of Object.entries(document.paths)) {
      for (const method of ['get', 'post', 'patch', 'delete'] as const) {
        const operation = entry?.[method];
        if (!operation) continue;
        operations++;
        expect(operation.security).toEqual(
          expect.arrayContaining([{ 'catalog-admin': [] }]),
        );
        expect(operation.description).toMatch(
          /^Required permissions: catalog\./,
        );
        const url = path.replace(/\{[^}]+\}/g, randomUUID());
        await api[method](url).expect(401);
        await api[method](url)
          .set({ ...auth, 'X-Actor-Permissions': 'unrelated.permission' })
          .expect(403);
      }
    }
    expect(operations).toBeGreaterThan(20);
  });
});

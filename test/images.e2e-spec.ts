import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;
const token = 'images-test-token-with-at-least-32-characters';
const auth = {
  Authorization: `Bearer ${token}`,
  'X-Actor-Id': randomUUID(),
  'X-Actor-Permissions': 'catalog.products.read,catalog.products.update',
};

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

describe.skipIf(!databaseUrl)('Product image HTTP API', () => {
  let app: INestApplication<App>;
  let db: Client;
  const productIds: string[] = [];
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalToken = process.env.CATALOG_INTERNAL_API_TOKEN;
  const suffix = randomUUID();

  async function createProduct() {
    const slug = `images-${randomUUID()}`;
    const result = await db.query<{ id: string }>(
      'INSERT INTO catalog.products (name, slug) VALUES ($1, $2) RETURNING id',
      ['Image test product', slug],
    );
    productIds.push(result.rows[0].id);
    return { id: result.rows[0].id, slug };
  }

  async function createVariant(productId: string) {
    const result = await db.query<{ id: string }>(
      'INSERT INTO catalog.product_variants (product_id, name, sku, price_cop) VALUES ($1, $2, $3, 100) RETURNING id',
      [productId, 'Test variant', `images-sku-${randomUUID()}`],
    );
    return result.rows[0].id;
  }

  async function createImage(
    productId: string,
    values: Record<string, unknown> = {},
  ) {
    const result = await request(app.getHttpServer())
      .post(`/admin/v1/products/${productId}/images`)
      .set(auth)
      .send({
        storagePath: `products/${productId}/${randomUUID()}.webp`,
        ...values,
      })
      .expect(201);
    return idFrom(result.body);
  }

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
      await db.end();
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalToken === undefined)
      delete process.env.CATALOG_INTERNAL_API_TOKEN;
    else process.env.CATALOG_INTERNAL_API_TOKEN = originalToken;
  });

  it('requires authentication and product permissions', async () => {
    const api = request(app.getHttpServer());
    const { id } = await createProduct();
    await api.get(`/admin/v1/products/${id}/images`).expect(401);
    await api
      .post(`/admin/v1/products/${id}/images`)
      .set({ ...auth, 'X-Actor-Permissions': 'catalog.products.read' })
      .send({ storagePath: 'images/unauthorized.webp' })
      .expect(403);
    await api
      .delete(`/admin/v1/images/${randomUUID()}`)
      .set({ ...auth, 'X-Actor-Permissions': 'catalog.products.read' })
      .expect(403);
    await api
      .get(`/admin/v1/products/${randomUUID()}/images`)
      .set(auth)
      .expect(404);
  });

  it('validates keys, numeric bounds, and variant ownership', async () => {
    const api = request(app.getHttpServer());
    const product = await createProduct();
    const other = await createProduct();
    const otherVariant = await createVariant(other.id);
    const url = `/admin/v1/products/${product.id}/images`;
    for (const storagePath of [
      '',
      '/absolute.webp',
      'images/../a.webp',
      'images//a.webp',
      'https://example.com/a.webp',
      'images\\a.webp',
      'x'.repeat(1025),
    ]) {
      await api.post(url).set(auth).send({ storagePath }).expect(400);
    }
    await api
      .post(url)
      .set(auth)
      .send({ storagePath: 'images/a.webp', variantId: otherVariant })
      .expect(400);
    await api
      .post(url)
      .set(auth)
      .send({ storagePath: 'images/a.webp', variantId: randomUUID() })
      .expect(404);
    await api
      .post(url)
      .set(auth)
      .send({ storagePath: 'images/a.webp', sortOrder: 2147483648 })
      .expect(400);
    await api
      .post(url)
      .set(auth)
      .send({ storagePath: 'images/a.webp', image: 'binary' })
      .expect(400);
    await api
      .post(`/admin/v1/products/${randomUUID()}/images`)
      .set(auth)
      .send({ storagePath: 'images/a.webp' })
      .expect(404);
  });

  it('maintains separate primary scopes, ordering, and variant associations', async () => {
    const api = request(app.getHttpServer());
    const product = await createProduct();
    const variant = await createVariant(product.id);
    const other = await createProduct();
    const otherVariant = await createVariant(other.id);
    const first = await createImage(product.id, {
      isPrimary: true,
      sortOrder: 10,
    });
    const second = await createImage(product.id, {
      isPrimary: true,
      sortOrder: 2,
    });
    const variantImage = await createImage(product.id, {
      variantId: variant,
      isPrimary: true,
      sortOrder: 5,
    });
    let rows = await api
      .get(`/admin/v1/products/${product.id}/images`)
      .set(auth)
      .expect(200);
    expect(rows.body).toEqual([
      expect.objectContaining({ id: second, isPrimary: true }),
      expect.objectContaining({
        id: variantImage,
        isPrimary: true,
        variantId: variant,
      }),
      expect.objectContaining({ id: first, isPrimary: false }),
    ]);
    await api
      .patch(`/admin/v1/images/${first}`)
      .set(auth)
      .send({ isPrimary: true, altText: 'Front', sortOrder: 1 })
      .expect(200);
    await api
      .patch(`/admin/v1/images/${first}`)
      .set(auth)
      .send({ variantId: otherVariant })
      .expect(400);
    const moved = await api
      .patch(`/admin/v1/images/${first}`)
      .set(auth)
      .send({ variantId: variant })
      .expect(200);
    expect(moved.body).toMatchObject({
      id: first,
      productId: product.id,
      variantId: variant,
      isPrimary: true,
      altText: 'Front',
      sortOrder: 1,
    });
    rows = await api
      .get(`/admin/v1/products/${product.id}/images`)
      .set(auth)
      .expect(200);
    expect(rows.body).toEqual([
      expect.objectContaining({ id: first, isPrimary: true }),
      expect.objectContaining({ id: second, isPrimary: false }),
      expect.objectContaining({ id: variantImage, isPrimary: false }),
    ]);
    await api
      .patch(`/admin/v1/images/${first}`)
      .set(auth)
      .send({ variantId: null, altText: null, isPrimary: false })
      .expect(200);
    const result = await api
      .get(`/admin/v1/images/${first}`)
      .set(auth)
      .expect(200);
    expect(result.body).toMatchObject({
      variantId: null,
      altText: null,
      isPrimary: false,
    });
  });

  it('rolls back primary changes on duplicate paths and blocks unsafe deletion or replacement', async () => {
    const api = request(app.getHttpServer());
    const product = await createProduct();
    const path = `products/${product.id}/${suffix}.webp`;
    const id = await createImage(product.id, {
      storagePath: path,
      isPrimary: true,
    });
    await api
      .post(`/admin/v1/products/${product.id}/images`)
      .set(auth)
      .send({ storagePath: path, isPrimary: true })
      .expect(409);
    await api
      .patch(`/admin/v1/images/${id}`)
      .set(auth)
      .send({ storagePath: 'new/path.webp' })
      .expect(400);
    await api.delete(`/admin/v1/images/${id}`).set(auth).expect(503);
    await api.delete(`/admin/v1/images/${randomUUID()}`).set(auth).expect(404);
    const current = await api
      .get(`/admin/v1/images/${id}`)
      .set(auth)
      .expect(200);
    expect(current.body).toMatchObject({
      id,
      storagePath: path,
      isPrimary: true,
    });
  });

  it('serializes competing primary selections and keeps public ordering and filtering', async () => {
    const api = request(app.getHttpServer());
    const product = await createProduct();
    const active = await createVariant(product.id);
    const inactive = await createVariant(product.id);
    const first = await createImage(product.id, { sortOrder: 20 });
    const second = await createImage(product.id, {
      variantId: active,
      sortOrder: 10,
    });
    await createImage(product.id, { variantId: inactive, sortOrder: 0 });
    await db.query(
      'UPDATE catalog.product_variants SET is_active = false WHERE id = $1',
      [inactive],
    );
    await api
      .patch(`/admin/v1/products/${product.id}/publish`)
      .set(auth)
      .expect(200);
    const concurrent = await Promise.all([
      api
        .patch(`/admin/v1/images/${first}`)
        .set(auth)
        .send({ isPrimary: true }),
      api
        .post(`/admin/v1/products/${product.id}/images`)
        .set(auth)
        .send({
          storagePath: `images/concurrent-${suffix}.webp`,
          isPrimary: true,
          sortOrder: 30,
        }),
    ]);
    expect(concurrent.map((response) => response.status)).toEqual([200, 201]);
    const main = await db.query<{ count: string }>(
      'SELECT count(*) FROM catalog.product_images WHERE product_id = $1 AND variant_id IS NULL AND is_primary = true',
      [product.id],
    );
    expect(main.rows[0].count).toBe('1');
    const response = await api
      .get(`/public/v1/products/${product.slug}`)
      .expect(200);
    expect(
      response.body.images.map((image: { id: string }) => image.id),
    ).toEqual([second, first, idFrom(concurrent[1].body)]);
  });
});

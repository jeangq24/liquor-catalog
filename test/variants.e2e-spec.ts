import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  createInternalOpenApiDocument,
  setupInternalSwagger,
} from '../src/common/openapi/catalog-openapi.js';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;
const adminToken = 'variants-administration-token-at-least-32-characters';
const serviceToken = 'variants-service-token-with-at-least-32-characters';
const actor = randomUUID();
const auth = {
  Authorization: `Bearer ${adminToken}`,
  'X-Actor-Id': actor,
  'X-Actor-Permissions': [
    'catalog.products.read',
    'catalog.products.create',
    'catalog.products.update',
    'catalog.products.deactivate',
  ].join(','),
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

describe.skipIf(!databaseUrl)('Variants HTTP API', () => {
  let app: INestApplication<App>;
  let db: Client;
  const suffix = randomUUID();
  const productIds: string[] = [];
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAdminToken = process.env.CATALOG_INTERNAL_API_TOKEN;
  const originalServiceToken = process.env.CATALOG_SERVICE_API_TOKEN;

  async function createProduct() {
    const result = await db.query<{ id: string }>(
      'INSERT INTO catalog.products (name, slug) VALUES ($1, $2) RETURNING id',
      ['Variant test product', `variants-${randomUUID()}`],
    );
    productIds.push(result.rows[0].id);
    return result.rows[0].id;
  }

  async function createVariant(
    productId: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await request(app.getHttpServer())
      .post(`/admin/v1/products/${productId}/variants`)
      .set(auth)
      .send({
        name: '750 ml',
        sku: `SKU-${randomUUID()}`,
        priceCop: '100',
        ...extra,
      })
      .expect(201);
    return idFrom(response.body);
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.CATALOG_INTERNAL_API_TOKEN = adminToken;
    process.env.CATALOG_SERVICE_API_TOKEN = serviceToken;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    setupInternalSwagger(app);
    await app.init();
    db = new Client({ connectionString: databaseUrl });
    await db.connect();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (db) {
      if (productIds.length) {
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
    if (originalAdminToken === undefined)
      delete process.env.CATALOG_INTERNAL_API_TOKEN;
    else process.env.CATALOG_INTERNAL_API_TOKEN = originalAdminToken;
    if (originalServiceToken === undefined)
      delete process.env.CATALOG_SERVICE_API_TOKEN;
    else process.env.CATALOG_SERVICE_API_TOKEN = originalServiceToken;
  });

  it('enforces separate tokens and administrative permissions', async () => {
    const api = request(app.getHttpServer());
    const productId = await createProduct();
    const id = await createVariant(productId);
    await api.get(`/admin/v1/variants/${id}`).expect(401);
    await api
      .get(`/admin/v1/variants/${id}`)
      .set('Authorization', `Bearer ${serviceToken}`)
      .expect(401);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set({ ...auth, 'X-Actor-Permissions': 'catalog.products.read' })
      .send({ priceCop: '120' })
      .expect(403);
    await api.get(`/internal/v1/variants/${id}`).expect(401);
    await api
      .get(`/internal/v1/variants/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(401);
    await api
      .get(`/internal/v1/variants/${randomUUID()}`)
      .set('Authorization', `Bearer ${serviceToken}`)
      .expect(404);
    await api
      .get('/internal/v1/variants/not-a-uuid')
      .set('Authorization', `Bearer ${serviceToken}`)
      .expect(400);
    await api
      .get(`/admin/v1/products/${randomUUID()}/variants`)
      .set(auth)
      .expect(404);
    await api
      .post(`/admin/v1/products/${randomUUID()}/variants`)
      .set(auth)
      .send({ name: 'x', sku: `missing-${suffix}`, priceCop: '10' })
      .expect(404);
  });

  it('validates identifiers and updates without changing UUID or ownership', async () => {
    const api = request(app.getHttpServer());
    const productId = await createProduct();
    const sku = `sku-${suffix}`;
    const barcode = `barcode-${suffix}`;
    const id = await createVariant(productId, {
      sku,
      barcode,
      volumeMl: 750,
      unitsPerPack: 6,
    });
    await api
      .post(`/admin/v1/products/${productId}/variants`)
      .set(auth)
      .send({ name: 'duplicate', sku, priceCop: '10' })
      .expect(409);
    await api
      .post(`/admin/v1/products/${productId}/variants`)
      .set(auth)
      .send({
        name: 'duplicate',
        sku: `different-${suffix}`,
        barcode,
        priceCop: '10',
      })
      .expect(409);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ productId: randomUUID() })
      .expect(400);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ isActive: false })
      .expect(400);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ volumeMl: 0 })
      .expect(400);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ unitsPerPack: 2147483648 })
      .expect(400);
    const updated = await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({
        sku: `updated-${suffix}`,
        barcode: null,
        volumeMl: null,
        unitsPerPack: 1,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      id,
      productId,
      sku: `updated-${suffix}`,
      barcode: null,
      volumeMl: null,
      unitsPerPack: 1,
    });
    const list = await api
      .get(`/admin/v1/products/${productId}/variants`)
      .set(auth)
      .expect(200);
    expect(list.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id, productId })]),
    );
    await api.get(`/admin/v1/variants/${id}`).set(auth).expect(200);
  });

  it('validates combined prices, BIGINT bounds and precision', async () => {
    const api = request(app.getHttpServer());
    const productId = await createProduct();
    const url = `/admin/v1/products/${productId}/variants`;
    const base = { name: 'price', sku: `price-${suffix}` };
    for (const priceCop of [
      '0',
      '-1',
      '1.5',
      '9223372036854775808',
      100,
      null,
    ]) {
      await api
        .post(url)
        .set(auth)
        .send({ ...base, priceCop })
        .expect(400);
    }
    await api
      .post(url)
      .set(auth)
      .send({ ...base, priceCop: '100', compareAtPriceCop: '100' })
      .expect(400);
    const id = await createVariant(productId, {
      priceCop: '9007199254740993',
      compareAtPriceCop: '9223372036854775807',
    });
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ priceCop: '9223372036854775807' })
      .expect(400);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ compareAtPriceCop: '9007199254740993' })
      .expect(400);
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ compareAtPriceCop: '9223372036854775808' })
      .expect(400);
    const unchanged = await api
      .get(`/admin/v1/variants/${id}`)
      .set(auth)
      .expect(200);
    expect(unchanged.body).toMatchObject({
      priceCop: '9007199254740993',
      compareAtPriceCop: '9223372036854775807',
    });
    const changed = await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ priceCop: '9223372036854775807', compareAtPriceCop: null })
      .expect(200);
    expect(changed.body).toMatchObject({
      priceCop: '9223372036854775807',
      compareAtPriceCop: null,
    });
  });

  it('exposes purchase eligibility without hiding historical variants', async () => {
    const api = request(app.getHttpServer());
    const productId = await createProduct();
    const sku = `internal-${randomUUID()}`;
    const id = await createVariant(productId, {
      sku,
      priceCop: '9007199254740993',
    });

    const internal = () =>
      api
        .get(`/internal/v1/variants/${id}`)
        .set('Authorization', `Bearer ${serviceToken}`);
    const draftResponse = await internal().expect(200);
    expect(draftResponse.headers['cache-control']).toBe('no-store');
    expect(draftResponse.body).toEqual({
      id,
      productId,
      productName: 'Variant test product',
      variantName: '750 ml',
      sku,
      productStatus: 'DRAFT',
      isActive: true,
      isPurchasable: false,
      priceCop: '9007199254740993',
    });
    await api
      .patch(`/admin/v1/products/${productId}/publish`)
      .set(auth)
      .expect(200);
    expect((await internal().expect(200)).body).toMatchObject({
      productStatus: 'PUBLISHED',
      isPurchasable: true,
    });
    await api
      .patch(`/admin/v1/variants/${id}`)
      .set(auth)
      .send({ priceCop: '9007199254740994' })
      .expect(200);
    expect((await internal().expect(200)).body.priceCop).toBe(
      '9007199254740994',
    );
    await api
      .patch(`/admin/v1/variants/${id}/deactivate`)
      .set(auth)
      .expect(409);
    await api
      .patch(`/admin/v1/products/${productId}/archive`)
      .set(auth)
      .expect(200);
    await api
      .patch(`/admin/v1/variants/${id}/deactivate`)
      .set(auth)
      .expect(200);
    expect((await internal().expect(200)).body).toMatchObject({
      id,
      productStatus: 'ARCHIVED',
      isActive: false,
      isPurchasable: false,
    });
    await api.patch(`/admin/v1/variants/${id}/activate`).set(auth).expect(200);
    expect((await internal().expect(200)).body).toMatchObject({
      id,
      isActive: true,
      isPurchasable: false,
    });
  });

  it('documents the isolated service-to-service contract', async () => {
    const document = createInternalOpenApiDocument(app);
    const operation = document.paths['/internal/v1/variants/{id}']?.get;
    expect(Object.keys(document.paths)).toEqual(['/internal/v1/variants/{id}']);
    expect(operation?.security).toEqual([{ 'catalog-service': [] }]);
    expect(operation?.responses).toMatchObject({
      '200': {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InternalVariantResponseDto' },
          },
        },
      },
      '400': {},
      '401': {},
      '404': {},
    });
    expect(
      document.components?.schemas?.InternalVariantResponseDto,
    ).toMatchObject({
      required: expect.arrayContaining([
        'id',
        'productId',
        'productName',
        'productStatus',
        'variantName',
        'sku',
        'priceCop',
        'isActive',
        'isPurchasable',
      ]),
      properties: {
        id: { type: 'string', format: 'uuid' },
        priceCop: { type: 'string' },
        isPurchasable: { type: 'boolean' },
      },
    });
    const response = await request(app.getHttpServer())
      .get('/internal-docs-json')
      .expect(200);
    expect(response.body.paths).toHaveProperty('/internal/v1/variants/{id}');
  });

  it('serializes competing deactivations and publication races', async () => {
    const api = request(app.getHttpServer());
    const productId = await createProduct();
    const first = await createVariant(productId);
    const second = await createVariant(productId);
    await api
      .patch(`/admin/v1/products/${productId}/publish`)
      .set(auth)
      .expect(200);
    for (let i = 0; i < 3; i++) {
      await api
        .patch(`/admin/v1/variants/${first}/activate`)
        .set(auth)
        .expect(200);
      await api
        .patch(`/admin/v1/variants/${second}/activate`)
        .set(auth)
        .expect(200);
      const results = await Promise.all([
        api.patch(`/admin/v1/variants/${first}/deactivate`).set(auth),
        api.patch(`/admin/v1/variants/${second}/deactivate`).set(auth),
      ]);
      expect(
        results.map((response) => response.status).sort((a, b) => a - b),
      ).toEqual([200, 409]);
    }
    for (let i = 0; i < 3; i++) {
      const draft = await createProduct();
      const id = await createVariant(draft);
      const results = await Promise.all([
        api.patch(`/admin/v1/products/${draft}/publish`).set(auth),
        api.patch(`/admin/v1/variants/${id}/deactivate`).set(auth),
      ]);
      expect(
        results.map((response) => response.status).sort((a, b) => a - b),
      ).toEqual([200, 409]);
      const check = await db.query<{ status: string; is_active: boolean }>(
        'SELECT p.status, v.is_active FROM catalog.products p JOIN catalog.product_variants v ON v.product_id = p.id WHERE p.id = $1',
        [draft],
      );
      expect(
        check.rows[0].status !== 'PUBLISHED' || check.rows[0].is_active,
      ).toBe(true);
    }
  });
});

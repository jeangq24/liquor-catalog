import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL;
const token = 'catalog-test-token-with-at-least-32-characters';
const actor = randomUUID();
const permissions = [
  'catalog.brands.read',
  'catalog.brands.create',
  'catalog.brands.update',
  'catalog.brands.deactivate',
  'catalog.categories.read',
  'catalog.categories.create',
  'catalog.categories.update',
  'catalog.categories.deactivate',
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

describe.skipIf(!databaseUrl)('Brands and categories HTTP API', () => {
  let app: INestApplication<App>;
  let cleanup: Client;
  const categoryIds: string[] = [];
  const brandIds: string[] = [];
  const suffix = randomUUID();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalToken = process.env.CATALOG_INTERNAL_API_TOKEN;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.CATALOG_INTERNAL_API_TOKEN = token;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    cleanup = new Client({ connectionString: databaseUrl });
    await cleanup.connect();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (cleanup) {
      for (const id of categoryIds.reverse()) {
        await cleanup.query('DELETE FROM catalog.categories WHERE id = $1', [
          id,
        ]);
      }
      for (const id of brandIds) {
        await cleanup.query('DELETE FROM catalog.brands WHERE id = $1', [id]);
      }
      await cleanup.end();
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalToken === undefined)
      delete process.env.CATALOG_INTERNAL_API_TOKEN;
    else process.env.CATALOG_INTERNAL_API_TOKEN = originalToken;
  });

  it('rejects unauthenticated and unauthorized administrative requests', async () => {
    await request(app.getHttpServer()).get('/admin/v1/brands').expect(401);
    await request(app.getHttpServer())
      .get('/admin/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/v1/brands')
      .set('Authorization', 'Bearer invalid')
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', 'catalog.brands.read')
      .send({ name: 'Unauthorized', slug: `unauthorized-${suffix}` })
      .expect(403);
  });

  it('manages brands and prevents duplicate slugs or invalid input', async () => {
    const api = request(app.getHttpServer());
    const slug = `brand-${suffix}`;
    const created = await api
      .post('/admin/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .send({ name: 'Test brand', slug })
      .expect(201);
    const id = idFrom(created.body);
    brandIds.push(id);

    await api
      .post('/admin/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .send({ name: 'Duplicate', slug })
      .expect(409);
    await api
      .patch(`/admin/v1/brands/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .send({ isActive: false })
      .expect(400);
    await api
      .patch(`/admin/v1/brands/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .send({ name: 'Updated brand' })
      .expect(200);
    await api
      .get(`/admin/v1/brands/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Updated brand');
      });
    await api
      .patch(`/admin/v1/brands/${id}/deactivate`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .expect(200);
    await api
      .get('/public/v1/brands')
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((brand: { id: string }) => brand.id === id)).toBe(
          false,
        );
      });
    await api
      .patch(`/admin/v1/brands/${id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Actor-Id', actor)
      .set('X-Actor-Permissions', permissions)
      .expect(200);
  });

  it('validates category hierarchy and active descendants', async () => {
    const api = request(app.getHttpServer());
    const auth = {
      Authorization: `Bearer ${token}`,
      'X-Actor-Id': actor,
      'X-Actor-Permissions': permissions,
    };
    const rootSlug = `root-${suffix}`;
    const root = await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({ name: 'Root', slug: rootSlug })
      .expect(201);
    const rootId = idFrom(root.body);
    categoryIds.push(rootId);
    const child = await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({ name: 'Child', slug: `child-${suffix}`, parentId: rootId })
      .expect(201);
    const childId = idFrom(child.body);
    categoryIds.push(childId);
    await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({ name: 'Duplicate', slug: rootSlug })
      .expect(409);
    await api
      .get(`/admin/v1/categories/slug/${rootSlug}`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(rootId);
      });
    await api.get(`/admin/v1/categories/${childId}`).set(auth).expect(200);
    await api
      .get('/admin/v1/categories/tree')
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        const node = body.find(
          (category: { id: string }) => category.id === rootId,
        );
        expect(
          node.children.map((category: { id: string }) => category.id),
        ).toContain(childId);
      });
    await api
      .patch(`/admin/v1/categories/${rootId}`)
      .set(auth)
      .send({ parentId: childId })
      .expect(400);
    await api
      .patch(`/admin/v1/categories/${rootId}/deactivate`)
      .set(auth)
      .expect(409);
    await api
      .patch(`/admin/v1/categories/${childId}/deactivate`)
      .set(auth)
      .expect(200);
    await api
      .patch(`/admin/v1/categories/${rootId}/deactivate`)
      .set(auth)
      .expect(200);
    await api
      .get('/public/v1/categories')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.some((category: { id: string }) => category.id === rootId),
        ).toBe(false);
      });
    await api
      .patch(`/admin/v1/categories/${childId}/activate`)
      .set(auth)
      .expect(400);
    await api
      .patch(`/admin/v1/categories/${rootId}/activate`)
      .set(auth)
      .expect(200);
    await api
      .patch(`/admin/v1/categories/${childId}/activate`)
      .set(auth)
      .expect(200);
    await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({
        name: 'Invalid parent',
        slug: `invalid-${suffix}`,
        parentId: randomUUID(),
      })
      .expect(404);
  });

  it('serializes competing parent changes to prevent cycles', async () => {
    const api = request(app.getHttpServer());
    const auth = {
      Authorization: `Bearer ${token}`,
      'X-Actor-Id': actor,
      'X-Actor-Permissions': permissions,
    };
    const first = await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({ name: 'First', slug: `first-${suffix}` })
      .expect(201);
    const second = await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({ name: 'Second', slug: `second-${suffix}` })
      .expect(201);
    const firstId = idFrom(first.body);
    const secondId = idFrom(second.body);
    categoryIds.push(firstId, secondId);
    const responses = await Promise.all([
      api
        .patch(`/admin/v1/categories/${firstId}`)
        .set(auth)
        .send({ parentId: secondId }),
      api
        .patch(`/admin/v1/categories/${secondId}`)
        .set(auth)
        .send({ parentId: firstId }),
    ]);
    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([200, 400]);
    await cleanup.query(
      'UPDATE catalog.categories SET parent_id = NULL WHERE id = ANY($1::uuid[])',
      [[firstId, secondId]],
    );
  });

  it('serializes child creation against parent deactivation', async () => {
    const api = request(app.getHttpServer());
    const auth = {
      Authorization: `Bearer ${token}`,
      'X-Actor-Id': actor,
      'X-Actor-Permissions': permissions,
    };
    const parent = await api
      .post('/admin/v1/categories')
      .set(auth)
      .send({ name: 'Concurrent parent', slug: `concurrent-parent-${suffix}` })
      .expect(201);
    const parentId = idFrom(parent.body);
    categoryIds.push(parentId);
    const [deactivated, child] = await Promise.all([
      api.patch(`/admin/v1/categories/${parentId}/deactivate`).set(auth),
      api
        .post('/admin/v1/categories')
        .set(auth)
        .send({
          name: 'Concurrent child',
          slug: `concurrent-child-${suffix}`,
          parentId,
        }),
    ]);
    expect(
      (deactivated.status === 200 && child.status === 400) ||
        (deactivated.status === 409 && child.status === 201),
    ).toBe(true);
    if (child.status === 201) categoryIds.push(idFrom(child.body));
  });
});

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

export function createAdminOpenApiDocument(
  app: INestApplication,
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('LicoresYaaa Catalog Admin API')
    .setDescription('Administrative API for trusted BFF callers.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'catalog-admin')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const paths: OpenAPIObject['paths'] = {};
  for (const [path, value] of Object.entries(document.paths)) {
    if (path.startsWith('/admin/v1/')) paths[path] = value;
  }
  return { ...document, paths };
}

export function setupAdminSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, () => createAdminOpenApiDocument(app));
}

export function createPublicOpenApiDocument(
  app: INestApplication,
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('LicoresYaaa Public Catalog API')
    .setDescription('Public commercial catalog for the storefront.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const paths: OpenAPIObject['paths'] = {};
  for (const [path, value] of Object.entries(document.paths)) {
    if (path.startsWith('/public/v1/')) paths[path] = value;
  }
  return { ...document, paths };
}

export function setupPublicSwagger(app: INestApplication) {
  SwaggerModule.setup('public-docs', app, () =>
    createPublicOpenApiDocument(app),
  );
}

export function createInternalOpenApiDocument(
  app: INestApplication,
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('LicoresYaaa Catalog Service API')
    .setDescription('Internal API for trusted service callers.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'catalog-service')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const paths: OpenAPIObject['paths'] = {};
  for (const [path, value] of Object.entries(document.paths)) {
    if (path.startsWith('/internal/v1/')) paths[path] = value;
  }
  const variantSchema =
    document.components?.schemas?.InternalVariantResponseDto;
  if (!variantSchema)
    throw new Error('Internal variant response schema is missing');
  return {
    ...document,
    paths,
    components: {
      schemas: { InternalVariantResponseDto: variantSchema },
      securitySchemes: document.components?.securitySchemes,
    },
  };
}

export function setupInternalSwagger(app: INestApplication) {
  SwaggerModule.setup('internal-docs', app, () =>
    createInternalOpenApiDocument(app),
  );
}

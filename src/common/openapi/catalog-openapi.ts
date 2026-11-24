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

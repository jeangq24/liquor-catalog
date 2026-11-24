import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { setupAdminSwagger } from './common/openapi/catalog-openapi.js';
import figlet from 'figlet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (app.get(ConfigService).get<string>('SWAGGER_ENABLED') === 'true') {
    setupAdminSwagger(app);
  }
  await app.listen(process.env.PORT ?? 3002);
  const amarillo = '\x1b[33m';
  const reset = '\x1b[0m';

  const banner = figlet.textSync('LicoresYaaa - Catalog', {
    horizontalLayout: 'controlled smushing',
  });

  console.log(`${amarillo}${banner}${reset}`);
}
await bootstrap();

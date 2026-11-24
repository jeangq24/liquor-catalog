import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { BrandsModule } from './modules/brands/brands.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { VariantsModule } from './modules/variants/variants.module.js';
import { validateConfiguration } from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfiguration }),
    DatabaseModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    VariantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

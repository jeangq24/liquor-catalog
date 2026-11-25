import { Module } from '@nestjs/common';
import { CatalogSecurityModule } from '../../common/security/catalog-security.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  ProductsController,
  PublicProductCollectionsController,
  PublicProductsController,
} from './products.controller.js';
import { ProductsService } from './products.service.js';
import { PublicProductsService } from './public-products.service.js';

@Module({
  imports: [DatabaseModule, CatalogSecurityModule],
  controllers: [
    ProductsController,
    PublicProductsController,
    PublicProductCollectionsController,
  ],
  providers: [ProductsService, PublicProductsService],
})
export class ProductsModule {}

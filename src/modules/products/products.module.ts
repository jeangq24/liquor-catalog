import { Module } from '@nestjs/common';
import { CatalogSecurityModule } from '../../common/security/catalog-security.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  ProductsController,
  PublicProductsController,
} from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [DatabaseModule, CatalogSecurityModule],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

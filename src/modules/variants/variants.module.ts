import { Module } from '@nestjs/common';
import { CatalogSecurityModule } from '../../common/security/catalog-security.module.js';
import { CatalogServiceGuard } from '../../common/security/catalog-service.guard.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  InternalVariantsController,
  ProductVariantsController,
  VariantsController,
} from './variants.controller.js';
import { VariantsService } from './variants.service.js';

@Module({
  imports: [DatabaseModule, CatalogSecurityModule],
  controllers: [
    ProductVariantsController,
    VariantsController,
    InternalVariantsController,
  ],
  providers: [VariantsService, CatalogServiceGuard],
})
export class VariantsModule {}

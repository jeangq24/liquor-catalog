import { Module } from '@nestjs/common';
import { CatalogSecurityModule } from '../../common/security/catalog-security.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  CategoriesController,
  PublicCategoriesController,
} from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  imports: [DatabaseModule, CatalogSecurityModule],
  controllers: [CategoriesController, PublicCategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}

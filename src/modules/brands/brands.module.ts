import { Module } from '@nestjs/common';
import { CatalogSecurityModule } from '../../common/security/catalog-security.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  BrandsController,
  PublicBrandsController,
} from './brands.controller.js';
import { BrandsService } from './brands.service.js';

@Module({
  imports: [DatabaseModule, CatalogSecurityModule],
  controllers: [BrandsController, PublicBrandsController],
  providers: [BrandsService],
})
export class BrandsModule {}

import { Module } from '@nestjs/common';
import { CatalogAuthGuard } from './catalog-auth.guard.js';
import { CatalogPermissionGuard } from './catalog-permission.guard.js';

@Module({
  providers: [CatalogAuthGuard, CatalogPermissionGuard],
  exports: [CatalogAuthGuard, CatalogPermissionGuard],
})
export class CatalogSecurityModule {}

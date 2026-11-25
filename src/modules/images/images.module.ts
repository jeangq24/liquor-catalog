import { Module } from '@nestjs/common';
import { CatalogSecurityModule } from '../../common/security/catalog-security.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  ImagesController,
  ProductImagesController,
} from './images.controller.js';
import { ImagesService } from './images.service.js';

@Module({
  imports: [DatabaseModule, CatalogSecurityModule],
  controllers: [ImagesController, ProductImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}

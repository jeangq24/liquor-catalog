import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { CreateImageDto, UpdateImageDto } from './dto/image.dto.js';
import { ImagesService } from './images.service.js';

@Controller('admin/v1/products/:productId/images')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProductImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get()
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.images.list(productId);
  }

  @Post()
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateImageDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.images.create(productId, dto, actor);
  }
}

@Controller('admin/v1/images')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get(':id')
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.find(id);
  }

  @Patch(':id')
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImageDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.images.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.remove(id);
  }
}

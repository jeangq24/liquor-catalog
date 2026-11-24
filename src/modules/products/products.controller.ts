import {
  Body,
  Controller,
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
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('admin/v1/products')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list() {
    return this.products.list();
  }

  @Get('slug/:slug')
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findById(id);
  }

  @Post()
  @RequirePermissions(CatalogPermission.PRODUCT_CREATE)
  create(@Body() dto: CreateProductDto, @Headers('x-actor-id') actor: string) {
    return this.products.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.update(id, dto, actor);
  }

  @Patch(':id/publish')
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.publish(id, actor);
  }

  @Patch(':id/archive')
  @RequirePermissions(CatalogPermission.PRODUCT_DEACTIVATE)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.archive(id, actor);
  }
}

@Controller('public/v1/products')
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.listPublic();
  }

  @Get(':slug')
  find(@Param('slug') slug: string) {
    return this.products.findPublicBySlug(slug);
  }
}

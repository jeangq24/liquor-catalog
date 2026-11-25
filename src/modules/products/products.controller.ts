import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiAdminController,
  ApiPageResponse,
} from '../../common/openapi/catalog-openapi.decorators.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { ListPublicProductsDto } from './dto/list-public-products.dto.js';
import { PublicProductResponseDto } from './dto/public-product-response.dto.js';
import { PublicProductsService } from './public-products.service.js';
import { ProductsService } from './products.service.js';

@Controller('admin/v1/products')
@ApiAdminController('Admin products')
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
  @ApiPageResponse(ProductResponseDto)
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(@Query() query: ListProductsDto) {
    return this.products.list(query);
  }

  @Get('slug/:slug')
  @ApiOkResponse({ type: ProductResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findById(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ProductResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_CREATE)
  create(@Body() dto: CreateProductDto, @Headers('x-actor-id') actor: string) {
    return this.products.create(dto, actor);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.update(id, dto, actor);
  }

  @Patch(':id/publish')
  @ApiOkResponse({ type: ProductResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.publish(id, actor);
  }

  @Patch(':id/archive')
  @ApiOkResponse({ type: ProductResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_DEACTIVATE)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.archive(id, actor);
  }
}

@Controller('public/v1/products')
@ApiTags('Public products')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PublicProductsController {
  constructor(private readonly products: PublicProductsService) {}

  @Get()
  @ApiPageResponse(PublicProductResponseDto)
  list(@Query() query: ListPublicProductsDto) {
    return this.products.list(query);
  }

  @Get(':slug')
  @ApiOkResponse({ type: PublicProductResponseDto })
  find(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }
}

@Controller('public/v1')
@ApiTags('Public products')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PublicProductCollectionsController {
  constructor(private readonly products: PublicProductsService) {}

  @Get('brands/:slug/products')
  @ApiPageResponse(PublicProductResponseDto)
  byBrand(@Param('slug') slug: string, @Query() query: ListPublicProductsDto) {
    return this.products.list(query, { brandSlug: slug });
  }

  @Get('categories/:slug/products')
  @ApiPageResponse(PublicProductResponseDto)
  byCategory(
    @Param('slug') slug: string,
    @Query() query: ListPublicProductsDto,
  ) {
    return this.products.list(query, { categorySlug: slug });
  }
}

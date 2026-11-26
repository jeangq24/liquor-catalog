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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
@ApiAdminController('Administración de productos')
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
  @ApiOperation({ summary: 'Listar productos administrativos' })
  @ApiBadRequestResponse({
    description: 'Los filtros o parámetros de paginación no son válidos.',
  })
  @ApiPageResponse(ProductResponseDto)
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(@Query() query: ListProductsDto) {
    return this.products.list(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Consultar un producto por slug' })
  @ApiParam({ name: 'slug', description: 'Slug único del producto.' })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Producto consultado.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un producto por UUID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable del producto.',
  })
  @ApiBadRequestResponse({ description: 'El UUID del producto no es válido.' })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Producto consultado.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un producto' })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen las validaciones.',
  })
  @ApiNotFoundResponse({
    description: 'No se encontró la marca o una de las categorías asociadas.',
  })
  @ApiConflictResponse({ description: 'El slug ya está registrado.' })
  @ApiCreatedResponse({
    type: ProductResponseDto,
    description: 'Producto creado en estado borrador.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_CREATE)
  create(@Body() dto: CreateProductDto, @Headers('x-actor-id') actor: string) {
    return this.products.create(dto, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable del producto.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los datos enviados no son válidos.',
  })
  @ApiConflictResponse({ description: 'El slug ya está registrado.' })
  @ApiNotFoundResponse({
    description: 'No se encontró el producto, la marca o una categoría.',
  })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Producto actualizado.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.update(id, dto, actor);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publicar un producto' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable del producto.',
  })
  @ApiConflictResponse({
    description: 'El producto necesita una variante activa para publicarse.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Producto publicado.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.publish(id, actor);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archivar un producto' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable del producto.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiOkResponse({
    type: ProductResponseDto,
    description: 'Producto archivado.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_DEACTIVATE)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.products.archive(id, actor);
  }
}

@Controller('public/v1/products')
@ApiTags('Consulta pública de productos')
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
  @ApiOperation({ summary: 'Listar productos publicados' })
  @ApiBadRequestResponse({
    description: 'Los filtros o el rango de precios no son válidos.',
  })
  @ApiPageResponse(PublicProductResponseDto)
  list(@Query() query: ListPublicProductsDto) {
    return this.products.list(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Consultar el detalle por slug' })
  @ApiParam({ name: 'slug', description: 'Slug único del producto publicado.' })
  @ApiNotFoundResponse({ description: 'No se encontró el producto publicado.' })
  @ApiOkResponse({
    type: PublicProductResponseDto,
    description: 'Detalle del producto publicado.',
  })
  find(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }
}

@Controller('public/v1')
@ApiTags('Consulta pública de productos')
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
  @ApiOperation({ summary: 'Listar productos publicados de una marca' })
  @ApiParam({ name: 'slug', description: 'Slug de una marca activa.' })
  @ApiBadRequestResponse({
    description: 'Los filtros o el rango de precios no son válidos.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la marca activa.' })
  @ApiPageResponse(PublicProductResponseDto)
  byBrand(@Param('slug') slug: string, @Query() query: ListPublicProductsDto) {
    return this.products.list(query, { brandSlug: slug });
  }

  @Get('categories/:slug/products')
  @ApiOperation({ summary: 'Listar productos publicados de una categoría' })
  @ApiParam({ name: 'slug', description: 'Slug de una categoría activa.' })
  @ApiBadRequestResponse({
    description: 'Los filtros o el rango de precios no son válidos.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría activa.' })
  @ApiPageResponse(PublicProductResponseDto)
  byCategory(
    @Param('slug') slug: string,
    @Query() query: ListPublicProductsDto,
  ) {
    return this.products.list(query, { categorySlug: slug });
  }
}

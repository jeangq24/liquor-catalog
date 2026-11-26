import {
  Body,
  Controller,
  Get,
  Header,
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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiConflictResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiAdminController,
  ApiPageResponse,
} from '../../common/openapi/catalog-openapi.decorators.js';
import { VariantResponseDto } from './dto/variant-response.dto.js';
import { InternalVariantResponseDto } from './dto/internal-variant-response.dto.js';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { ActiveSearchQueryDto } from '../../common/pagination/pagination.dto.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { CatalogServiceGuard } from '../../common/security/catalog-service.guard.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';
import { VariantsService } from './variants.service.js';

@Controller('admin/v1/products/:productId/variants')
@ApiAdminController('Administración de variantes')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProductVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar variantes de un producto' })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'UUID estable del producto.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los parámetros de consulta no son válidos.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiPageResponse(VariantResponseDto)
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ActiveSearchQueryDto,
  ) {
    return this.variants.list(productId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una variante para un producto' })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'UUID estable del producto al que pertenecerá la variante.',
  })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen las validaciones.',
  })
  @ApiConflictResponse({
    description: 'El SKU o el código de barras ya están registrados.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiCreatedResponse({
    type: VariantResponseDto,
    description: 'Variante creada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_CREATE)
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.create(productId, dto, actor);
  }
}

@Controller('admin/v1/variants')
@ApiAdminController('Administración de variantes')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una variante por UUID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la variante.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la variante no es válido.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la variante.' })
  @ApiOkResponse({
    type: VariantResponseDto,
    description: 'Variante consultada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.variants.find(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una variante' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la variante.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los datos enviados no son válidos.',
  })
  @ApiConflictResponse({
    description: 'El SKU o el código de barras ya están registrados.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la variante.' })
  @ApiOkResponse({
    type: VariantResponseDto,
    description: 'Variante actualizada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una variante' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la variante.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la variante no es válido.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la variante.' })
  @ApiOkResponse({
    type: VariantResponseDto,
    description: 'Variante activada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar una variante' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la variante.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la variante no es válido.',
  })
  @ApiConflictResponse({
    description:
      'No se puede desactivar la última variante activa de un producto publicado.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la variante.' })
  @ApiOkResponse({
    type: VariantResponseDto,
    description: 'Variante desactivada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.setActive(id, false, actor);
  }
}

@Controller('internal/v1/variants')
@ApiTags('Consulta interna de variantes')
@ApiBearerAuth('catalog-service')
@UseGuards(CatalogServiceGuard)
export class InternalVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consultar variante y precio comercial vigente',
    description:
      'Commerce debe rechazar las variantes no comprables. Inventory puede consultar variantes inactivas para conservar referencias históricas.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la variante en Catalog.',
  })
  @ApiOkResponse({
    type: InternalVariantResponseDto,
    description: 'Datos actuales de la variante y su condición de compra.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la variante no es válido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token de servicio o no es válido.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la variante.' })
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.variants.findInternal(id);
  }
}

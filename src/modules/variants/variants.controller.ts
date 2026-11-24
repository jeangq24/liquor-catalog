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
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import {
  ApiAdminController,
  ApiPageResponse,
} from '../../common/openapi/catalog-openapi.decorators.js';
import { VariantResponseDto } from './dto/variant-response.dto.js';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { ActiveSearchQueryDto } from '../../common/pagination/pagination.dto.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { CatalogServiceGuard } from '../../common/security/catalog-service.guard.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto.js';
import { VariantsService } from './variants.service.js';

@Controller('admin/v1/products/:productId/variants')
@ApiAdminController('Admin variants')
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
  @ApiPageResponse(VariantResponseDto)
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ActiveSearchQueryDto,
  ) {
    return this.variants.list(productId, query);
  }

  @Post()
  @ApiCreatedResponse({ type: VariantResponseDto })
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
@ApiAdminController('Admin variants')
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
  @ApiOkResponse({ type: VariantResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.variants.find(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: VariantResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @ApiOkResponse({ type: VariantResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @ApiOkResponse({ type: VariantResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.variants.setActive(id, false, actor);
  }
}

@Controller('internal/v1/variants')
@UseGuards(CatalogServiceGuard)
export class InternalVariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.variants.findInternal(id);
  }
}

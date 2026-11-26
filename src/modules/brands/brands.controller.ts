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
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAdminController,
  ApiPageResponse,
} from '../../common/openapi/catalog-openapi.decorators.js';
import { BrandResponseDto } from './dto/brand-response.dto.js';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { ActiveSearchQueryDto } from '../../common/pagination/pagination.dto.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { BrandsService } from './brands.service.js';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto.js';

@Controller('admin/v1/brands')
@ApiAdminController('Administración de marcas')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar marcas administrativas' })
  @ApiBadRequestResponse({
    description: 'Los filtros o parámetros de paginación no son válidos.',
  })
  @ApiPageResponse(BrandResponseDto)
  @RequirePermissions(CatalogPermission.BRAND_READ)
  list(@Query() query: ActiveSearchQueryDto) {
    return this.brands.listAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una marca por UUID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la marca.',
  })
  @ApiBadRequestResponse({ description: 'El UUID de la marca no es válido.' })
  @ApiNotFoundResponse({ description: 'No se encontró la marca.' })
  @ApiOkResponse({ type: BrandResponseDto, description: 'Marca consultada.' })
  @RequirePermissions(CatalogPermission.BRAND_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una marca' })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen las validaciones.',
  })
  @ApiConflictResponse({
    description: 'El nombre o el slug ya están registrados.',
  })
  @ApiCreatedResponse({
    type: BrandResponseDto,
    description: 'Marca creada.',
  })
  @RequirePermissions(CatalogPermission.BRAND_CREATE)
  create(@Body() dto: CreateBrandDto, @Headers('x-actor-id') actor: string) {
    return this.brands.create(dto, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una marca' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la marca.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los datos enviados no son válidos.',
  })
  @ApiConflictResponse({
    description: 'El nombre o el slug ya están registrados.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la marca.' })
  @ApiOkResponse({ type: BrandResponseDto, description: 'Marca actualizada.' })
  @RequirePermissions(CatalogPermission.BRAND_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.brands.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una marca' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la marca.',
  })
  @ApiBadRequestResponse({ description: 'El UUID de la marca no es válido.' })
  @ApiNotFoundResponse({ description: 'No se encontró la marca.' })
  @ApiOkResponse({ type: BrandResponseDto, description: 'Marca activada.' })
  @RequirePermissions(CatalogPermission.BRAND_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.brands.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar una marca' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la marca.',
  })
  @ApiBadRequestResponse({ description: 'El UUID de la marca no es válido.' })
  @ApiNotFoundResponse({ description: 'No se encontró la marca.' })
  @ApiOkResponse({ type: BrandResponseDto, description: 'Marca desactivada.' })
  @RequirePermissions(CatalogPermission.BRAND_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.brands.setActive(id, false, actor);
  }
}

@Controller('public/v1/brands')
@ApiTags('Consulta pública de marcas')
export class PublicBrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar marcas activas' })
  @ApiOkResponse({
    type: BrandResponseDto,
    isArray: true,
    description: 'Marcas activas.',
  })
  list() {
    return this.brands.list(true);
  }
}

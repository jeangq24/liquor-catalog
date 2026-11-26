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
import {
  CategoryResponseDto,
  CategoryTreeResponseDto,
} from './dto/category-response.dto.js';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { ListCategoriesDto } from './dto/list-categories.dto.js';

@Controller('admin/v1/categories')
@ApiAdminController('Administración de categorías')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías administrativas' })
  @ApiBadRequestResponse({
    description: 'Los filtros o parámetros de paginación no son válidos.',
  })
  @ApiPageResponse(CategoryResponseDto)
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  list(@Query() query: ListCategoriesDto) {
    return this.categories.listAdmin(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Consultar el árbol administrativo de categorías' })
  @ApiOkResponse({
    type: CategoryTreeResponseDto,
    isArray: true,
    description: 'Árbol completo de categorías.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  tree() {
    return this.categories.tree();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Consultar una categoría por slug' })
  @ApiParam({ name: 'slug', description: 'Slug único de la categoría.' })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría.' })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Categoría consultada.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.categories.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una categoría por UUID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la categoría.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la categoría no es válido.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría.' })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Categoría consultada.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una categoría' })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen las validaciones.',
  })
  @ApiConflictResponse({
    description: 'El nombre o el slug ya están registrados.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría padre.' })
  @ApiCreatedResponse({
    type: CategoryResponseDto,
    description: 'Categoría creada.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_CREATE)
  create(@Body() dto: CreateCategoryDto, @Headers('x-actor-id') actor: string) {
    return this.categories.create(dto, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una categoría' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la categoría.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los datos enviados no son válidos.',
  })
  @ApiConflictResponse({
    description: 'El nombre o el slug ya están registrados.',
  })
  @ApiNotFoundResponse({
    description: 'No se encontró la categoría o su categoría padre.',
  })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Categoría actualizada.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una categoría' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la categoría.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la categoría no es válido.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría.' })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Categoría activada.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar una categoría' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la categoría.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID de la categoría no es válido.',
  })
  @ApiConflictResponse({
    description:
      'No se puede desactivar mientras existan descendientes activos.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría.' })
  @ApiOkResponse({
    type: CategoryResponseDto,
    description: 'Categoría desactivada.',
  })
  @RequirePermissions(CatalogPermission.CATEGORY_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.setActive(id, false, actor);
  }
}

@Controller('public/v1/categories')
@ApiTags('Consulta pública de categorías')
export class PublicCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías activas' })
  @ApiOkResponse({
    type: CategoryResponseDto,
    isArray: true,
    description: 'Categorías activas.',
  })
  list() {
    return this.categories.list(true);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Consultar el árbol de categorías activas' })
  @ApiOkResponse({
    type: CategoryTreeResponseDto,
    isArray: true,
    description: 'Árbol de categorías activas.',
  })
  tree() {
    return this.categories.tree(true);
  }
}

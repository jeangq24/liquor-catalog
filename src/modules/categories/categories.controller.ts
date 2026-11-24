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
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Controller('admin/v1/categories')
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
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  list() {
    return this.categories.list();
  }

  @Get('tree')
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  tree() {
    return this.categories.tree();
  }

  @Get('slug/:slug')
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.categories.findBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findById(id);
  }

  @Post()
  @RequirePermissions(CatalogPermission.CATEGORY_CREATE)
  create(@Body() dto: CreateCategoryDto, @Headers('x-actor-id') actor: string) {
    return this.categories.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(CatalogPermission.CATEGORY_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @RequirePermissions(CatalogPermission.CATEGORY_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @RequirePermissions(CatalogPermission.CATEGORY_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.setActive(id, false, actor);
  }
}

@Controller('public/v1/categories')
export class PublicCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list(true);
  }

  @Get('tree')
  tree() {
    return this.categories.tree(true);
  }
}

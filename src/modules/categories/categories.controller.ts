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
@ApiAdminController('Admin categories')
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
  @ApiPageResponse(CategoryResponseDto)
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  list(@Query() query: ListCategoriesDto) {
    return this.categories.listAdmin(query);
  }

  @Get('tree')
  @ApiOkResponse({ type: CategoryTreeResponseDto, isArray: true })
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  tree() {
    return this.categories.tree();
  }

  @Get('slug/:slug')
  @ApiOkResponse({ type: CategoryResponseDto })
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.categories.findBySlug(slug);
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  @RequirePermissions(CatalogPermission.CATEGORY_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findById(id);
  }

  @Post()
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @RequirePermissions(CatalogPermission.CATEGORY_CREATE)
  create(@Body() dto: CreateCategoryDto, @Headers('x-actor-id') actor: string) {
    return this.categories.create(dto, actor);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  @RequirePermissions(CatalogPermission.CATEGORY_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @ApiOkResponse({ type: CategoryResponseDto })
  @RequirePermissions(CatalogPermission.CATEGORY_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @ApiOkResponse({ type: CategoryResponseDto })
  @RequirePermissions(CatalogPermission.CATEGORY_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.categories.setActive(id, false, actor);
  }
}

@Controller('public/v1/categories')
@ApiTags('Public categories')
export class PublicCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  list() {
    return this.categories.list(true);
  }

  @Get('tree')
  @ApiOkResponse({ type: CategoryTreeResponseDto, isArray: true })
  tree() {
    return this.categories.tree(true);
  }
}

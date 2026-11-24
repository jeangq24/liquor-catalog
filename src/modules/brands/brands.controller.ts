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
import { BrandsService } from './brands.service.js';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto.js';

@Controller('admin/v1/brands')
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
  @RequirePermissions(CatalogPermission.BRAND_READ)
  list() {
    return this.brands.list();
  }

  @Get(':id')
  @RequirePermissions(CatalogPermission.BRAND_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.findById(id);
  }

  @Post()
  @RequirePermissions(CatalogPermission.BRAND_CREATE)
  create(@Body() dto: CreateBrandDto, @Headers('x-actor-id') actor: string) {
    return this.brands.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions(CatalogPermission.BRAND_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.brands.update(id, dto, actor);
  }

  @Patch(':id/activate')
  @RequirePermissions(CatalogPermission.BRAND_UPDATE)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.brands.setActive(id, true, actor);
  }

  @Patch(':id/deactivate')
  @RequirePermissions(CatalogPermission.BRAND_DEACTIVATE)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.brands.setActive(id, false, actor);
  }
}

@Controller('public/v1/brands')
export class PublicBrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list() {
    return this.brands.list(true);
  }
}

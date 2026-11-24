import {
  Body,
  Controller,
  Delete,
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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import {
  ApiAdminController,
  ApiPageResponse,
} from '../../common/openapi/catalog-openapi.decorators.js';
import { ImageResponseDto } from './dto/image-response.dto.js';
import { CatalogAuthGuard } from '../../common/security/catalog-auth.guard.js';
import { CatalogPermissionGuard } from '../../common/security/catalog-permission.guard.js';
import { CatalogPermission } from '../../common/security/catalog-permissions.js';
import { RequirePermissions } from '../../common/security/require-permissions.decorator.js';
import { CreateImageDto, UpdateImageDto } from './dto/image.dto.js';
import { ListImagesDto } from './dto/list-images.dto.js';
import { ImagesService } from './images.service.js';

@Controller('admin/v1/products/:productId/images')
@ApiAdminController('Admin images')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProductImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get()
  @ApiPageResponse(ImageResponseDto)
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListImagesDto,
  ) {
    return this.images.list(productId, query);
  }

  @Post()
  @ApiCreatedResponse({ type: ImageResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateImageDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.images.create(productId, dto, actor);
  }
}

@Controller('admin/v1/images')
@ApiAdminController('Admin images')
@UseGuards(CatalogAuthGuard, CatalogPermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get(':id')
  @ApiOkResponse({ type: ImageResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.find(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ImageResponseDto })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImageDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.images.update(id, dto, actor);
  }

  @Delete(':id')
  @ApiServiceUnavailableResponse({
    description: 'Deletion is unavailable until storage is integrated',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.remove(id);
  }
}

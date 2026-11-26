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
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
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
@ApiAdminController('Administración de imágenes')
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
  @ApiOperation({ summary: 'Listar imágenes asociadas a un producto' })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'UUID estable del producto.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los filtros de consulta no son válidos.',
  })
  @ApiNotFoundResponse({ description: 'No se encontró el producto.' })
  @ApiPageResponse(ImageResponseDto)
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListImagesDto,
  ) {
    return this.images.list(productId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una imagen para un producto' })
  @ApiParam({
    name: 'productId',
    format: 'uuid',
    description: 'UUID estable del producto asociado.',
  })
  @ApiBadRequestResponse({
    description: 'Los datos enviados no cumplen las validaciones.',
  })
  @ApiNotFoundResponse({
    description: 'No se encontró el producto o la variante asociada.',
  })
  @ApiCreatedResponse({
    type: ImageResponseDto,
    description: 'Referencia de imagen registrada.',
  })
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
@ApiAdminController('Administración de imágenes')
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
  @ApiOperation({ summary: 'Consultar una imagen por UUID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la referencia de imagen.',
  })
  @ApiBadRequestResponse({ description: 'El UUID de la imagen no es válido.' })
  @ApiNotFoundResponse({
    description: 'No se encontró la referencia de imagen.',
  })
  @ApiOkResponse({
    type: ImageResponseDto,
    description: 'Referencia de imagen consultada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_READ)
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.find(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar los metadatos de una imagen' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la referencia de imagen.',
  })
  @ApiBadRequestResponse({
    description: 'El UUID o los datos enviados no son válidos.',
  })
  @ApiNotFoundResponse({
    description: 'No se encontró la imagen o la variante asociada.',
  })
  @ApiOkResponse({
    type: ImageResponseDto,
    description: 'Referencia de imagen actualizada.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImageDto,
    @Headers('x-actor-id') actor: string,
  ) {
    return this.images.update(id, dto, actor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una referencia de imagen' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID estable de la referencia de imagen.',
  })
  @ApiBadRequestResponse({ description: 'El UUID de la imagen no es válido.' })
  @ApiNotFoundResponse({
    description: 'No se encontró la referencia de imagen.',
  })
  @ApiServiceUnavailableResponse({
    description:
      'La eliminación no está disponible hasta integrar el almacenamiento. El registro no se modifica.',
  })
  @RequirePermissions(CatalogPermission.PRODUCT_UPDATE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.remove(id);
  }
}

import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { MAX_PAGE_SIZE } from '../pagination/pagination.constants.js';

export function ApiAdminController(tag: string) {
  return applyDecorators(
    ApiTags(tag),
    ApiBearerAuth('catalog-admin'),
    ApiHeader({
      name: 'X-Actor-Id',
      required: true,
      description: 'UUID del actor proporcionado por el BFF de confianza.',
    }),
    ApiHeader({
      name: 'X-Actor-Permissions',
      required: true,
      description:
        'Permisos separados por comas y proporcionados por el BFF de confianza.',
    }),
    ApiUnauthorizedResponse({
      description:
        'El token interno o el identificador del actor no es válido.',
    }),
    ApiForbiddenResponse({
      description:
        'El actor no tiene el permiso requerido para esta operación.',
    }),
  );
}

export function ApiPageResponse(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Listado paginado.',
      schema: {
        type: 'object',
        required: ['items', 'page', 'limit', 'total'],
        properties: {
          items: {
            type: 'array',
            description: 'Elementos de la página actual.',
            items: { $ref: getSchemaPath(model) },
          },
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Número de página, comenzando en 1.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: MAX_PAGE_SIZE,
            description: 'Cantidad máxima de elementos por página.',
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: 'Cantidad total de elementos que cumplen los filtros.',
          },
        },
      },
    }),
  );
}

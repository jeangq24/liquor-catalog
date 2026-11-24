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
      description: 'UUID supplied by the trusted BFF',
    }),
    ApiHeader({
      name: 'X-Actor-Permissions',
      required: true,
      description: 'Comma-separated permissions supplied by the trusted BFF',
    }),
    ApiUnauthorizedResponse({ description: 'Invalid internal token or actor' }),
    ApiForbiddenResponse({ description: 'Missing required permission' }),
  );
}

export function ApiPageResponse(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['items', 'page', 'limit', 'total'],
        properties: {
          items: { type: 'array', items: { $ref: getSchemaPath(model) } },
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE },
          total: { type: 'integer', minimum: 0 },
        },
      },
    }),
  );
}

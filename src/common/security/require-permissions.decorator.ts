import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export const REQUIRED_PERMISSIONS = 'catalog.requiredPermissions';

export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS, permissions),
    ApiOperation({
      description: `Permisos requeridos: ${permissions.join(', ')}.`,
    }),
  );

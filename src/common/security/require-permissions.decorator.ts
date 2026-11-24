import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'catalog.requiredPermissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

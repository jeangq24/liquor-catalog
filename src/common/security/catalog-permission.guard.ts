import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS } from './require-permissions.decorator.js';

interface InternalRequest {
  readonly headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class CatalogPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly string[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      throw new ForbiddenException('No catalog permission configured');
    }
    const header = context.switchToHttp().getRequest<InternalRequest>().headers[
      'x-actor-permissions'
    ];
    const permissions = new Set(
      typeof header === 'string'
        ? header.split(',').map((item) => item.trim())
        : [],
    );
    if (!required.every((permission) => permissions.has(permission))) {
      throw new ForbiddenException('Missing catalog permission');
    }
    return true;
  }
}

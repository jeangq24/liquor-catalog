import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MIN_INTERNAL_TOKEN_LENGTH } from './catalog-security.constants.js';
import { validBearerToken } from './service-token.js';

@Injectable()
export class CatalogServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>('CATALOG_SERVICE_API_TOKEN');
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    if (
      !token ||
      token.length < MIN_INTERNAL_TOKEN_LENGTH ||
      token !== token.trim() ||
      !validBearerToken(token, request.headers.authorization)
    ) {
      throw new UnauthorizedException(
        'Internal service authentication required',
      );
    }
    return true;
  }
}

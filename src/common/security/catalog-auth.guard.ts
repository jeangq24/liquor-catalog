import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { MIN_INTERNAL_TOKEN_LENGTH } from './catalog-security.constants.js';
import { validBearerToken } from './service-token.js';

interface InternalRequest {
  readonly headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class CatalogAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>('CATALOG_INTERNAL_API_TOKEN');
    const headers = context
      .switchToHttp()
      .getRequest<InternalRequest>().headers;
    const authorization = headers.authorization;
    const actor = headers['x-actor-id'];
    if (
      !token ||
      token.length < MIN_INTERNAL_TOKEN_LENGTH ||
      token !== token.trim() ||
      typeof authorization !== 'string' ||
      !/^Bearer\s+(\S+)$/i.test(authorization) ||
      typeof actor !== 'string' ||
      !isUUID(actor)
    ) {
      throw new UnauthorizedException('Internal authentication required');
    }
    if (!validBearerToken(token, authorization)) {
      throw new UnauthorizedException('Invalid internal service token');
    }
    return true;
  }
}

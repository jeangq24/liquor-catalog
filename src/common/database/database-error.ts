import { ConflictException } from '@nestjs/common';

export function rethrowCatalogDatabaseError(error: unknown): never {
  if (error instanceof Error) {
    const cause = error.cause;
    if (
      cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === '23505'
    ) {
      throw new ConflictException('A catalog identifier already exists');
    }
  }
  throw error;
}

import { MIN_INTERNAL_TOKEN_LENGTH } from '../common/security/catalog-security.constants.js';

export function validateConfiguration(configuration: Record<string, unknown>) {
  const databaseUrl = configuration.DATABASE_URL;
  if (
    typeof databaseUrl !== 'string' ||
    !URL.canParse(databaseUrl) ||
    !['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)
  ) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  const token = configuration.CATALOG_INTERNAL_API_TOKEN;
  if (
    token !== undefined &&
    (typeof token !== 'string' ||
      token !== token.trim() ||
      token.length < MIN_INTERNAL_TOKEN_LENGTH)
  ) {
    throw new Error(
      'CATALOG_INTERNAL_API_TOKEN must contain at least 32 characters',
    );
  }
  return configuration;
}

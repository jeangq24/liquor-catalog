import { validateConfiguration } from './configuration.js';

describe('service token configuration', () => {
  const database = 'postgresql://localhost/catalog';
  const admin = 'administrative-secret-with-at-least-32-characters';

  it('accepts an independent token or no service token', () => {
    expect(() =>
      validateConfiguration({ DATABASE_URL: database }),
    ).not.toThrow();
    expect(() =>
      validateConfiguration({
        DATABASE_URL: database,
        CATALOG_INTERNAL_API_TOKEN: admin,
        CATALOG_SERVICE_API_TOKEN:
          'another-service-secret-at-least-32-characters',
      }),
    ).not.toThrow();
  });

  it('rejects short, whitespace-padded, and reused tokens', () => {
    for (const token of ['short', ` ${admin}`, admin]) {
      expect(() =>
        validateConfiguration({
          DATABASE_URL: database,
          CATALOG_INTERNAL_API_TOKEN: admin,
          CATALOG_SERVICE_API_TOKEN: token,
        }),
      ).toThrow('CATALOG_SERVICE_API_TOKEN');
    }
  });
});

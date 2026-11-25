import { searchPattern } from './page.js';

describe('literal search pattern', () => {
  it('escapes PostgreSQL LIKE wildcards and escape characters', () => {
    expect(searchPattern('a%_\\b')).toBe('%a\\%\\_\\\\b%');
  });
});

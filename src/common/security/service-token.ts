import { timingSafeEqual } from 'node:crypto';

export function validBearerToken(
  token: string,
  authorization: string | string[] | undefined,
): boolean {
  const match =
    typeof authorization === 'string'
      ? /^Bearer\s+(\S+)$/i.exec(authorization)
      : null;
  if (!match) return false;
  const expected = Buffer.from(token);
  const actual = Buffer.from(match[1]);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

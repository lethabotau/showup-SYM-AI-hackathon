import { describe, expect, it } from 'vitest';
import { hashToken, ID_PATTERN, newId, newToken, tokenMatches } from '../credentials';

describe('credentials', () => {
  it('generates url-safe ids and tokens of the documented size', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(ID_PATTERN);
    expect(newToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes with SHA-256', () => {
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('matches only the exact token', () => {
    const token = newToken();
    const stored = hashToken(token);
    expect(tokenMatches(token, stored)).toBe(true);
    expect(tokenMatches(token + 'x', stored)).toBe(false);
    expect(tokenMatches(token.toUpperCase(), stored)).toBe(token === token.toUpperCase());
    expect(tokenMatches(stored, stored)).toBe(false);
    expect(tokenMatches('', stored)).toBe(false);
    expect(tokenMatches('x'.repeat(257), stored)).toBe(false);
    expect(tokenMatches(undefined, stored)).toBe(false);
    expect(tokenMatches(['x'], stored)).toBe(false);
    expect(tokenMatches(token, 'not-a-hash')).toBe(false);
  });
});

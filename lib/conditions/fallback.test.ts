import { describe, expect, it } from 'vitest';
import { chipsToViews, interpretOffline, normaliseName, readback } from './fallback';

describe('offline condition fallback', () => {
  it('recognises a named person and minimum attendees', () => {
    const r = interpretOffline("I'll come if Sam goes and at least 5 of us", { self: 'Alex', roster: ['Sam', 'Jess'] });
    expect(r.status).toBe('ok');
    const views = chipsToViews(r.chips);
    expect(views.some((v) => v.type === 'requires')).toBe(true);
    expect(views.some((v) => v.type === 'min_attendees')).toBe(true);
  });

  it('stores unknown names as pending, not dropped', () => {
    const r = interpretOffline('only if Ella comes', { self: 'Alex', roster: [] });
    expect(r.status).toBe('ok');
    const req = chipsToViews(r.chips).find((v) => v.type === 'requires');
    expect(req && 'people' in req && req.people[0]).toMatchObject({ name: 'Ella', pending: true });
  });

  it('offers tentative interpretation instead of dropping unsupported clauses', () => {
    const r = interpretOffline('only if it is not raining', { self: 'Alex', roster: [] });
    expect(r.status).toBe('tentative');
    expect(chipsToViews(r.chips)[0]?.type).toBe('unresolvable');
  });

  it('rejects self-reference', () => {
    expect(interpretOffline('only if Alex comes', { self: 'Alex', roster: [] }).status).toBe('self');
  });

  it('normalises names like the database', () => {
    expect(normaliseName('  Sam   Lee ')).toBe('sam lee');
  });

  it('builds deterministic read-backs', () => {
    const rb = readback({ type: 'min_attendees', n: 5 });
    expect(rb).toContain('5');
  });
});

/* Ranking with the favourites tie-break (the default): group size, then Favourites in the viable group,
   then people free, then the earlier slot. */
import { describe, expect, it } from 'vitest';
import { rankSlots } from '../index';
import type { EventData, Response, Willingness } from '../types';
import { rng, randomEvent } from './gen';
import * as old from '../../ui/utils/recommend';
import { demoEvent, ORG_RESP } from '../../ui/data/fixtures';
import { clone } from '../../ui/utils/helpers';

/** A response with the same answer shape on slots a and b: [avail, will] per slot; full window, no conditions. */
function person(who: string, a: [number, Willingness], b: [number, Willingness]): Response {
  const full = [{ s: 1020, e: 1440 }];
  return {
    who, role: 'guest',
    avail: { a: a[0], b: b[0] }, will: { a: a[1], b: b[1] },
    ranges: { a: full, b: full }, conds: { a: null, b: null }
  };
}
const event = (responses: Response[]): EventData => ({ slots: [{ id: 'a' }, { id: 'b' }], win: { s: 1020, e: 1440 }, responses });

describe('favourites tie-break', () => {
  it('two slots tie on group size: the favourite decides (even against more people free)', () => {
    const ev = event([
      person('Ana', [1, 'yes'], [2, 'yes']),   // favourite on b
      person('Ben', [1, 'yes'], [1, 'yes']),
      person('Cleo', [1, 'no'], [0, null])     // free on a only: a has more free (3 vs 2)
    ]);
    const r = rankSlots(ev);
    expect(r.days.map((d) => [d.slot.id, d.go, d.favourites, d.free])).toEqual([['a', 2, 0, 3], ['b', 2, 1, 2]]);
    expect(r.best?.slot.id).toBe('b');
    expect(rankSlots(ev, { favourites: false }).best?.slot.id).toBe('a'); // old ranking: free count decides
  });

  it('group size still beats favourites', () => {
    const ev = event([
      person('Ana', [1, 'yes'], [2, 'yes']),
      person('Ben', [1, 'yes'], [2, 'yes']),
      person('Cleo', [1, 'yes'], [1, 'no'])
    ]);
    const r = rankSlots(ev);
    expect(r.days.map((d) => [d.slot.id, d.go, d.favourites])).toEqual([['a', 3, 0], ['b', 2, 2]]);
    expect(r.best?.slot.id).toBe('a');
  });

  it("favourites only count inside the viable group (not people who said No or were eliminated)", () => {
    const ev = event([
      person('Ana', [1, 'yes'], [1, 'yes']),
      person('Ben', [1, 'yes'], [2, 'no']),    // favourite but won't go
      person('Cleo', [1, 'yes'], [2, 'if'])    // favourite but eliminated (needs 4 people)
    ]);
    ev.responses[2]!.conds.b = [{ type: 'min', n: '4' }];
    ev.responses[1]!.will.a = 'no';
    const r = rankSlots(ev);
    expect(r.days.map((d) => [d.slot.id, d.go, d.favourites])).toEqual([['a', 2, 0], ['b', 1, 0]]);
    expect(r.best?.slot.id).toBe('a');
  });

  it('equal favourites fall back to people free, then the earlier slot', () => {
    const tieFree = event([person('Ana', [2, 'yes'], [2, 'yes']), person('Ben', [0, null], [1, 'no'])]);
    expect(rankSlots(tieFree).best?.slot.id).toBe('b');            // b has more free
    const fullTie = event([person('Ana', [2, 'yes'], [2, 'yes'])]);
    expect(rankSlots(fullTie).best?.slot.id).toBe('a');            // earlier slot
  });

  it('Alex alone (A6 fixture): his Favourite Saturday now beats Friday', () => {
    expect(rankSlots(demoEvent([clone(ORG_RESP)])).best?.slot.id).toBe('sat');
  });

  it('with no favourites anywhere, the ranking matches the old recommend.ts exactly (1,000 random events)', () => {
    const rand = rng(99);
    for (let i = 0; i < 1000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 });
      for (const r of ev.responses) for (const k of Object.keys(r.avail)) if (r.avail[k] === 2) r.avail[k] = 1;
      const a: any = old.summarise(ev);
      const b = rankSlots(ev); // favourites on (default)
      expect(b.best ? b.best.slot.id : null).toBe(a.best ? a.best.slot.id : null);
      expect(b.days.map((d) => [d.slot.id, d.go, d.free, d.group])).toEqual(
        a.days.map((d: any) => [d.slot.id, d.go, d.free, d.viable.map((x: any) => x.who)]));
    }
  });
});

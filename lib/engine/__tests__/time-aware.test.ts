/* Time-aware viability and canonical ranking: people only count together when their ranges overlap;
   best = largest viable group, then most Favourites, then earliest eligible date/time, then event order. */
import { describe, expect, it } from 'vitest';
import { rankSlots, slotStats } from '../index';
import type { Condition, EventData, Range, Response, Slot, Willingness } from '../types';
import * as old from '../../ui/utils/recommend';

const h = (hour: number) => hour * 60;
const WIN: Range = { s: h(17), e: h(24) };

type Answer = { avail?: number; will?: Willingness; ranges?: Range[]; conds?: Condition[] };
/** One response; every answer defaults to Free, Yes, the whole 5pm–12am window, no conditions. */
function person(who: string, answers: Record<string, Answer>): Response {
  const r: Response = { who, role: 'guest', avail: {}, ranges: {}, will: {}, conds: {} };
  for (const [id, a] of Object.entries(answers)) {
    r.avail[id] = a.avail ?? 1;
    r.will[id] = a.will === undefined ? 'yes' : a.will;
    r.ranges[id] = a.ranges ?? [{ ...WIN }];
    r.conds[id] = a.conds ?? null;
  }
  return r;
}
const event = (slots: Slot[], responses: Response[], win: Range = WIN): EventData => ({ slots, win, responses });
const needs = (name: string): Condition => ({ type: 'person', name });
const atLeast = (n: number): Condition => ({ type: 'min', n: String(n) });

describe('canonical example', () => {
  it('Friday 8 available / 4 viable vs Saturday 6 available / 6 viable: Saturday wins', () => {
    const names = ['Alex', 'Sam', 'Jess', 'Drew', 'Maya', 'Nina', 'Leo', 'Kai'];
    const responses = names.map((who, i) => person(who, {
      // Friday: the last four only go if Priya (who never responds) goes.
      fri: i < 4 ? {} : { will: 'if', conds: [needs('Priya')] },
      ...(i < 6 ? { sat: {} } : {})
    }));
    const r = rankSlots(event([{ id: 'fri', iso: '2026-10-23' }, { id: 'sat', iso: '2026-10-24' }], responses));
    expect(r.days.map((d) => [d.slot.id, d.free, d.go])).toEqual([['fri', 8, 4], ['sat', 6, 6]]);
    expect(r.best?.slot.id).toBe('sat');
  });
});

describe('overlap', () => {
  it('six people free at non-overlapping times are not six simultaneous attendees', () => {
    const six = ['Ana', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay'];
    const responses = six.map((who, i) => person(who, {
      a: { ranges: [{ s: h(17 + i), e: h(18 + i) }] },
      ...(i < 2 ? { b: { ranges: [{ s: h(19), e: h(21) }] } } : {})
    }));
    const ev = event([{ id: 'a' }, { id: 'b' }], responses);
    expect(old.dayStats(ev, 'a').go).toBe(6); // the day-level count this corrects
    const a = slotStats('a', ev.responses, ev.win);
    expect([a.free, a.go]).toEqual([6, 1]);
    expect(a.intervals.map((iv) => iv.group.length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(a.window).toEqual({ s: h(17), e: h(18) });
    const r = rankSlots(ev);
    expect(r.best?.slot.id).toBe('b');
    expect(r.best?.go).toBe(2);
  });

  it('partial overlaps: the group is the people present together, and touching ranges do not overlap', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: { ranges: [{ s: h(17), e: h(20) }] } }),
      person('Ben', { a: { ranges: [{ s: h(19), e: h(22) }] } }),
      person('Cleo', { a: { ranges: [{ s: h(21), e: h(23) }] } }),
      person('Dev', { a: { ranges: [{ s: h(23), e: h(24) }] } })
    ]);
    const st = slotStats('a', ev.responses, ev.win);
    expect(st.intervals.map((iv) => [iv.s / 60, iv.e / 60, iv.group])).toEqual([
      [17, 19, ['Ana']], [19, 20, ['Ana', 'Ben']], [20, 21, ['Ben']], [21, 22, ['Ben', 'Cleo']], [22, 23, ['Cleo']], [23, 24, ['Dev']]
    ]);
    expect(st.group).toEqual(['Ana', 'Ben']); // earliest of the two equal-sized overlaps
    expect(st.window).toEqual({ s: h(19), e: h(20) });
  });

  it('ranges are clipped to the organiser window', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: { ranges: [{ s: h(14), e: h(16) }] } }),
      person('Ben', { a: { ranges: [{ s: h(16), e: h(18) }] } })
    ]);
    const st = slotStats('a', ev.responses, ev.win);
    expect(st.group).toEqual(['Ben']);
    expect(st.window).toEqual({ s: h(17), e: h(18) });
  });
});

describe('conditions at an eligible time', () => {
  it('cascading elimination', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: { will: 'if', conds: [needs('Ben')] } }),
      person('Ben', { a: { will: 'if', conds: [needs('Cleo')] } }),
      person('Cleo', { a: { will: 'if', conds: [atLeast(5)] } }),
      person('Dev', { a: {} })
    ]);
    const st = slotStats('a', ev.responses, ev.win);
    expect(st.group).toEqual(['Dev']);
    expect(st.rounds.map((r) => r.removed)).toEqual([['Cleo'], ['Ben'], ['Ana']]);
  });

  it('a minimum counts only the people there at the same time', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: {} }),
      person('Ben', { a: {} }),
      person('Cleo', { a: { ranges: [{ s: h(22), e: h(23) }] } }),
      person('Dev', { a: { will: 'if', conds: [atLeast(4)], ranges: [{ s: h(17), e: h(21) }] } })
    ]);
    const st = slotStats('a', ev.responses, ev.win);
    expect(st.free).toBe(4);
    expect(st.group).toEqual(['Ana', 'Ben', 'Cleo']);
    expect(st.window).toEqual({ s: h(22), e: h(23) });

    // Overlapping Cleo with Dev makes four present together, so Dev's minimum holds.
    ev.responses[2]!.ranges.a = [{ s: h(20), e: h(23) }];
    expect(slotStats('a', ev.responses, ev.win).group).toEqual(['Ana', 'Ben', 'Cleo', 'Dev']);
  });

  it('circular dependencies: both go when present together, neither when apart', () => {
    const together = event([{ id: 'a' }], [
      person('Ana', { a: { will: 'if', conds: [needs('Ben')] } }),
      person('Ben', { a: { will: 'if', conds: [needs('Ana')] } })
    ]);
    expect(slotStats('a', together.responses, together.win).group).toEqual(['Ana', 'Ben']);

    const apart = event([{ id: 'a' }], [
      person('Ana', { a: { will: 'if', conds: [needs('Ben')], ranges: [{ s: h(17), e: h(19) }] } }),
      person('Ben', { a: { will: 'if', conds: [needs('Ana')], ranges: [{ s: h(20), e: h(22) }] } })
    ]);
    const st = slotStats('a', apart.responses, apart.win);
    expect([st.go, st.window, st.intervals]).toEqual([0, null, []]);
    expect(rankSlots(apart).best).toBeNull();
  });

  it('No and Not free never count, whatever their ranges', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: {} }),
      person('Ben', { a: { will: 'no' } }),
      person('Cleo', { a: { avail: 0 } })
    ]);
    const st = slotStats('a', ev.responses, ev.win);
    expect([st.free, st.go, st.group]).toEqual([2, 1, ['Ana']]);
  });
});

describe('ranking tie-breaks', () => {
  it('Favourites break a group-size tie across days, even against an earlier day', () => {
    const ev = event([{ id: 'a', iso: '2026-10-23' }, { id: 'b', iso: '2026-10-24' }], [
      person('Ana', { a: {}, b: { avail: 2 } }),
      person('Ben', { a: {}, b: {} })
    ]);
    expect(rankSlots(ev).best?.slot.id).toBe('b');
    expect(rankSlots(ev, { favourites: false }).best?.slot.id).toBe('a');
  });

  it('Favourites break a group-size tie between times on the same day', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: { ranges: [{ s: h(17), e: h(18) }] } }),
      person('Ben', { a: { avail: 2, ranges: [{ s: h(20), e: h(21) }] } })
    ]);
    const st = slotStats('a', ev.responses, ev.win);
    expect([st.group, st.favourites, st.window]).toEqual([['Ben'], 1, { s: h(20), e: h(21) }]);
  });

  it('earliest eligible date wins over event order', () => {
    const ev = event([{ id: 'late', iso: '2026-10-24' }, { id: 'early', iso: '2026-10-23' }], [
      person('Ana', { late: {}, early: {} })
    ]);
    expect(rankSlots(ev).best?.slot.id).toBe('early');
  });

  it('on the same date, the earliest eligible time wins', () => {
    const ev = event([{ id: 'p', iso: '2026-10-23' }, { id: 'q', iso: '2026-10-23' }], [
      person('Ana', { p: { ranges: [{ s: h(21), e: h(23) }] }, q: { ranges: [{ s: h(18), e: h(20) }] } })
    ]);
    expect(rankSlots(ev).best?.slot.id).toBe('q');
  });

  it('a full tie keeps the original event order', () => {
    const ev = event([{ id: 'x' }, { id: 'y' }], [person('Ana', { x: {}, y: {} })]);
    expect(rankSlots(ev).best?.slot.id).toBe('x');
  });
});

describe('cross-midnight', () => {
  it('overlaps after midnight are found on the linear minute axis', () => {
    const ev = event([{ id: 'a' }], [
      person('Ana', { a: { ranges: [{ s: h(21), e: h(23) }] } }),
      person('Ben', { a: { ranges: [{ s: h(23), e: h(25) }] } }),
      person('Cleo', { a: { ranges: [{ s: h(24), e: h(27) }] } })
    ], { s: h(21), e: h(26) });
    const st = slotStats('a', ev.responses, ev.win);
    expect(st.group).toEqual(['Ben', 'Cleo']);
    expect(st.window).toEqual({ s: h(24), e: h(25) }); // 12am–1am
    expect(st.intervals.at(-1)).toEqual({ s: h(25), e: h(26), group: ['Cleo'], favourites: 0 }); // clipped at 2am
  });

  it('after midnight is later than the same evening', () => {
    const ev = event([{ id: 'p', iso: '2026-10-23' }, { id: 'q', iso: '2026-10-23' }], [
      person('Ana', { p: { ranges: [{ s: h(24), e: h(25) }] }, q: { ranges: [{ s: h(22), e: h(23) }] } })
    ], { s: h(21), e: h(26) });
    expect(rankSlots(ev).best?.slot.id).toBe('q');
  });
});

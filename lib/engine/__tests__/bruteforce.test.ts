/* Proves the time-aware greatest-fixed-point claim on small events, and checks the fixed-point property on
   large ones. Uses its own condition evaluator and a 15-minute time scan, written from the spec, not the
   engine's conditionHolds or segment logic. */
import { describe, expect, it } from 'vitest';
import { slotStats } from '../index';
import type { Condition, EventData, Response } from '../types';
import { rng, randomEvent } from './gen';

/** Spec: a person condition holds if that name (any case) is in the group; a min condition if |group| ≥ n. */
function holds(c: Condition, group: readonly Response[]): boolean {
  if (c.type === 'person') return group.some((g) => g.who.toLowerCase() === c.name.toLowerCase());
  return group.length >= parseInt(c.n, 10);
}
const candidates = (ev: EventData, id: string) =>
  ev.responses.filter((r) => (r.avail[id] || 0) > 0 && (r.will[id] === 'yes' || r.will[id] === 'if'));
/** Present for the whole of [s, e). */
const presentFor = (r: Response, id: string, s: number, e: number) => (r.ranges[id] || []).some((rg) => rg.s <= s && rg.e >= e);
/** Self-consistent: every "If…" member's conditions hold within the group ("Yes" members have none). */
const consistent = (group: readonly Response[], id: string) =>
  group.every((r) => r.will[id] !== 'if' || (r.conds[id] || []).every((c) => holds(c, group)));

describe('greatest fixed point at each time (brute force, n ≤ 10)', () => {
  it('engine group and window = the largest self-consistent group present together, best by size, Favourites, then time (2,000 events)', () => {
    const rand = rng(424242);
    let checked = 0, nontrivial = 0;
    for (let i = 0; i < 2000; i++) {
      const ev = randomEvent(rand, { minPeople: 1, maxPeople: 10, minSlots: 1, maxSlots: 4, ifRate: 0.6 });
      for (const sl of ev.slots) {
        const cand = candidates(ev, sl.id);
        // Generated windows and ranges sit on 15-minute steps, so a 15-minute scan sees every change.
        let best: { t: number; group: Response[]; fav: number } | null = null;
        for (let t = ev.win.s; t < ev.win.e; t += 15) {
          const present = cand.filter((r) => presentFor(r, sl.id, t, t + 15));
          let bestMasks: number[] = []; let bestSize = -1; let union = 0;
          for (let mask = 0; mask < 1 << present.length; mask++) {
            const g = present.filter((_, k) => mask & (1 << k));
            if (!consistent(g, sl.id)) continue;
            union |= mask;
            if (g.length > bestSize) { bestSize = g.length; bestMasks = [mask]; }
            else if (g.length === bestSize) bestMasks.push(mask);
          }
          // Monotone conditions => the maximum is unique and equals the union of all consistent sets.
          expect(bestMasks).toHaveLength(1);
          expect(bestMasks[0]).toBe(union);
          const group = present.filter((_, k) => union & (1 << k));
          const fav = group.filter((r) => r.avail[sl.id] === 2).length;
          if (group.length && (!best || group.length > best.group.length || (group.length === best.group.length && fav > best.fav))) {
            best = { t, group, fav };
          }
        }
        const st = slotStats(sl, ev.responses, ev.win);
        expect(st.group).toEqual(best ? best.group.map((r) => r.who) : []);
        expect(st.window?.s ?? null).toBe(best ? best.t : null);
        expect(st.favourites).toBe(best ? best.fav : 0);
        checked++;
        if (best && best.group.length < cand.length) nontrivial++;
      }
    }
    expect(checked).toBeGreaterThan(4000);
    expect(nontrivial).toBeGreaterThan(1000);
  });
});

describe('fixed point and trace (up to 30 people)', () => {
  it("the group is present together and self-consistent; the trace explains every removal (2,000 events)", () => {
    const rand = rng(777);
    for (let i = 0; i < 2000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 30, minSlots: 1, maxSlots: 6, ifRate: 0.6 });
      for (const sl of ev.slots) {
        const st = slotStats(sl, ev.responses, ev.win);
        expect(st.go).toBe(st.group.length);
        if (!st.window) { expect(st.go).toBe(0); continue; }
        const w = st.window;
        expect(w.s >= ev.win.s && w.e <= ev.win.e && w.e > w.s).toBe(true);
        // Everyone in the group is there throughout the chosen interval (possibly across touching ranges),
        // and the group is self-consistent.
        for (let t = w.s; t < w.e; t += 15) expect(st.viable.every((r) => presentFor(r, sl.id, t, t + 15))).toBe(true);
        expect(consistent(st.viable, sl.id)).toBe(true);
        // Trace: replaying the rounds from the candidates present at the start reproduces the group.
        let cur = candidates(ev, sl.id).filter((r) => presentFor(r, sl.id, w.s, w.s + 15));
        for (const round of st.rounds) {
          expect(round.removed.length).toBeGreaterThan(0);
          for (const id of round.removed) {
            const r = cur.find((x) => x.who === id)!;
            expect(r.will[sl.id]).toBe('if');
            const failed = round.failed[id]!;
            expect(failed.length).toBeGreaterThan(0);
            for (const c of failed) expect(holds(c, cur)).toBe(false);
          }
          cur = cur.filter((x) => !round.removed.includes(x.who));
        }
        expect(cur.map((r) => r.who)).toEqual(st.group);
        // Intervals are in time order, non-overlapping, non-empty, and include the chosen one.
        for (let k = 1; k < st.intervals.length; k++) expect(st.intervals[k]!.s).toBeGreaterThanOrEqual(st.intervals[k - 1]!.e);
        expect(st.intervals.every((iv) => iv.group.length > 0)).toBe(true);
        expect(st.intervals.some((iv) => iv.s === w.s && iv.e === w.e)).toBe(true);
      }
    }
  });
});

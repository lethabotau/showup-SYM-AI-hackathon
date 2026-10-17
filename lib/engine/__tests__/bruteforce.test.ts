/* Proves the greatest-fixed-point claim on small events, and checks the fixed-point property on large ones.
   Uses its own condition evaluator, written from the spec, not the engine's conditionHolds. */
import { describe, expect, it } from 'vitest';
import { slotStats, viableGroup } from '../index';
import type { Condition, EventData, Response } from '../types';
import { rng, randomEvent } from './gen';

/** Spec: a person condition holds if that name (any case) is in the group; a min condition if |group| ≥ n. */
function holds(c: Condition, group: readonly Response[]): boolean {
  if (c.type === 'person') return group.some((g) => g.who.toLowerCase() === c.name.toLowerCase());
  return group.length >= parseInt(c.n, 10);
}
const candidates = (ev: EventData, id: string) =>
  ev.responses.filter((r) => (r.avail[id] || 0) > 0 && (r.will[id] === 'yes' || r.will[id] === 'if'));
/** Self-consistent: every "If…" member's conditions hold within the group ("Yes" members have none). */
const consistent = (group: readonly Response[], id: string) =>
  group.every((r) => r.will[id] !== 'if' || (r.conds[id] || []).every((c) => holds(c, group)));

describe('greatest fixed point (brute force, n ≤ 10)', () => {
  it('engine group = the largest self-consistent subset, which is unique (2,000 events)', () => {
    const rand = rng(424242);
    let checked = 0, nontrivial = 0;
    for (let i = 0; i < 2000; i++) {
      const ev = randomEvent(rand, { minPeople: 1, maxPeople: 10, minSlots: 1, maxSlots: 4, ifRate: 0.6 });
      for (const sl of ev.slots) {
        const cand = candidates(ev, sl.id);
        expect(cand.length).toBeLessThanOrEqual(10);
        let bestSize = -1; let best: number[] = []; let unionOfConsistent = 0;
        for (let mask = 0; mask < 1 << cand.length; mask++) {
          const g = cand.filter((_, k) => mask & (1 << k));
          if (!consistent(g, sl.id)) continue;
          unionOfConsistent |= mask;
          if (g.length > bestSize) { bestSize = g.length; best = [mask]; }
          else if (g.length === bestSize) best.push(mask);
        }
        // Monotone conditions => consistent sets are closed under union => the maximum is unique
        // and equals the union of all consistent sets.
        expect(best).toHaveLength(1);
        expect(best[0]).toBe(unionOfConsistent);
        const expected = cand.filter((_, k) => best[0]! & (1 << k)).map((r) => r.who);
        expect(viableGroup(sl, ev.responses).group).toEqual(expected);
        checked++;
        if (expected.length !== cand.length) nontrivial++;
      }
    }
    expect(checked).toBeGreaterThan(4000);
    expect(nontrivial).toBeGreaterThan(1000); // many cases where someone really is eliminated
  });
});

describe('fixed point and trace (up to 30 people)', () => {
  it("every member's conditions hold within the group; the trace explains every removal (2,000 events)", () => {
    const rand = rng(777);
    for (let i = 0; i < 2000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 30, minSlots: 1, maxSlots: 6, ifRate: 0.6 });
      for (const sl of ev.slots) {
        const st = slotStats(sl, ev.responses);
        const cand = candidates(ev, sl.id);
        // Fixed point: the group is self-consistent, and a subset of the candidates.
        expect(consistent(st.viable, sl.id)).toBe(true);
        expect(st.viable.every((r) => cand.includes(r))).toBe(true);
        expect(st.go).toBe(st.group.length);
        // Trace: replaying the rounds from the candidates reproduces the group, and each removal was justified.
        let cur = cand;
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
      }
    }
  });
});

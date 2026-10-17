/* Proves the greatest-fixed-point claim per fixed-duration slot on small events, and checks the fixed-point
   property on large ones. Uses its own condition evaluator and a 15-minute coverage scan, written from the
   spec, not the engine's conditionHolds or range merging. */
import { describe, expect, it } from 'vitest';
import { slotStats } from '../index';
import type { Condition, EventData, Range, Response } from '../types';
import { rng, randomEvent } from './gen';

const DURATIONS = [30, 60, 90, 120, 180];

/** Spec: a person condition holds if that name (any case) is in the group; a min condition if |group| ≥ n. */
function holds(c: Condition, group: readonly Response[]): boolean {
  if (c.type === 'person') return group.some((g) => g.who.toLowerCase() === c.name.toLowerCase());
  return group.length >= parseInt(c.n, 10);
}
/** Every 15-minute step of [s, e) lies inside one of the ranges (generated times sit on 15-minute steps). */
const covered = (ranges: readonly Range[] | undefined, s: number, e: number) => {
  for (let t = s; t < e; t += 15) if (!(ranges || []).some((rg) => rg.s <= t && rg.e >= t + 15)) return false;
  return true;
};
/** Free for [s, e): not marked Not free, Yes or If…, and available for the whole slot. */
const freeFor = (ev: EventData, id: string, s: number, e: number) =>
  ev.responses.filter((r) => r.avail[id] !== 0 && (r.will[id] === 'yes' || r.will[id] === 'if') && covered(r.ranges[id], s, e));
/** Favourite ranges: `favs` when the response has them, else (legacy) the availability ranges of a Favourite day. */
const favRanges = (r: Response, id: string) => (r.favs ? r.favs[id] : r.avail[id] === 2 ? r.ranges[id] : undefined);
/** Self-consistent: every "If…" member's conditions hold within the group ("Yes" members have none). */
const consistent = (group: readonly Response[], id: string) =>
  group.every((r) => r.will[id] !== 'if' || (r.conds[id] || []).every((c) => holds(c, group)));

describe('greatest fixed point per slot (brute force, n ≤ 10)', () => {
  it('engine slots and pick = the largest self-consistent free group; best by size, Favourites, time; else most free (2,000 events)', () => {
    const rand = rng(424242);
    let checked = 0, nontrivial = 0;
    for (let i = 0; i < 2000; i++) {
      const ev = randomEvent(rand, { minPeople: 1, maxPeople: 10, minSlots: 1, maxSlots: 4, ifRate: 0.6 });
      const dur = DURATIONS[i % DURATIONS.length]!;
      for (const sl of ev.slots) {
        const st = slotStats(sl, ev.responses, ev.win, { duration: dur });
        const want: { s: number; group: string[]; free: number; fav: number }[] = [];
        for (let s = ev.win.s; s + dur <= ev.win.e; s += 30) {
          const free = freeFor(ev, sl.id, s, s + dur);
          let bestMasks: number[] = []; let bestSize = -1; let union = 0;
          for (let mask = 0; mask < 1 << free.length; mask++) {
            const g = free.filter((_, k) => mask & (1 << k));
            if (!consistent(g, sl.id)) continue;
            union |= mask;
            if (g.length > bestSize) { bestSize = g.length; bestMasks = [mask]; }
            else if (g.length === bestSize) bestMasks.push(mask);
          }
          // Monotone conditions => the maximum is unique and equals the union of all consistent sets.
          expect(bestMasks).toHaveLength(1);
          expect(bestMasks[0]).toBe(union);
          const group = free.filter((_, k) => union & (1 << k));
          const fav = group.filter((r) => covered(favRanges(r, sl.id), s, s + dur)).length;
          want.push({ s, group: group.map((r) => r.who), free: free.length, fav });
          if (group.length && group.length < free.length) nontrivial++;
        }
        expect(st.slots.map((t) => ({ s: t.s, group: t.group, free: t.free, fav: t.favourites }))).toEqual(want);
        // The day's pick: largest group, then Favourites, then earliest; with nobody viable, most free, then earliest.
        let pick: (typeof want)[number] | null = null;
        for (const t of want) {
          if (!pick) { pick = t; continue; }
          const better = t.group.length !== pick.group.length ? t.group.length > pick.group.length
            : t.group.length > 0 ? t.fav > pick.fav : t.free > pick.free;
          if (better) pick = t;
        }
        expect(st.window?.s ?? null).toBe(pick ? pick.s : null);
        expect([st.group, st.free, st.favourites]).toEqual(pick ? [pick.group, pick.free, pick.fav] : [[], 0, 0]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(4000);
    expect(nontrivial).toBeGreaterThan(1000);
  });
});

describe('fixed point and trace (up to 30 people)', () => {
  it('every slot group is available for the whole slot and self-consistent; the trace explains every removal (2,000 events)', () => {
    const rand = rng(777);
    for (let i = 0; i < 2000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 30, minSlots: 1, maxSlots: 6, ifRate: 0.6 });
      const dur = DURATIONS[i % DURATIONS.length]!;
      for (const sl of ev.slots) {
        const st = slotStats(sl, ev.responses, ev.win, { duration: dur });
        expect(st.go).toBe(st.group.length);
        // Slots start every 30 minutes from the window start and fit inside the window.
        expect(st.slots.map((t) => t.s)).toEqual(
          Array.from({ length: Math.max(0, Math.floor((ev.win.e - ev.win.s - dur) / 30) + 1) }, (_, k) => ev.win.s + 30 * k));
        for (const t of st.slots) {
          expect(t.e).toBe(t.s + dur);
          expect(t.go).toBe(t.group.length);
          expect(t.freeList.map((r) => r.who)).toEqual(freeFor(ev, sl.id, t.s, t.e).map((r) => r.who));
          expect(consistent(t.viable, sl.id)).toBe(true);
          // Trace: replaying the rounds from the slot's free people reproduces the group.
          let cur = t.freeList.slice();
          for (const round of t.rounds) {
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
          expect(cur.map((r) => r.who)).toEqual(t.group);
        }
        // The day's headline numbers are one of its slots.
        if (!st.window) { expect(st.slots).toEqual([]); continue; }
        const chosen = st.slots.find((t) => t.s === st.window!.s)!;
        expect([chosen.e, chosen.group, chosen.free, chosen.rounds]).toEqual([st.window.e, st.group, st.free, st.rounds]);
      }
    }
  });
});

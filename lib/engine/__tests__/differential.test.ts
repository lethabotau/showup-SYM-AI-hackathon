/* Differential test against the original recommend.ts (unchanged, read-only). The engine is time-aware and
   the original is not, so they are compared where they must agree:
   - when every candidate is free for the whole window, groups and counts are identical;
   - on any event, the engine's group is a subset of the original's day-level group;
   - given the same group, the display window and dots are identical. */
import { describe, expect, it } from 'vitest';
import { bestWindow, rankSlots, slotWindow } from '../index';
import type { EventData } from '../types';
import { rng, randomEvent } from './gen';
import * as old from '../../ui/utils/recommend';
import { fmtCompact } from '../../ui/utils/format';

/** Every response gets the whole organiser window as its only range, on every slot. */
function wholeWindow(ev: EventData): EventData {
  for (const r of ev.responses) for (const sl of ev.slots) r.ranges[sl.id] = [{ s: ev.win.s, e: ev.win.e }];
  return ev;
}

describe('differential: recommend.ts vs engine', () => {
  it('1,000 random events, everyone free for the whole window: identical groups and counts', () => {
    const rand = rng(20261018);
    let slotsChecked = 0, eliminations = 0;
    for (let i = 0; i < 1000; i++) {
      const ev = wholeWindow(randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 }));
      const r = rankSlots(ev);
      for (const d of r.days) {
        const o: any = old.dayStats(ev, d.slot.id); // untyped original (@ts-nocheck)
        expect({ event: i, slot: d.slot.id, free: d.free, go: d.go, group: d.group })
          .toEqual({ event: i, slot: d.slot.id, free: o.free, go: o.go, group: o.viable.map((x: any) => x.who) });
        if (d.rounds.length) eliminations++;
      }
      slotsChecked += ev.slots.length;
    }
    expect(slotsChecked).toBeGreaterThan(3000);
    expect(eliminations).toBeGreaterThan(500);
  });

  it("1,000 random events: the engine's group is always within the original's day-level group", () => {
    const rand = rng(7);
    let smaller = 0;
    for (let i = 0; i < 1000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 });
      for (const d of rankSlots(ev).days) {
        const dayLevel = (old.dayStats(ev, d.slot.id) as any).viable.map((x: any) => x.who);
        expect(d.group.every((w) => dayLevel.includes(w))).toBe(true);
        if (d.go < dayLevel.length) smaller++;
      }
    }
    expect(smaller).toBeGreaterThan(500); // overlap really changes results on realistic data
  });

  it('1,000 random events: same display window and dots as dayDots for the same group', () => {
    const rand = rng(99);
    for (let i = 0; i < 1000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 });
      for (const d of rankSlots(ev).days) {
        const dd: any = old.dayDots(ev, d);
        const w = slotWindow(ev.win, d.slot, d);
        expect({ time: w.window ? fmtCompact(w.window.s, w.window.e) : '', free: w.free, go: w.go })
          .toEqual({ time: dd.time, free: dd.free, go: dd.go });
        expect(bestWindow(ev.win, d.slot.id, d.viable)).toEqual(old.bestWindow(ev, d.slot.id, d.viable));
      }
    }
  });
});

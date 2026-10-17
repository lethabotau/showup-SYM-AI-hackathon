/* Differential test against the original recommend.ts (unchanged, read-only). The engine works on
   fixed-duration slots and the original works per day, so they are compared where they must agree:
   - when every answered day's range is the whole window and the slot is the whole window, groups match, and
     the engine's free count is the original's Yes/If… candidates (the rules exclude No from "free");
   - on any event, every slot's group is a subset of the original's day-level group;
   - given the same people, the display window and dots are identical. */
import { describe, expect, it } from 'vitest';
import { bestWindow, rankSlots, slotWindow } from '../index';
import type { EventData } from '../types';
import { rng, randomEvent } from './gen';
import * as old from '../../ui/utils/recommend';
import { fmtCompact } from '../../ui/utils/format';

/** Every answered day gets the whole organiser window as its only range, and one slot spans the window. */
function wholeWindow(ev: EventData): EventData {
  for (const r of ev.responses) for (const sl of ev.slots) if (r.avail[sl.id] !== undefined) r.ranges[sl.id] = [{ s: ev.win.s, e: ev.win.e }];
  ev.duration = ev.win.e - ev.win.s;
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
        const willing = ev.responses.filter((x) => (x.avail[d.slot.id] || 0) > 0 && (x.will[d.slot.id] === 'yes' || x.will[d.slot.id] === 'if')).length;
        expect(d.slots).toHaveLength(1);
        expect({ event: i, slot: d.slot.id, free: d.free, go: d.go, group: d.group })
          .toEqual({ event: i, slot: d.slot.id, free: willing, go: o.go, group: o.viable.map((x: any) => x.who) });
        if (d.rounds.length) eliminations++;
      }
      slotsChecked += ev.slots.length;
    }
    expect(slotsChecked).toBeGreaterThan(3000);
    expect(eliminations).toBeGreaterThan(500);
  });

  it("1,000 random events: every slot's group is within the original's day-level group", () => {
    const rand = rng(7);
    let smaller = 0;
    for (let i = 0; i < 1000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 });
      ev.duration = 60;
      for (const d of rankSlots(ev).days) {
        const dayLevel = (old.dayStats(ev, d.slot.id) as any).viable.map((x: any) => x.who);
        for (const t of d.slots) expect(t.group.every((w) => dayLevel.includes(w))).toBe(true);
        if (d.slots.length && d.go < dayLevel.length) smaller++;
      }
    }
    expect(smaller).toBeGreaterThan(500); // overlap really changes results on realistic data
  });

  it('1,000 random events: same display window and dots as dayDots for the same people', () => {
    const rand = rng(99);
    for (let i = 0; i < 1000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 });
      for (const d of rankSlots(ev).days) {
        const dd: any = old.dayDots(ev, d);
        // dayDots uses everyone marked free that day, not the slot's free list.
        const dayFree = ev.responses.filter((r) => (r.avail[d.slot.id] || 0) > 0);
        const w = slotWindow(ev.win, d.slot, { viable: d.viable, freeList: dayFree });
        expect({ time: w.window ? fmtCompact(w.window.s, w.window.e) : '', free: w.free, go: w.go })
          .toEqual({ time: dd.time, free: dd.free, go: dd.go });
        expect(bestWindow(ev.win, d.slot.id, d.viable)).toEqual(old.bestWindow(ev, d.slot.id, d.viable));
      }
    }
  });
});

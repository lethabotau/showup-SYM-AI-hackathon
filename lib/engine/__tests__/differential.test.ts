/* Differential test: the original recommend.ts (unchanged, read-only) vs the engine, on the app's fixtures
   and 1,000 seeded random events. Every per-slot result and the best slot must be identical. */
import { describe, expect, it } from 'vitest';
import { bestWindow, rankSlots, slotWindow } from '../index';
import type { EventData } from '../types';
import { rng, randomEvent } from './gen';
import * as old from '../../ui/utils/recommend';
import { demoEvent, ORG_RESP, GUEST_RESP, SAMPLE_SLOTS, SAMPLE_WINDOW } from '../../ui/data/fixtures';
import { clone } from '../../ui/utils/helpers';
import { fmtCompact } from '../../ui/utils/format';

function oldView(ev: EventData) {
  const s: any = old.summarise(ev); // untyped original (@ts-nocheck)
  return {
    best: s.best ? s.best.slot.id : null,
    days: s.days.map((d: any) => {
      const dd = old.dayDots(ev, d);
      return {
        id: d.slot.id, free: d.free, go: d.go, group: d.viable.map((r: any) => r.who),
        winViable: old.bestWindow(ev, d.slot.id, d.viable), dots: { time: dd.time, free: dd.free, go: dd.go }
      };
    })
  };
}

function newView(ev: EventData) {
  const r = rankSlots(ev);
  return {
    best: r.best ? r.best.slot.id : null,
    days: r.days.map((d) => {
      const w = slotWindow(ev.win, d.slot, d);
      return {
        id: d.slot.id, free: d.free, go: d.go, group: d.group,
        winViable: bestWindow(ev.win, d.slot.id, d.viable),
        dots: { time: w.window ? fmtCompact(w.window.s, w.window.e) : '', free: w.free, go: w.go }
      };
    })
  };
}

const fixtures: Record<string, EventData> = {
  'no responses': demoEvent([]),
  'Alex alone': demoEvent([clone(ORG_RESP)]),
  'Alex + Jess': demoEvent([clone(ORG_RESP), clone(GUEST_RESP)]),
  'Jess alone': demoEvent([clone(GUEST_RESP)]),
  'Jess + Alex (reversed order)': { slots: clone(SAMPLE_SLOTS), win: clone(SAMPLE_WINDOW), responses: [clone(GUEST_RESP), clone(ORG_RESP)] }
};

describe('differential: recommend.ts vs engine', () => {
  for (const [name, ev] of Object.entries(fixtures)) {
    it(`fixture: ${name}`, () => { expect(newView(ev)).toEqual(oldView(ev)); });
  }

  it('1,000 random events: identical groups, counts, windows, dots and best slot', () => {
    const rand = rng(20261018);
    let slotsChecked = 0, eliminations = 0;
    for (let i = 0; i < 1000; i++) {
      const ev = randomEvent(rand, { minPeople: 0, maxPeople: 16, minSlots: 1, maxSlots: 8 });
      const a = oldView(ev), b = newView(ev);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        // Report the first disagreement with the event that caused it.
        expect({ event: i, result: b }).toEqual({ event: i, result: a });
      }
      slotsChecked += ev.slots.length;
      eliminations += rankSlots(ev).days.filter((d) => d.rounds.length > 0).length;
    }
    // Make sure the generator actually exercised elimination, not just trivial cases.
    expect(slotsChecked).toBeGreaterThan(3000);
    expect(eliminations).toBeGreaterThan(500);
  });
});

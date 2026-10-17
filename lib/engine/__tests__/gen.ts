/* Seeded random event generator for the engine tests and benchmark. Produces the same JSON shape the UI
   stores, including awkward values the UI could hold (missing keys, nulls, ranges outside the window,
   odd `n` strings, names that aren't in the event, different letter case). */
import type { Condition, EventData, Range, Response, Slot, Willingness } from '../types';

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ['Alex', 'Sam', 'Jess', 'Drew', 'Maya', 'Nina', 'Leo', 'Kai', 'Priya', 'Tom', 'Ana', 'Ben', 'Cleo', 'Dev',
  'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'June', 'Kofi', 'Lia', 'Mo', 'Ned', 'Oli', 'Pia', 'Quin', 'Raj', 'Sol', 'Tia'];
const N_VALUES = ['1', '2', '2', '3', '3', '4', '5', '6', '8', '12', '20', '0', ' 4', '3.5', 'abc', '-1', ''];

export interface GenOptions {
  minPeople: number; maxPeople: number;
  minSlots: number; maxSlots: number;
  /** Probability that a response for a slot is "If…" (to exercise elimination). */
  ifRate?: number;
}

export function randomEvent(rand: () => number, o: GenOptions): EventData {
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
  const nSlots = int(o.minSlots, o.maxSlots);
  const slots: Slot[] = Array.from({ length: nSlots }, (_, i) => ({ id: 's' + i, title: 'Slot ' + i }));
  const ws = int(0, 88) * 15;
  const we = Math.min(1440, ws + int(4, 40) * 15);
  const win = { s: ws, e: we };
  const nPeople = int(o.minPeople, o.maxPeople);
  const pool = NAMES.slice().sort(() => rand() - 0.5);
  const people = pool.slice(0, nPeople);
  const ifRate = o.ifRate ?? 0.45;
  const responses: Response[] = people.map((who, pi) => {
    const r: Response = { who, role: pi === 0 ? 'organiser' : 'guest', avail: {}, ranges: {}, will: {}, conds: {}, condText: {} };
    for (const sl of slots) {
      const roll = rand();
      if (roll < 0.05) continue; // slot missing from this response entirely
      r.avail[sl.id] = roll < 0.3 ? 0 : roll < 0.8 ? 1 : 2;
      const w = rand();
      const will: Willingness | undefined = w < ifRate ? 'if' : w < ifRate + 0.3 ? 'yes' : w < ifRate + 0.4 ? 'no' : w < ifRate + 0.47 ? null : undefined;
      if (will !== undefined) r.will[sl.id] = will;
      const ranges: Range[] = [];
      const nr = int(0, 3);
      for (let k = 0; k < nr; k++) {
        const s = Math.max(0, win.s + int(-4, Math.max(0, (win.e - win.s) / 15)) * 15);
        ranges.push({ s, e: Math.min(1440 + 60, s + int(1, 24) * 15) });
      }
      if (rand() < 0.95) r.ranges[sl.id] = ranges;
      const cr = rand();
      if (cr < 0.15) r.conds[sl.id] = null;
      else if (cr < 0.25) { /* missing */ }
      else {
        const conds: Condition[] = [];
        const nc = int(0, 3);
        for (let k = 0; k < nc; k++) {
          if (rand() < 0.6) {
            const base = rand() < 0.85 ? pick(people) : pick(NAMES); // sometimes someone not in the event
            const name = rand() < 0.2 ? base.toUpperCase() : rand() < 0.2 ? base.toLowerCase() : base;
            conds.push({ type: 'person', name, known: rand() < 0.9 });
          } else {
            conds.push({ type: 'min', n: pick(N_VALUES) });
          }
        }
        r.conds[sl.id] = conds;
      }
    }
    return r;
  });
  return { slots, win, responses };
}

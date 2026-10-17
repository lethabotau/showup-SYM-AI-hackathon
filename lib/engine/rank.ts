import type { EventData, Slot } from './types';
import { slotStats, type SlotStats } from './viable';

export interface RankedSlot extends SlotStats {
  slot: Slot;
}

export interface Ranking {
  /** One entry per slot, in the event's slot order. */
  days: RankedSlot[];
  /** The best slot, or null when nobody would go on any day. */
  best: RankedSlot | null;
}

export interface RankOptions {
  /** Use Favourites as a tie-break (default true). With `false` that step is skipped. */
  favourites?: boolean;
}

/** Negative when `a` is earlier than `b`: by date (`iso` when both slots have one, else event order), then start time. */
function earlier(a: RankedSlot, ai: number, b: RankedSlot, bi: number): number {
  if (a.slot.iso && b.slot.iso) {
    if (a.slot.iso !== b.slot.iso) return a.slot.iso < b.slot.iso ? -1 : 1;
  } else if (ai !== bi) {
    return ai - bi;
  }
  return (a.window?.s ?? 0) - (b.window?.s ?? 0);
}

/**
 * Ranks the event's slots. Each slot is judged at its best eligible time (see slotStats), within the
 * organiser's window. A slot where nobody would go is never best. Otherwise, in order:
 *   1. the largest viable group,
 *   2. the most Favourites among that group (skipped when `favourites: false`),
 *   3. the earliest eligible date and time,
 *   4. the earlier slot in event order.
 */
export function rankSlots(ev: EventData, opts: RankOptions = {}): Ranking {
  const useFav = opts.favourites !== false;
  const days: RankedSlot[] = ev.slots.map((slot) => ({ slot, ...slotStats(slot, ev.responses || [], ev.win) }));
  let best: RankedSlot | null = null;
  let bestIdx = -1;
  days.forEach((d, i) => {
    if (d.go <= 0) return;
    if (best) {
      if (d.go !== best.go) { if (d.go < best.go) return; }
      else if (useFav && d.favourites !== best.favourites) { if (d.favourites < best.favourites) return; }
      else if (earlier(d, i, best, bestIdx) >= 0) return;
    }
    best = d;
    bestIdx = i;
  });
  return { days, best };
}

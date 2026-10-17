import type { EventData, Slot } from './types';
import { slotStats, type SlotStats } from './viable';

export interface RankedSlot extends SlotStats {
  slot: Slot;
  /** How many of the viable group marked this day as a Favourite (avail = 2). */
  favourites: number;
}

export interface Ranking {
  /** One entry per slot, in the event's slot order. */
  days: RankedSlot[];
  /** The best slot, or null when nobody would go on any day. */
  best: RankedSlot | null;
}

export interface RankOptions {
  /**
   * Use Favourites as a tie-break (default true). With `false` the ranking is exactly the prototype's
   * summarise() in lib/ui/utils/recommend.ts, which ignores Favourites.
   */
  favourites?: boolean;
}

/**
 * Ranks the event's slots. A slot where nobody would go is never best. Otherwise, in order:
 *   1. most people who would go (viable group size),
 *   2. most Favourites among that viable group (skipped when `favourites: false`),
 *   3. most people free that day,
 *   4. the earlier slot (event order).
 */
export function rankSlots(ev: EventData, opts: RankOptions = {}): Ranking {
  const useFav = opts.favourites !== false;
  const days: RankedSlot[] = ev.slots.map((slot) => {
    const st = slotStats(slot, ev.responses || []);
    return { slot, ...st, favourites: st.viable.filter((r) => r.avail[slot.id] === 2).length };
  });
  let best: RankedSlot | null = null;
  for (const d of days) {
    if (d.go <= 0) continue;
    if (!best || d.go > best.go) { best = d; continue; }
    if (d.go < best.go) continue;
    if (useFav && d.favourites !== best.favourites) { if (d.favourites > best.favourites) best = d; continue; }
    if (d.free > best.free) best = d;
  }
  return { days, best };
}

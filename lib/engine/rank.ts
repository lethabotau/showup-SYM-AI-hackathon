import type { EventData, Slot } from './types';
import { slotStats, type SlotStats } from './viable';

export interface RankedSlot extends SlotStats { slot: Slot }

export interface Ranking {
  /** One entry per slot, in the event's slot order. */
  days: RankedSlot[];
  /** The best slot, or null when nobody would go on any day. */
  best: RankedSlot | null;
}

/**
 * Ranks the event's slots exactly as summarise() in lib/ui/utils/recommend.ts does:
 *   1. most people who would go (viable group size), then
 *   2. most people free that day, then
 *   3. the earlier slot (event order).
 * A slot where nobody would go is never best. Favourites (avail = 2) do not affect the ranking.
 */
export function rankSlots(ev: EventData): Ranking {
  const days = ev.slots.map((slot) => ({ slot, ...slotStats(slot, ev.responses || []) }));
  let best: RankedSlot | null = null;
  for (const d of days) {
    if (d.go > 0 && (!best || d.go > best.go || (d.go === best.go && d.free > best.free))) best = d;
  }
  return { days, best };
}

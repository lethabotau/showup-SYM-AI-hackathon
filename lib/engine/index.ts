/*
 * SHOWUP coordination engine: pure, dependency-free, no I/O. Safe to run on the server or the client.
 * Viability is time-aware: unlike lib/ui/utils/recommend.ts, people only count together when their
 * ranges overlap. See docs/ENGINE.md.
 */
export type * from './types';
export { conditionHolds, slotStats, viableGroup } from './viable';
export type { EligibleInterval, EliminationRound, SlotStats, ViableResult } from './viable';
export { bestWindow, coverCount, slotWindow } from './window';
export type { SlotWindow } from './window';
export { rankSlots } from './rank';
export type { RankedSlot, Ranking } from './rank';

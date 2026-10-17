/*
 * SHOWUP coordination engine: pure, dependency-free, no I/O. Safe to run on the server or the client.
 * Behaviour is identical to lib/ui/utils/recommend.ts (verified by lib/engine/__tests__/differential.test.ts).
 * See docs/ENGINE.md.
 */
export type * from './types';
export { conditionHolds, slotStats, viableGroup } from './viable';
export type { EliminationRound, SlotStats, ViableResult } from './viable';
export { bestWindow, coverCount, slotWindow } from './window';
export type { SlotWindow } from './window';
export { rankSlots } from './rank';
export type { RankedSlot, Ranking } from './rank';

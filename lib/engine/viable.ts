import type { Condition, ParticipantId, Response, Slot } from './types';

export interface EliminationRound {
  /** Who dropped out in this round (all at once; order = response order). */
  removed: ParticipantId[];
  /** Human-readable summary of the round. */
  reason: string;
  /** The conditions each removed person had that failed, keyed by id. */
  failed: Record<ParticipantId, Condition[]>;
}

export interface ViableResult {
  /** Who would actually go: the greatest set in which every member's conditions hold. Response order. */
  group: ParticipantId[];
  /** Each elimination round, in order. Empty when nobody's conditions failed. */
  rounds: EliminationRound[];
}

export interface SlotStats extends ViableResult {
  /** Number of people free that day (Free or Favourite), whatever their willingness. */
  free: number;
  /** Size of the viable group. */
  go: number;
  /** The viable group's responses (same objects as passed in). */
  viable: Response[];
  /** The free people's responses. */
  freeList: Response[];
}

/**
 * Does condition `c` hold for a group whose lower-cased names are `names` and whose size is `size`?
 * Mirrors dayStats in lib/ui/utils/recommend.ts exactly, including its parsing of `n`.
 */
export function conditionHolds(c: Condition, names: readonly string[], size: number): boolean {
  if (c.type === 'person') return names.indexOf(String(c.name).toLowerCase()) >= 0;
  return size >= parseInt(String(c.n), 10);
}

function describe(c: Condition): string {
  return c.type === 'person' ? `needs ${c.name}` : `needs at least ${c.n} people`;
}

function slotIdOf(slot: Slot | string): string {
  return typeof slot === 'string' ? slot : slot.id;
}

/** Full per-slot statistics: free count, viable group, and the elimination trace. */
export function slotStats(slot: Slot | string, participants: readonly Response[]): SlotStats {
  const id = slotIdOf(slot);
  const freeList = participants.filter((r) => (r.avail[id] || 0) > 0);
  let cand = freeList.filter((r) => r.will[id] === 'yes' || r.will[id] === 'if');
  const rounds: EliminationRound[] = [];
  // Simultaneous elimination until nothing changes. All conditions are monotone (more people never
  // breaks one), so this reaches the greatest fixed point: the largest self-consistent group.
  for (;;) {
    const names = cand.map((r) => r.who.toLowerCase());
    const size = cand.length;
    const failed: Record<ParticipantId, Condition[]> = {};
    const removed: ParticipantId[] = [];
    const next = cand.filter((r) => {
      if (r.will[id] !== 'if') return true;
      const bad = (r.conds[id] || []).filter((c) => !conditionHolds(c, names, size));
      if (!bad.length) return true;
      removed.push(r.who);
      failed[r.who] = bad;
      return false;
    });
    if (next.length === cand.length) break;
    const parts = removed.map((w) => `${w} (${(failed[w] || []).map(describe).join(', ')})`);
    rounds.push({ removed, reason: `With ${size} ${size === 1 ? 'person' : 'people'}: ${parts.join('; ')}`, failed });
    cand = next;
  }
  return { free: freeList.length, go: cand.length, viable: cand, freeList, group: cand.map((r) => r.who), rounds };
}

/** Who would actually go on `slot`, plus the elimination trace for the UI. */
export function viableGroup(slot: Slot | string, participants: readonly Response[]): ViableResult {
  const { group, rounds } = slotStats(slot, participants);
  return { group, rounds };
}

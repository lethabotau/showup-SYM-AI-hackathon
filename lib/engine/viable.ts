import type { Condition, ParticipantId, Range, Response, Slot, Window } from './types';

export interface EliminationRound {
  /** Who dropped out in this round (all at once; order = response order). */
  removed: ParticipantId[];
  /** Human-readable summary of the round. */
  reason: string;
  /** The conditions each removed person had that failed, keyed by id. */
  failed: Record<ParticipantId, Condition[]>;
}

export interface ViableResult {
  /**
   * Who would actually go at the chosen eligible time: the greatest set of people present together in
   * which every member's conditions hold. Response order.
   */
  group: ParticipantId[];
  /** Each elimination round at the chosen time, in order. Empty when nobody's conditions failed. */
  rounds: EliminationRound[];
}

/** A maximal stretch of time throughout which the same non-empty group would go. */
export interface EligibleInterval {
  /** Start and end on the event's linear minute axis (end exclusive; values past 1440 are after midnight). */
  s: number;
  e: number;
  /** The greatest fixed-point group present throughout the interval. Response order. */
  group: ParticipantId[];
  /** How many of that group marked the day as a Favourite (avail = 2). */
  favourites: number;
}

export interface SlotStats extends ViableResult {
  /** Number of people free that day (Free or Favourite), whatever their willingness. */
  free: number;
  /** Size of the viable group at the chosen time. */
  go: number;
  /** The viable group's responses (same objects as passed in). */
  viable: Response[];
  /** The free people's responses. */
  freeList: Response[];
  /** How many of the viable group marked the day as a Favourite. */
  favourites: number;
  /**
   * The chosen eligible interval: largest group, then most Favourites, then earliest. null when nobody
   * would go at any time.
   */
  window: Range | null;
  /** Every eligible interval for the day, in time order. */
  intervals: EligibleInterval[];
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

/** Simultaneous elimination among people present at the same time, until nothing changes. */
function greatestFixedPoint(id: string, present: readonly Response[]): { viable: Response[]; rounds: EliminationRound[] } {
  let cand = present.slice();
  const rounds: EliminationRound[] = [];
  // All conditions are monotone (more people never breaks one), so this reaches the greatest fixed
  // point: the largest self-consistent group among the people present.
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
  return { viable: cand, rounds };
}

function rangesOf(r: Response, id: string, win?: Window): Range[] {
  const out: Range[] = [];
  for (const rg of r.ranges[id] || []) {
    const s = win ? Math.max(rg.s, win.s) : rg.s;
    const e = win ? Math.min(rg.e, win.e) : rg.e;
    if (e > s) out.push({ s, e });
  }
  return out;
}

/**
 * Full per-slot statistics. Candidates are people free that day who said Yes or If…. Their ranges
 * (clipped to `win` when given) split the day into segments; on each segment only the candidates
 * present throughout it are considered, and their greatest fixed point is that segment's group.
 * Adjacent segments with the same group merge into one eligible interval.
 */
export function slotStats(slot: Slot | string, participants: readonly Response[], win?: Window): SlotStats {
  const id = slotIdOf(slot);
  const freeList = participants.filter((r) => (r.avail[id] || 0) > 0);
  const cand = freeList.filter((r) => r.will[id] === 'yes' || r.will[id] === 'if');
  const spans = cand.map((r) => rangesOf(r, id, win));
  const cuts = Array.from(new Set(spans.flat().flatMap((rg) => [rg.s, rg.e]))).sort((a, b) => a - b);

  const intervals: EligibleInterval[] = [];
  let best: { iv: EligibleInterval; viable: Response[]; rounds: EliminationRound[] } | null = null;
  let last: { iv: EligibleInterval; key: string } | null = null;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const a = cuts[k]!, b = cuts[k + 1]!;
    const present = cand.filter((_, i) => spans[i]!.some((rg) => rg.s <= a && rg.e >= b));
    const fp = present.length ? greatestFixedPoint(id, present) : null;
    if (!fp || !fp.viable.length) { last = null; continue; }
    const group = fp.viable.map((r) => r.who);
    const key = group.join('\n');
    if (last && last.key === key) { last.iv.e = b; continue; }
    const iv: EligibleInterval = { s: a, e: b, group, favourites: fp.viable.filter((r) => r.avail[id] === 2).length };
    intervals.push(iv);
    last = { iv, key };
    // Segments run in time order, so on a full tie the earlier interval is kept.
    if (!best || group.length > best.iv.group.length || (group.length === best.iv.group.length && iv.favourites > best.iv.favourites)) {
      best = { iv, viable: fp.viable, rounds: fp.rounds };
    }
  }

  const viable = best ? best.viable : [];
  return {
    free: freeList.length,
    go: viable.length,
    viable,
    freeList,
    group: viable.map((r) => r.who),
    rounds: best ? best.rounds : [],
    favourites: best ? best.iv.favourites : 0,
    window: best ? { s: best.iv.s, e: best.iv.e } : null,
    intervals
  };
}

/** Who would actually go on `slot` at its best eligible time, plus the elimination trace for that time. */
export function viableGroup(slot: Slot | string, participants: readonly Response[], win?: Window): ViableResult {
  const { group, rounds } = slotStats(slot, participants, win);
  return { group, rounds };
}

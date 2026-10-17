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
   * Who would actually go: the greatest set of the slot's free people in which every member's conditions
   * hold. Response order.
   */
  group: ParticipantId[];
  /** Each elimination round, in order. Empty when nobody's conditions failed. */
  rounds: EliminationRound[];
}

/** Results for one fixed-duration slot. */
export interface TimeSlotStats extends ViableResult {
  /** Start and end on the day's linear minute axis (end exclusive; values past 1440 are after midnight). */
  s: number;
  e: number;
  /** Number of people free for the slot: available for all of it, and Yes or If…. */
  free: number;
  /** Size of the viable group. */
  go: number;
  /** The viable group's responses (same objects as passed in). */
  viable: Response[];
  /** The free people's responses. */
  freeList: Response[];
  /** How many of the viable group have a Favourite range covering the whole slot. */
  favourites: number;
}

/**
 * Per-day results. The headline fields (free, go, viable, freeList, favourites, group, rounds) describe the
 * day's chosen slot, `window`: the largest viable group, then most Favourites, then earliest; when nobody is
 * viable in any slot, the slot with the most free people, then earliest.
 */
export interface SlotStats extends ViableResult {
  free: number;
  go: number;
  viable: Response[];
  freeList: Response[];
  favourites: number;
  /** The chosen slot's start and end. null when no slot fits the window. */
  window: Range | null;
  /** Every slot for the day, in start order. */
  slots: TimeSlotStats[];
}

export interface SlotOptions {
  /** Event length in minutes (default 120). */
  duration?: number;
  /** Use Favourites when choosing the day's slot (default true). */
  favourites?: boolean;
}

export const DEFAULT_DURATION = 120;
/** Slot starts are this many minutes apart, from the window start. */
export const SLOT_STEP = 30;

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

/** Sorted, with touching or overlapping ranges merged; empty or inverted ranges dropped. Gaps stay gaps. */
function mergeRanges(ranges: readonly Range[] | undefined): Range[] {
  const sorted = (ranges || []).filter((rg) => rg.e > rg.s).map((rg) => ({ s: rg.s, e: rg.e })).sort((a, b) => a.s - b.s);
  const out: Range[] = [];
  for (const rg of sorted) {
    const last = out[out.length - 1];
    if (last && rg.s <= last.e) last.e = Math.max(last.e, rg.e);
    else out.push(rg);
  }
  return out;
}

const covers = (ranges: readonly Range[], s: number, e: number) => ranges.some((rg) => rg.s <= s && rg.e >= e);

/** Favourite ranges for a day: `favs` when the response has them, else the availability ranges of a Favourite day. */
function favouriteRanges(r: Response, id: string): Range[] | undefined {
  if (r.favs) return r.favs[id];
  return r.avail[id] === 2 ? r.ranges[id] : undefined;
}

/** Is `a` a better pick for the day than `b`? Callers go in start order, so ties keep the earlier slot. */
function betterPick(a: TimeSlotStats, b: TimeSlotStats, useFav: boolean): boolean {
  if (a.go !== b.go) return a.go > b.go;
  if (a.go > 0) return useFav && a.favourites > b.favourites;
  return a.free > b.free;
}

/**
 * Per-day statistics on fixed-duration slots. Slots start every SLOT_STEP minutes from the window start and
 * must fit inside it. For each slot, a person is free if they didn't mark the day Not free (avail = 0), said
 * Yes or If…, and one of their ranges (after merging touching or overlapping ones) covers the whole slot.
 * The slot's group is the greatest fixed point of its free people.
 *
 * The window is `win`, else the slot's own `win`; one of them is required.
 */
export function slotStats(slot: Slot | string, participants: readonly Response[], win?: Window, opts: SlotOptions = {}): SlotStats {
  const id = slotIdOf(slot);
  const w = win ?? (typeof slot === 'string' ? undefined : slot.win);
  if (!w) throw new Error(`slotStats: no window for day ${id}`);
  const duration = opts.duration ?? DEFAULT_DURATION;
  if (!(duration > 0)) throw new Error(`slotStats: duration must be a positive number of minutes, got ${duration}`);
  const useFav = opts.favourites !== false;

  const willing = participants
    .filter((r) => r.avail[id] !== 0 && (r.will[id] === 'yes' || r.will[id] === 'if'))
    .map((r) => ({ r, avail: mergeRanges(r.ranges[id]), favs: mergeRanges(favouriteRanges(r, id)) }));
  const favsOf = new Map(willing.map((p) => [p.r, p.favs]));

  const slots: TimeSlotStats[] = [];
  let pick: TimeSlotStats | null = null;
  for (let s = w.s; s + duration <= w.e; s += SLOT_STEP) {
    const e = s + duration;
    const freeList = willing.filter((p) => covers(p.avail, s, e)).map((p) => p.r);
    const { viable, rounds } = greatestFixedPoint(id, freeList);
    const favourites = viable.filter((r) => covers(favsOf.get(r)!, s, e)).length;
    const t: TimeSlotStats = { s, e, free: freeList.length, go: viable.length, viable, freeList, favourites, group: viable.map((r) => r.who), rounds };
    slots.push(t);
    if (!pick || betterPick(t, pick, useFav)) pick = t;
  }

  if (!pick) return { free: 0, go: 0, viable: [], freeList: [], favourites: 0, group: [], rounds: [], window: null, slots };
  const { free, go, viable, freeList, favourites, group, rounds } = pick;
  return { free, go, viable, freeList, favourites, group, rounds, window: { s: pick.s, e: pick.e }, slots };
}

/** Who would actually go on `slot` in its chosen time slot, plus the elimination trace for that slot. */
export function viableGroup(slot: Slot | string, participants: readonly Response[], win?: Window, opts?: SlotOptions): ViableResult {
  const { group, rounds } = slotStats(slot, participants, win, opts);
  return { group, rounds };
}

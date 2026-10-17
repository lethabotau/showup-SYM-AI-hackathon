/*
 * Types for the data the UI already produces (see lib/ui/state.ts, lib/ui/flow/respond.ts saveToEvent,
 * lib/ui/flow/conditions-sheet.ts confirmSheet, and SCREENS.md §9). No new shapes: these describe the
 * existing JSON so the engine can run on it unchanged.
 */

/** Minutes since the day's midnight, end exclusive; values past 1440 are after midnight (1500 = 1am). */
export interface Range { s: number; e: number }

/** The organiser's time window for every candidate day. */
export type Window = Range;

export interface Slot {
  id: string;
  iso?: string;
  day?: string;
  title?: string;
  short?: string;
  /** This day's window; overrides EventData.win. */
  win?: Window;
}

/**
 * A condition chip as stored on a response ("If…").
 *  - person: goes only if that named person is in the group (matched case-insensitively against `who`).
 *  - min:    goes only if the group has at least `n` people (including them). `n` is a numeric string, as the UI stores it.
 * `known` is a UI-only flag (unknown names can't be confirmed); the engine ignores it, as the original does.
 */
export type Condition =
  | { type: 'person'; name: string; known?: boolean }
  | { type: 'min'; n: string };

/** 0 = Not free, 1 = Free, 2 = Favourite. */
export type Availability = number;

export type Willingness = 'yes' | 'if' | 'no' | null;

/** One person's answers, keyed by slot id. `who` is their display name and acts as their id. */
export interface Response {
  who: string;
  role: 'organiser' | 'guest' | string;
  avail: Record<string, Availability | undefined>;
  ranges: Record<string, Range[] | undefined>;
  will: Record<string, Willingness | undefined>;
  conds: Record<string, Condition[] | null | undefined>;
  condText?: Record<string, string | undefined>;
  /**
   * Favourite ranges per day. When absent, a day marked Favourite (avail = 2) treats its availability
   * ranges as Favourite ranges (the current UI's meaning). When present, only these count.
   */
  favs?: Record<string, Range[] | undefined>;
}

export interface EventData {
  slots: Slot[];
  win: Window;
  responses: Response[];
  /** Event length in minutes (default 120). */
  duration?: number;
}

/** Participant id used in engine output. Display names are unique within an event (Join rejects duplicates). */
export type ParticipantId = string;

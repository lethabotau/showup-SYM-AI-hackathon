# Coordination engine (`lib/engine/`)

The engine works out who would actually go **together** on each candidate day, at what time, and which day is best. It is pure strict TypeScript with no dependencies and no I/O.

It is **not** the same as the prototype's `lib/ui/utils/recommend.ts`, which the UI still uses for now. The prototype works out viability per day over everyone free that day, ignoring their times, so six people free at six different hours count as six attendees. The engine works it out over the people whose ranges actually overlap.

```ts
import { viableGroup, slotStats, rankSlots, slotWindow } from '@/lib/engine';

viableGroup(slot, responses, win)  // { group: ['Alex', ...], rounds: [{ removed: ['Jess'], reason, failed }] }
slotStats(slot, responses, win)    // free, go, viable, favourites, window, intervals
rankSlots(event)                   // { days: [...per-slot stats], best }
rankSlots(event, { favourites: false })  // skip the Favourites tie-break
slotWindow(event.win, slot, stats) // the display window + dot counts for a day
```

Without `win`, ranges aren't clipped to the event window.

Inputs are the JSON the UI already stores (`Response`, `Slot`, `Condition` in `lib/engine/types.ts`). A participant's id is their display name (`who`), which Join keeps unique.

## Supported conditions

These apply only to people who answered **If…** for a day. **Yes** means they go unconditionally; **No**, Not free, or no answer means they aren't a candidate.

| Condition (UI shape) | Holds when |
|---|---|
| `{ type: 'person', name }` | someone with that name (case-insensitive) is in the group |
| `{ type: 'min', n }` | the group, including them, has at least `parseInt(n)` people |

People who are free (Free or Favourite) and said Yes or If… are the candidates.

## Time-aware viability

Ranges are minutes since the day's midnight, end exclusive and clipped to the event window. Values past 1440 are after midnight, so 9pm–2am is 1260–1560. Touching ranges (5–6pm and 6–7pm) don't overlap.

All candidates' range endpoints cut the day into segments. For each segment, the engine takes the candidates present throughout it, removes every If… person whose conditions fail, all at once, and repeats until nobody is removed. Adjacent segments with the same resulting group merge into one **eligible interval** (`intervals`, in time order). The day's result is its best interval: the largest group, then the most Favourites among that group, then the earliest. `go`, `viable`, `favourites` and `window` describe that interval, and `rounds` is the elimination trace from its start. `free` still counts everyone free that day, whatever their time or answer.

So a condition is only met by people there **at the same time**: "if Priya comes" fails while Priya is absent, and "at least 4 of us" counts only those present together.

**No duration policy.** Nothing in the product defines a minimum event length (only a 60-minute minimum response range). An eligible interval can be as short as the shortest overlap, and the engine doesn't discard short ones. A duration rule (minimum length, or "present for the whole event") would need to be specified first.

## Why this is the right answer: monotonicity

Both conditions are **monotone**: adding people to a group never makes one of them false. A named person who is present stays present, and a count can only go up. That has two consequences:

1. If two groups are each self-consistent (every member's conditions hold), so is their union. So there is exactly **one largest self-consistent group**.
2. Elimination never removes anyone in that largest group, because their conditions hold in it and therefore in any bigger group they're part of. So elimination stops exactly there: the **greatest fixed point**. It takes at most *n* rounds, and the result doesn't depend on order.

This holds separately at every time, over the people present then. The tests check it directly. For events with up to 10 candidates they enumerate every subset at every 15-minute step, confirm the largest consistent one is unique, pick the best time by the rules above, and confirm it equals the engine's group, window start and Favourites (2,000 random events).

## Why negative dependencies are excluded

Conditions like "only if Sam *isn't* going", "fewer than 6 of us" or "unless…" are **not monotone**, and they break both properties above:

- *Several answers:* A goes only if B doesn't, and B goes only if A doesn't. {A} and {B} are both consistent, and nothing picks between them.
- *No answer:* A goes only if A doesn't. No group containing A is consistent, and elimination can flip back and forth.

Supporting them would need a search with tie-breaking rules, and those rules haven't been specified (BACKEND_REQUIREMENTS R1). The condition parser already rejects negative phrasing (`not`, `n't`, `never`, `unless`, `without`, `except`, `avoid`, `or`, `either`) as "unsupported", so they can't be entered.

## Ranking

A day where nobody would go is never best. Otherwise days are compared on:

1. **Group size**: the most people who would actually go together.
2. **Favourites**: how many of *that viable group* marked the day as a Favourite (`avail = 2`). A Favourite from someone who said No, who was eliminated, or who isn't there at that time doesn't count. `{ favourites: false }` skips this step.
3. **The earliest eligible date/time.** If both slots have an `iso` date and the dates differ, the earlier date wins. Otherwise the earlier slot in event order wins, and for the same slot the earlier interval start. After midnight is later than the same evening.
4. **Original order**: on a full tie the first slot is kept.

People free that day no longer break ties (the prototype used them as step 3). Example: Friday has 8 people free but only 4 would go together, and Saturday has 6 free who all go. Saturday wins.

Kept from the prototype:

- `slotWindow` (display window and dots) is unchanged: given the same group, it matches `recommend.ts`.
- A `min` whose `n` isn't a number (e.g. `'abc'`) never holds, so that person is removed. A `person` condition naming someone not in the event never holds either.

## Privacy

The elimination trace (`rounds`, with each round's `removed`, `reason` and `failed`) is **server-only**. It shows who dropped out because of whose absence, and it quotes people's private conditions ("Only you see this"). It must **never be returned to participants or organisers of real events**, whether directly, inside an API response, or embedded in a page. Return only the outcome (best day, window, counts) to clients, and strip `rounds` from `viableGroup` / `slotStats` / `rankSlots` results before anything leaves the server. The trace is for server logs, debugging and tests.

## Tests (`npm run test:engine`)

The command runs a strict typecheck and then Vitest (31 tests, about 3 s):

- **A6 values** from BACKEND_REQUIREMENTS, as named tests (`favourites: false`).
- **Time-aware** (`time-aware.test.ts`):
  - the 8-free/4-viable Friday against the 6/6 Saturday;
  - six non-overlapping people;
  - partial and touching overlaps;
  - window clipping;
  - cascading elimination;
  - `min` counting only people present together;
  - circular dependencies, together and apart;
  - the Favourite, earliest-date, earliest-time and original-order tie-breaks;
  - cross-midnight overlaps.
- **Favourites tie-break**: size ties, size beating Favourites, Favourites outside the group not counting, and the fallback to the earlier slot.
- **Differential.** With everyone's range set to the whole window, the engine's free, go and group equal `recommend.ts` on 1,000 seeded events. With real ranges, the engine's group is always a subset of the prototype's day-level group, and strictly smaller on more than 500 of the 3,000+ slots. `slotWindow` matches the prototype's windows and dots.
- **Brute force** (n ≤ 10), as above.
- **Fixed point and trace** (up to 30 people, 2,000 events):
  - the group is present throughout the chosen interval and self-consistent;
  - replaying the rounds from the people present at its start reproduces the group, with each removal justified by a condition that really failed;
  - intervals are ordered and non-empty.

Reintroducing day-level viability makes 8 of these tests fail.

## Benchmark (`npm run bench:engine`)

The benchmark ran 10,000 synthetic events, averaging 19 participants (range 8–30) and 10.5 slots (range 7–14). Each event was a full recommendation: viable group and trace for every slot, display window and dots for every slot, and ranking. Measured on an Apple M1 with Node 24.11:

| total | mean | p50 | **p95** | p99 |
|---|---|---|---|---|
| 0.96–1.15 s | 96–115 µs | 85–94 µs | **180–210 µs** | 0.23–0.5 ms |

Ranges are across three runs, the last one with the Favourites tie-break. The worst single event was 2–5 ms, most likely a garbage-collection pause.

Time-aware viability runs one elimination per segment instead of one per day. On an Apple M3 with Node 20.19, back-to-back runs:

| engine | mean | p95 |
|---|---|---|
| day-level (before) | 103–107 µs | 184–192 µs |
| time-aware | 243–266 µs | 522–592 µs |

That is about 2.4× slower, and still well under 1 ms per event at p95.

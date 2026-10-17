# Coordination engine (`lib/engine/`)

The engine works out who would actually go on each candidate day, and which day is best. It is pure strict TypeScript with no dependencies and no I/O, so it can run on the server or the client. Its results are identical to the prototype's `lib/ui/utils/recommend.ts`, which the UI still uses for now.

```ts
import { viableGroup, rankSlots, slotWindow } from '@/lib/engine';

viableGroup(slot, responses)   // { group: ['Alex', ...], rounds: [{ removed: ['Jess'], reason, failed }] }
rankSlots(event)               // { days: [...per-slot stats], best }
slotWindow(event.win, slot, stats)  // the display window + dot counts for a day
```

Inputs are the JSON the UI already stores (`Response`, `Slot`, `Condition` in `lib/engine/types.ts`). A participant's id is their display name (`who`), which Join keeps unique.

## Supported conditions

These apply only to people who answered **If…** for a day. **Yes** means they go unconditionally; **No**, Not free, or no answer means they aren't a candidate.

| Condition (UI shape) | Holds when |
|---|---|
| `{ type: 'person', name }` | someone with that name (case-insensitive) is in the group |
| `{ type: 'min', n }` | the group, including them, has at least `parseInt(n)` people |

People who are free (Free or Favourite) and said Yes or If… are the candidates. The engine then removes every If… person whose conditions fail, all at once, and repeats until nobody is removed. Each pass is recorded as a round, giving the trace that `viableGroup` returns.

## Why this is the right answer: monotonicity

Both conditions are **monotone**: adding people to a group never makes one of them false. A named person who is present stays present, and a count can only go up. That has two consequences:

1. If two groups are each self-consistent (every member's conditions hold), so is their union. So there is exactly **one largest self-consistent group**.
2. Elimination never removes anyone in that largest group, because their conditions hold in it and therefore in any bigger group they're part of. So elimination stops exactly there: the **greatest fixed point**. It takes at most *n* rounds, and the result doesn't depend on order.

The tests check this directly. For events with up to 10 candidates they enumerate every subset, confirm the largest consistent one is unique, and confirm it equals the engine's group. This held in 2,000 random events, more than 1,000 of which involved real eliminations.

## Why negative dependencies are excluded

Conditions like "only if Sam *isn't* going", "fewer than 6 of us" or "unless…" are **not monotone**, and they break both properties above:

- *Several answers:* A goes only if B doesn't, and B goes only if A doesn't. {A} and {B} are both consistent, and nothing picks between them.
- *No answer:* A goes only if A doesn't. No group containing A is consistent, and elimination can flip back and forth.

Supporting them would need a search with tie-breaking rules, and those rules haven't been specified (BACKEND_REQUIREMENTS R1). The condition parser already rejects negative phrasing (`not`, `n't`, `never`, `unless`, `without`, `except`, `avoid`, `or`, `either`) as "unsupported", so they can't be entered.

## Ranking, as implemented

**Flagged:** the best day is **most would-go, then most free that day, then the earlier day**. Favourites (`avail = 2`) are never used: there are no "preference points" in the current ranking. The engine keeps this behaviour unchanged. Whether Favourites should count is an open question (BACKEND_REQUIREMENTS R1/R2).

Other behaviour kept exactly:

- The group is worked out **per day**, not per time window. The display window is chosen afterwards: the longest run of 15-minute steps covered by the most would-go people (or the most free people, if no would-go people overlap). On equal length, the earliest run wins.
- A `min` whose `n` isn't a number (e.g. `'abc'`) never holds, so that person is removed. A `person` condition naming someone not in the event never holds either.

## Tests (`npm run test:engine`)

The command runs a strict typecheck and then Vitest (14 tests, about 1 s):

- **A6 values** from BACKEND_REQUIREMENTS, as named tests.
- **Differential.** The original `recommend.ts` and the engine were run on the fixtures and on 1,000 seeded random events, comparing groups, counts, windows, dots and the best slot. There were **no disagreements**. As a sanity check, deliberately breaking the tie-break, or the name case-folding, makes this test fail.
- **Brute force** (n ≤ 10), as above.
- **Fixed point and trace** (up to 30 people, 2,000 events). Every member's conditions hold in the final group, and replaying the rounds reproduces it, with each removal justified by a condition that really failed.

## Benchmark (`npm run bench:engine`)

The benchmark ran 10,000 synthetic events, averaging 19 participants (range 8–30) and 10.5 slots (range 7–14). Each event was a full recommendation: viable group and trace for every slot, display window and dots for every slot, and ranking. Measured on an Apple M1 with Node 24.11:

| total | mean | p50 | **p95** | p99 |
|---|---|---|---|---|
| ~1.13 s | ~113 µs | ~90 µs | **~210 µs** | ~0.5 ms |

The worst single event was about 5 ms, most likely a garbage-collection pause.

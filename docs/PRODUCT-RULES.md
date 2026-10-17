# SHOWUP — Product Rules

**Status: SETTLED, 18 Oct 2026.** This file is the source of truth for how SHOWUP decides who will come and what it recommends. It wins over `CHECKLIST.md` and over the code. If the code disagrees with this file, fix one of them deliberately and log the change in §10.

---

## 1. Glossary

| Term | Meaning |
|---|---|
| Event | A plan with candidate days, a time window on each day, a fixed duration and one timezone. |
| Organiser | Creates the event; sees respondent names, per-slot counts and the recommendation. Identified by the secret organiser link. |
| Participant (guest) | Responds through the share link with a name only, no account. Identified by a device token. |
| Window | The time range on a candidate day during which the event could happen. May cross midnight. |
| Slot | Day + start time + the event's fixed duration (§2). |
| Availability range | A time range when a participant is available. |
| Favourite range | A preferred range, inside availability. Used only for ranking (§6). |
| Willingness | One value per participant per day: **Yes**, **If…** or **No**. |
| Condition | A private rule attached to an **If…** day (§4). |
| Available | One of the participant's availability ranges (after merging their touching or overlapping ranges) covers the whole slot. Internal only; not shown in the UI. |
| Free | Available **and** willingness for that day is not **No** (§3). This is the "free" count shown in the UI. |
| Viable ("will come") | Free, and every condition is satisfied by the final attendee set (§5). |
| Recommendation | The top slot under §6. |

---

## 2. Event setup and time

- **Duration:** fixed per event, set by the organiser. Default 2 h.
- **Slots:** start times in 30-minute steps; a slot must fit entirely inside that day's window.
- **Cross-midnight:** a window such as 22:00–01:00 belongs to the day it starts on. Times are stored as minutes from that day's start, so an end past midnight is stored as > 1440.
- **Timezone:** one per event. All times are wall-clock in that timezone; nothing is converted anywhere.

---

## 3. Responses and "free"

- A participant sets, per candidate day: willingness (Yes / If… / No), availability ranges and optional Favourite ranges.
- Ranges must sit inside the day's window, have start < end after cross-midnight normalisation, and Favourites must sit inside availability. Validated on the server.
- **Free for a slot** = willingness for that day is not **No**, **and** one availability range covers the **whole** slot.
  - Example: A available 19–21, B available 21–23, duration 2 h → no slot has both free.
  - One person's touching or overlapping ranges count as one range: 19–20 plus 20–21 covers a 19–21 slot. A real gap (19–20 plus 20:15–21) is never bridged, and different people's ranges never combine.
  - People who said **No** are excluded from the "free" count on purpose: on When2meet they would have left that day blank, so this keeps the When2meet comparison honest.
- Responses are editable at any time. An edit replaces the previous response; it never duplicates it.
- A duplicate name in the same event is refused: "That name's taken, add an initial."

---

## 4. Conditions

- Conditions belong to a **(participant, day)** pair and apply only when that day's willingness is **If…**.
- **If…** with no confirmed condition counts as **Yes**.
- Several conditions on one day are combined with **AND**.

**Supported types (the only ones):**

| Type | Example | Stored as |
|---|---|---|
| `requires` | "I'll only come if Jess is coming" / "if Jess and Sam come" | `{ "type": "requires", "people": [participantId, …] }` (all listed people must come) |
| `min_attendees` | "only if at least 7 people come" | `{ "type": "min_attendees", "n": 7 }` (the count includes the participant) |

**Rejected, with a plain message and nothing saved:** OR ("Jess or Sam"), exclusions ("not if Alex is going"), people outside the event, self-reference, and anything else that doesn't map to the two types.

**Interpretation pipeline:**
1. Free text → LLM on the server, constrained to a JSON schema. The API key is server-only.
2. Validate against the two types above.
3. Resolve names to participant IDs within the event. An unknown or ambiguous name → the participant picks from the participant list.
4. Show a plain-English read-back ("You'll come on Friday only if Jess comes").
5. The participant confirms or edits. **Only confirmed conditions affect results.**
6. Store the structured rule and the read-back. Discard the raw text.

**Fallback:** if the LLM times out (8 s) or errors, the existing regex parser interprets the text, its output goes through the same validation, and the same confirm screen is shown with a small "interpreted offline" note. We never present the parser's output as the LLM's.

---

## 5. Viability

**Algorithm (greatest fixed point), per slot:**
1. **S** = everyone free for the slot.
2. Remove, all at once, everyone whose conditions are not satisfied by S.
3. Repeat step 2 until nothing changes. Whoever remains is **viable**.

**Consequences:**
- **Cascades:** one person dropping can make others drop in later rounds.
- **Mutual conditions** (A requires B, B requires A, both free) → **both viable**: we keep the largest group in which everyone's conditions hold.
- **Non-respondents:** someone who hasn't responded counts as not attending.
- **Order independence:** every supported condition is positive, so adding people can never break anyone's condition. There is therefore always exactly one largest group in which everyone's conditions hold, and the loop finds it whatever order people are checked in. An exclusion ("not if Alex") can break that guarantee, which is why exclusions are out of scope.
- **Framing:** this is the same idea as finding the largest stable coalition in game theory. Describe it as *related to* coalition formation, not as a full coalition-formation game (there are no payoffs).

---

## 6. Ranking

The engine is the **only** code that ranks slots. The UI displays the engine's output and never computes its own ranking (`lib/ui/utils/recommend.ts` is deleted).

Order:
1. Viable count, highest first.
2. Number of viable people whose Favourite range covers the slot, highest first.
3. Earliest start, first.
4. Creation order.

If the best slot has 0 viable people → show **"No viable plan yet"** instead of a recommendation.

The dashboard shows the best slot per day with free and will-come counts, the recommendation, a privacy-safe reason line, and "Most free: X" next to "Most will come: Y" whenever they differ.

---

## 7. Privacy

| Data | Author | Organiser | Other guests |
|---|---|---|---|
| Respondent names | Yes | Yes | Yes |
| Own availability and willingness | Yes | Counts only | Counts only |
| Condition content and read-back | Yes | **Never** | **Never** |
| Per-slot free / will-come counts | Yes | Yes | Yes |
| Who is or isn't viable | **Never shown to anyone** | **Never** | **Never** |
| Raw condition text | Sent to the LLM, then discarded | — | — |

Showing that a specific free person is not viable would reveal they have an unmet condition, so individual viability is never exposed. API responses return per-slot counts and the recommendation only, nothing per person. Reason lines stay generic ("the rest depend on people or numbers that don't turn up").

---

## 8. Canonical example (demo seed and engine test)

Fri + Sat, window 18:00–23:00, duration 3 h. Every seeded person is available 19:00–22:00 on their ✓ days.

| Person | Fri | Sat | Condition |
|---|---|---|---|
| Alex, Ben, Chloe | Yes | Yes | — |
| Dan | Yes | No | — |
| Finn | If… | If… | requires Ella (both days) |
| Grace | If… | No | min_attendees 7 |
| Harry | If… | No | requires Finn |
| Jess | No | Yes | — |
| Ella | joins live: Yes on both days, available 19:00–22:00 on both days | | |

**Stage 1 — before Ella joins**
- Friday: free = Alex, Ben, Chloe, Dan, Finn, Grace, Harry (7). Round 1: Finn fails (no Ella) → 6. Round 2: Grace fails (6 < 7), Harry fails (no Finn) → 4. **7 free / 4 viable.**
- Saturday: free = Alex, Ben, Chloe, Finn, Jess (5). Finn fails → **5 free / 4 viable.**

**Stage 2 — Ella joins with Yes on both days**
- Friday: 8 free, all conditions hold → **8 / 8.** Saturday: **6 / 6.** → **Friday** recommended.

**Stage 3 — Ella sets Friday to If… "I'll only come if Jess is coming"**
- Friday: Round 1: Ella fails (Jess not free) → 7. Round 2: Finn fails → 6. Round 3: Grace fails (6 < 7), Harry fails → 4. **8 free / 4 viable.**
- Saturday: unchanged, **6 / 6.** → **Saturday 7–10pm** recommended.

Both slots are 19:00–22:00, the only 3-hour slot inside everyone's 19:00–22:00 availability.

---

## 9. Edge cases (each one is a test)

| Case | Expected |
|---|---|
| A available 19–21, B 21–23, duration 2 h | No slot has both free |
| A requires B, B requires A, both free | Both viable |
| A requires B, B requires A, B not free | Neither viable |
| `min_attendees` 5, exactly 5 in S including self | Viable |
| `min_attendees` 5, 4 in S | Not viable |
| Window 22:00–01:00 on Friday | All its slots count as Friday |
| Condition names someone who hasn't responded | Treated as not attending |
| If… with no confirmed condition | Treated as Yes |
| Unconfirmed condition | No effect on counts |
| OR, exclusion, outsider, or self-reference | Rejected with a message; nothing saved |
| Second participant named "Sam" | Refused |
| No slot has any viable person | "No viable plan yet" |
| Two slots tie on viable count | Broken by §6 steps 2–4 |
| §8 seed, all three stages | Exactly the §8 numbers |

---

## 10. Changelog

| Date | Change | Why |
|---|---|---|
| 18 Oct 2026 | Rules settled from checklist v2 §1 | Replaces the draft skeleton |
| 18 Oct 2026 | Added "Available" term, the reason "free" excludes No, the "interpreted offline" fallback note, and the coalition framing | Review feedback; this file is now the only place the rules and the seed are defined |
| 18 Oct 2026 | A person's touching or overlapping availability ranges are merged before checking that one range covers the slot (§1, §3) | Someone who enters 19–20 and 20–21 is available 19–21; without merging, how they used the picker would change the result |

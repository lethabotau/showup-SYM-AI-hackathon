# SHOWUP — BUILD_STAGES.md

Document 4 of 4 · Read-only extraction · Source version `1792166501-1cda`

> **Paths:** this document uses the original handoff layout. See "Where things are now" at the top of `SOURCE_MANIFEST.md` for where each path lives today, and `SOURCE_MANIFEST.md` §16 for how the standalone copy is now split into files.

This document is a sequence of short prompts for an implementing agent (Sym AI or similar). Each prompt stands on its own: it says what to read, what to build, what must not change, how to check it, and where to stop. **Run one stage per session and check its acceptance tests before starting the next.**

The handoff package that every stage refers to:

| File | What it is |
|---|---|
| `SOURCE_MANIFEST.md` | Source tree, runtime, state, storage, known defects (§0, §7, §15) |
| `DESIGN_SYSTEM.md` | Tokens, type, materials, layout, motion. Verbatim CSS is in `styles/main.css` and `styles/event.css` |
| `SCREENS.md` | Every screen, its text, controls, states, data model, fixtures and mismatches |
| `screenshots/` + `index.json` | 42 states × 390 / 768 / 1440 px, captured from the approved build |
| `showup-source.zip` + `SHA256SUMS.txt` | The 16 canvas files plus `canvas.json`, untouched |
| `showup-standalone.zip` | `Main.dc.html` + `Event.dc.html` running outside the canvas (React 18.3.1 + `standalone-support.js`) |

**Rules that apply to every stage:**
1. **The source wins over the documents.** If a document and `Main.dc.html` / `Event.dc.html` disagree, follow the source and report the difference.
2. **Do not invent.** Don't add CSS values, copy, features, backend endpoints or coordination logic that aren't in the source or explicitly asked for in the stage. If something is needed and undefined, stop and list it as a question.
3. **Keep the status labels.** Anything SIMULATED or FIXTURE in `SCREENS.md` stays visibly a prototype (its "Prototype: …" notes stay) until an integration stage replaces it.
4. **Copy is exact,** including punctuation, the en dash in "7pm – 11pm", "If…" with a single ellipsis character, and curly apostrophes where the source uses them.

---

## Choosing a route

| | Route A: source transfer | Route B: reconstruct from spec |
|---|---|---|
| **Use when** | The target can host plain HTML/JS, or you can port the existing component mechanically | The target stack can't use the source (native app, different framework), or the code must be rewritten anyway |
| **Starting point** | `showup-standalone.zip`, already running and verified identical to the canvas (`SOURCE_MANIFEST.md` §14.4) | `DESIGN_SYSTEM.md` + `SCREENS.md` + screenshots, with the source as the tiebreaker |
| **Fidelity risk** | Low: the CSS and logic are the approved ones | Higher: every value has to be reapplied, so check against the screenshots at every stage |
| **Stages** | A1–A6 | B1–B13 |

Both routes then share **§3, Integration readiness**, and are bounded by **§4, Missing requirements**.

**Two stages in both routes are blocked on you, not on the implementer:**
- **Wheel picker swap** (A3 / part of B4): needs the real `time-wheel-picker.html`, which has never been received.
- **`componentDidUpdate` fix** (A2): **done** in `src/showup-standalone/` and mirrored into the canvas copy `src/showup-source/` (authorised; see `SOURCE_MANIFEST.md` §15). Route B avoids the defect by design; see B1.

---

## Route A: source transfer

### A1 · Run and baseline the standalone build

- **Objective:** prove the transferred source runs unchanged in the target environment.
- **Required inputs:**
  - `showup-standalone.zip`, `SHA256SUMS.txt`
  - `screenshots/index.json` and PNGs
  - `SOURCE_MANIFEST.md` §10, §14
- **Implementation instructions:**
  1. Unzip. Serve the folder over http (`python3 -m http.server 8000`) and open `/Main.dc.html`.
  2. Check that the two `.dc.html` files match `showup-source.zip`'s `project/Main.dc.html` and `project/Event.dc.html` except for line 6 (the `support.js` → `./standalone-support.js` script tag).
  3. Write a Playwright script that reproduces screenshot states 01–29 and 37–42 from `index.json` at 390×844, 768×1024 and 1440×900, full page. Compare each against the reference PNGs.
- **Preservation rules:** change no file. Fonts come from Google Fonts when online, otherwise from the bundled woff2.
- **Acceptance tests:**
  - Every state reproduces.
  - Pixel differences are limited to animation timing (the reference captures differ from themselves by about the same amount).
  - The console shows only the known `componentDidUpdate` TypeError (D1). Once A2 is applied, as it now is in `src/showup-standalone/`, the console shows no errors.
- **Completion boundary:** a passing comparison report and the capture script. No code changes.

### A2 · Fix `componentDidUpdate` (only with written authorisation)

**Status: done in `src/showup-standalone/`.** The steps below are kept as the record of what was asked.

- **Objective:** make screen-change scrolling and focus, sheet focus and Escape, the flow's red-dot fill and the participant Saved focus work as the code intends.
- **Required inputs:**
  - `SOURCE_MANIFEST.md` §15
  - `Main.dc.html` `componentDidUpdate` (around line 1205)
  - `Event.dc.html` `componentDidUpdate`
- **Implementation instructions:**
  1. In both files, stop relying on the second argument. Keep a snapshot of the previous state on the instance (for example `this._prev`), compare it with `this.state` wherever the code currently reads `prevState`, then update the snapshot at the end of the method.
  2. Initialise the snapshot in `componentDidMount`.
  3. Change nothing else in either method.
- **Preservation rules:** no CSS, copy or markup changes; the `startAt` Tweak logic is untouched. This also changes the canvas build; the owner asked for the edit to be mirrored there, and it was.
- **Acceptance tests:**
  - No console errors on any state.
  - Landing → Next scrolls to the top and focuses the Create heading.
  - Opening If… moves focus into the sheet, and Escape closes it without a click.
  - Organiser → submit → event page shows red dots for people who would go (1 red with the default flow, "fresh" with Alex).
  - The participant Saved block is scrolled into view and focused.
  - Recapture states 17, 22, 25 and 36 as `*-fixed` versions and keep the originals.
- **Completion boundary:** the two methods changed, the tests above, and new screenshots.

### A3 · Swap in the supplied wheel picker (blocked until `time-wheel-picker.html` arrives)

- **Objective:** replace the stand-in wheels with the supplied `createWheelTimePicker` component.
- **Required inputs:**
  - `time-wheel-picker.html` (missing)
  - `SOURCE_MANIFEST.md` §7 (integration points and bounds)
  - `SCREENS.md` §3, §4.1
- **Implementation instructions:**
  1. Copy the component's JS and CSS **unchanged**. CSS goes in the `<helmet>` style block; only size and placement may change.
  2. Mount it with a `ref` callback that calls `createWheelTimePicker(el, …)`.
  3. **Create:** From and Until, no window limit; commits go to `setFrom(m)` / `setUntil(m)`, keeping the existing minimum of 60 minutes between them.
  4. **Respond range editor:** pass the organiser window `state.win` as min and max (e.g. `{ min: 17*60, max: 0 }` for 5pm–12am); commits go to `setRangeEdge(id, idx, 's'|'e', m)`.
  5. Remove the stand-in `makeWheel`, `registerWheel`, `wheelScrolled`, `syncWheels` and the wheel CSS only after both points work.
- **Preservation rules:**
  - Minutes since midnight, with 1440 meaning 12am end of day.
  - 15-minute steps unless the component defines otherwise; report any difference instead of adapting the component.
- **Acceptance tests:**
  - Create defaults to 5:00 pm / 12:00 am and shows "7 hr window".
  - Until can never be under From + 1 hr.
  - A Respond range can't leave the window.
  - The timeline bar and the pill label update live as you scroll.
  - Keyboard operation works.
  - Recapture states 03, 04, 09 and 10.
- **Completion boundary:** wheels replaced at both points, nothing else changed.

### A4 · Port to the target app shell

- **Objective:** host the two pages inside the target application without changing behaviour.
- **Required inputs:**
  - The A1 baseline
  - `SOURCE_MANIFEST.md` §3–§5 and §14.2 (what `standalone-support.js` replaces)
- **Implementation instructions:** choose one option and state which.
  - **(a) Static embed:** serve the standalone folder as-is under a path of the target app.
  - **(b) Mechanical port to React components:** convert the template to JSX one-to-one.
    - Keep every class name and DOM structure.
    - Import `styles/main.css` / `styles/event.css` verbatim (scoped as they are now).
    - Keep the `Component` class methods unchanged as component methods or hooks with the same logic.
    - Replace the `Event.dc.html` / `Main.dc.html` hrefs with the target's routes.
- **Preservation rules:**
  - No redesign, no renaming of storage keys, no change to the fixtures or `TODAY`.
  - Track previous state yourself in any lifecycle hook (see A2).
- **Acceptance tests:** the A1 capture script passes against the ported app (with the A2 and A3 results if those stages ran).
- **Completion boundary:** a running port and a passing visual comparison. No new features.

### A5 · Put storage behind a seam

- **Objective:** prepare for a backend without changing behaviour.
- **Required inputs:**
  - `Main.dc.html` functions `store`, `loadMyEvents`, `recordMyEvent`, `saveEventData`, `loadEventData`, and the sessionStorage use in `saveForReturn` / constructor
  - `SCREENS.md` §9
- **Implementation instructions:**
  1. Move these five functions into one module with the same signatures (synchronous, localStorage-backed).
  2. Every call site uses the module. Add an equivalent async-ready interface beside it, but **do not** switch call sites to async yet.
- **Preservation rules:**
  - Same keys (`showup-events`, `showup-ev-<id>`, `showup-proto-flow`, `showup-dots-seen`).
  - Same 20-entry cap, same failure behaviour (the list is hidden when storage is unavailable).
- **Acceptance tests:**
  - The visual comparison is unchanged.
  - Your events, reopening an event, guest preview and returning from the sample page all still work.
  - Unit tests for the module cover storage-unavailable cases.
- **Completion boundary:** a refactor only.

### A6 · Extract the calculation and interpretation functions

- **Objective:** isolate the logic that later integration will replace, and pin down its current results.
- **Required inputs:** `dayStats`, `bestWindow`, `coverCount`, `dayDots`, `summarise`, `dotRowsFrom` and `parseConditions` (+ `STOPWORDS`, `NUMWORDS`) from `Main.dc.html`; `SCREENS.md` §9.1 and §5.
- **Implementation instructions:**
  1. Move these functions unchanged into pure modules.
  2. Write characterisation tests from the fixtures (`ORG_RESP`, `GUEST_RESP`, `SAMPLE_SLOTS`, `SAMPLE_WINDOW`). Expected results, obtained by running the unchanged functions:
     - **Alex alone:** `summarise` best = **fri**. Both days have go 1 and free 1, and on a full tie the earlier day wins. `dayDots` gives fri 7 – 11pm 1/1 and sat 7 – 11pm 1/1.
     - **Alex + Jess:** best = **sat**.
       - fri: go 1, free 2. Jess's "at least 3" fails, so she is eliminated. Dots show 7 – 11pm, 1 of 1, because Jess's 6–10pm range doesn't cover the window.
       - sat: go 2, free 2, dots 8 – 11pm, 2 of 2.
  3. Write parser tests for every rule in `SCREENS.md` §5.
- **Preservation rules:** don't fix or improve the logic here, even where §4 flags it.
- **Acceptance tests:** tests pass against the unchanged functions, and the app behaves identically.
- **Completion boundary:** modules + tests. The tests record current behaviour, not intended behaviour.

---

## Route B: reconstruct from spec

Build in the target stack. After every stage, compare against the listed screenshots at all three widths. **Where a value is not in `DESIGN_SYSTEM.md`, read it from `styles/*.css` or the source; never estimate it from a screenshot.**

### B1 · Project shell, tokens and global frame

- **Objective:** the empty app shell with the approved look.
- **Required inputs:**
  - `DESIGN_SYSTEM.md` §1–§4, §6.1–§6.3, §8
  - `styles/main.css` (`:root`, `.su`, `.ambient`, `.layer`, glass classes, header)
- **Implementation instructions:**
  1. Define every token exactly. Load Manrope 400–600.
  2. Build the ambient backdrop, the page container and the header (wordmark "showup." as a home button, status slot on the right at ≥720px).
  3. Implement the four materials (`.glass`, `.glass-control`, `.glass-silver`, `.glass-red`) and the flat red primary button.
  4. Add screen transitions: View Transitions with the 400ms title morph; otherwise a 160ms fade-out and staged fade-in; reduced-motion handling as in `DESIGN_SYSTEM.md` §8.4.
  5. After each screen change, scroll to the top and focus the screen heading. This is what the source intends; it doesn't happen in the approved build only because of D1.
- **Preservation rules:**
  - Breakpoints at 720 and 1024px; no other values.
  - Keep the wordmark's markup structure. The dot sits detached and low in the approved build (D2); either reproduce it or record that you corrected it.
- **Acceptance tests:** the header and backdrop match screenshot 01 at all widths (ignoring content); tokens match by computed style.
- **Completion boundary:** the shell only, no screens.

### B2 · Landing

- **Objective:** `SCREENS.md` §2.
- **Required inputs:** `SCREENS.md` §2; `DESIGN_SYSTEM.md` §6.4; screenshots 01, 02, 24.
- **Implementation instructions:**
  1. Event-name input (maxlength 60, placeholder "Weekend plans"), "Next", "See an example", and the empty-name error "Give it a name to continue."
  2. The Your-events list from local storage (B10 fills it).
- **Preservation rules:** exact copy; actions left-aligned; content capped at 520px.
- **Acceptance tests:** screenshots 01 and 02; Enter submits.
- **Completion boundary:** Landing navigates to a placeholder Create screen that receives the name.

### B3 · Create: calendar, time, name

- **Objective:** `SCREENS.md` §3.
- **Required inputs:** `SCREENS.md` §3; `DESIGN_SYSTEM.md` §6.7, §7; `styles/main.css` (calendar and wheel rules); screenshots 03, 04, 05.
- **Implementation instructions:**
  1. **Display-size editable title.**
  2. **Calendar:**
     - Monday first; cells are 42px circles.
     - Past days disabled; today bold; selected days silver and bold.
     - Month text links, with no navigation before `TODAY`.
     - Live count ("1 day selected" / "N days selected"); no maximum.
  3. **Time:** From and Until wheels in 15-minute steps, defaulting to 1020 and 1440. Until ≥ From + 60. Live "N hr window" text.
  4. **Name and options:** "Your name" (maxlength 30); "More options" opens the Note textarea.
  5. **Create event:** disabled until there are ≥2 days and a name, with the hints shown in §3. Builds the `Event` object exactly as in `SCREENS.md` §9.
- **Preservation rules:** `TODAY = '2026-10-17'` until §3 integration replaces it. Store the note, but don't display it.
- **Acceptance tests:** screenshots 03, 04, 05; day `aria-label`s; the wheel bounds.
- **Completion boundary:** Create produces an `Event` and moves to a placeholder Respond screen.

### B4 · Respond: day cards, availability, timeline, ranges

- **Objective:** `SCREENS.md` §4.1 for one or more days.
- **Required inputs:** `SCREENS.md` §4, §4.1; `DESIGN_SYSTEM.md` §3.2, §7, §8.2; `Main.dc.html` `setAvail`, `tapBar`, `addRangeFor`, `setRangeEdge`, `mergeRanges`; screenshots 06–10.
- **Implementation instructions:**
  1. **Card states:** slim when Not free, full when Free or Favourite.
  2. **Availability control:** three options with a sliding thumb (silver, or red glass for Favourite).
  3. **Window rules:** the window fills when becoming free; ranges are kept when switching between Free and Favourite.
  4. **Timeline:** port the tap rules exactly from `tapBar`; hour ticks follow the >10 hour rule. Keyboard activation opens the wheels.
  5. **Range pills** with wheels (use the supplied picker if available, otherwise a stand-in marked as one). "Add another time" follows the `addRangeFor` rules, maximum 2 ranges, with "Remove".
  6. **Reveal:** the 260ms reveal animation.
- **Preservation rules:**
  - The minimum range is 60 minutes; overlapping ranges merge; no dragging.
  - The labels use `fmtShort` / `fmtCompact` formats.
- **Acceptance tests:**
  - Screenshots 06–10.
  - Tap tests: inside a range the nearer end moves (on a tie the end moves); outside, the nearest range extends.
- **Completion boundary:** the cards hold local state, with no willingness or submit yet.

### B5 · Respond: willingness, validation, submit, modes

- **Objective:** the rest of `SCREENS.md` §4.
- **Required inputs:** `SCREENS.md` §4; `Main.dc.html` `submit`, `markNone`, `savedSummary`, `respondFor`; screenshots 11, 21, 23, 31, 35, 36.
- **Implementation instructions:**
  1. **Willingness:** Yes / If… / No, unselected by default. If… opens the sheet (B6).
  2. **None of these work:** the notice and Undo.
  3. **Validation:** the two form errors and the per-day error, and focus moves to the first missing day.
  4. **Submit:** "Saving…" for 700ms, then save. Button labels per mode.
  5. **Modes:**
     - organiser, with the "Start with yours." eyebrow;
     - guest;
     - editing, with "Back to event";
     - participant, using the fixture days and the Saved block with its prototype note.
  6. **Rail:** the desktop rail.
- **Preservation rules:**
  - Participant answers must not affect the sample event (FIXTURE; disconnected on purpose).
  - A response is keyed by `role` + `who`, as in `saveToEvent`.
- **Acceptance tests:** screenshots 11, 21, 23, 31, 35, 36; the summary sentence matches `savedSummary` for the fixture cases.
- **Completion boundary:** Respond saves into the `Event` and moves to a placeholder Event screen.

### B6 · Conditions sheet and simulated interpretation

- **Objective:** `SCREENS.md` §5.
- **Required inputs:** `SCREENS.md` §5; `Main.dc.html` `parseConditions`, `STOPWORDS`, `NUMWORDS`, `groupNames`, `onSheetText`, `validChips`, `confirmSheet`, `reuse`; screenshots 12–16.
- **Implementation instructions:**
  1. **Container:** a bottom sheet on mobile, a centred 500px glass panel at ≥720px, with the scrim and the 280/200ms motion.
  2. **Parsing:** port `parseConditions` exactly, with a 600ms debounce.
  3. **Chips and editing:** the name picker, the text input in organiser mode, and the 2–20 stepper.
  4. **Confirm and Cancel:** "Looks right" drops unknown chips and duplicates. Cancel resets willingness unless you were editing.
  5. **Summary line:** "Only you see this: …", with Edit and "Use this for my other times too".
  6. **Focus:** focus moves into the sheet on open and returns to the day on close; Escape closes it.
- **Preservation rules:**
  - Label it SIMULATED in code comments.
  - Do not replace it with an AI call in this stage (see §3, AI interpretation).
- **Acceptance tests:**
  - Screenshots 12–16.
  - The parser tests from A6 (write them here if you are on Route B).
- **Completion boundary:** conditions are saved per day in the response.

### B7 · Join (guest entry)

- **Objective:** `SCREENS.md` §6.
- **Required inputs:** `SCREENS.md` §6; screenshots 19, 20, 33.
- **Implementation instructions:**
  1. The event name, "Organised by {organiser}", "Your name", "Continue".
  2. Both errors, with a case-insensitive duplicate check.
  3. Moves to Respond in guest mode.
- **Preservation rules:** identity stays a typed name until §3 Identity.
- **Acceptance tests:** screenshots 19, 20, 33.
- **Completion boundary:** a guest can respond to an event stored on the same device.

### B8 · Event page: states, best so far, dot rows

- **Objective:** `SCREENS.md` §7.1–§7.3.
- **Required inputs:**
  - `SCREENS.md` §7, §9.1
  - `DESIGN_SYSTEM.md` §6.5
  - `Main.dc.html` `dayStats`, `bestWindow`, `coverCount`, `dayDots`, `summarise`, `dotRowsFrom`, `maybeGrowDiscs`
  - Screenshots 17, 22, 25, 32, 34
- **Implementation instructions:**
  1. **Three states:** fresh organiser, full organiser, guest.
  2. **Calculations:** port the five calculation functions **unchanged**.
  3. **Dot rows:** red and silver dots, counts, dimming, "Nobody free", aria labels. The red dots fill in left to right 40ms apart once per session (`showup-dots-seen`), and must also fill when the page is reached through the flow (the intended behaviour; broken in the approved build).
  4. **Responses:** the initials stack with its tooltips.
  5. **Layout:** the desktop two-column grid, and mobile stacking in DOM order.
- **Preservation rules:**
  - Don't change the ranking or the elimination logic (see §4).
  - The status text is derived from `proposal`.
- **Acceptance tests:**
  - Screenshots 17, 22, 25, 32, 34.
  - With `GUEST_RESP` + `ORG_RESP`: Saturday is best, "8 – 11pm", "2 people could make this work."
- **Completion boundary:** the event page is read-only (no propose, reminder or copy yet).

### B9 · Event page: invite, copy, reminder, propose

- **Objective:** `SCREENS.md` §7.1 invite panel, §7.2 actions, §7.4, §7.5.
- **Required inputs:** `SCREENS.md` §7; `Main.dc.html` `copy`, `legacyCopy`, `flash`, `openPropose`, `saveProposal`, `withdraw`, `dayBefore`; screenshots 18, 26–29.
- **Implementation instructions:**
  1. **Invite panel:** the link text and QR (the fixed URL and static SVG for now).
  2. **Copy:** Clipboard API with the selection fallback, and both messages with their timings.
  3. **Reminder panel:** the event-name template.
  4. **Propose sheet:** select, date and minimum; validation; save, Edit and Withdraw; the prototype notices.
  5. **Bottom links.**
- **Preservation rules:**
  - Keep "Nothing has been sent…" and the other prototype notes until §3 Proposal is built.
  - No notifications.
- **Acceptance tests:** screenshots 18, 26–29; the date bounds (between today and the day before the event).
- **Completion boundary:** the organiser can save or withdraw a proposal locally.

### B10 · Your events and local persistence

- **Objective:** the storage behaviour from `SOURCE_MANIFEST.md` §8.
- **Required inputs:** `SOURCE_MANIFEST.md` §8; `Main.dc.html` storage functions and `openMyEvent`.
- **Implementation instructions:**
  1. Put the same five storage functions behind one module.
  2. Write the Your-events entries for create, respond and propose.
  3. Reopening an entry loads the event, and the entry is removed if the data is missing.
  4. Save a sessionStorage snapshot when leaving for the sample page and restore it on return.
- **Preservation rules:** the same keys, caps and failure behaviour.
- **Acceptance tests:** screenshot 24; leave → return restores the flow; with storage unavailable, the list is hidden and nothing crashes.
- **Completion boundary:** everything works on a single device.

### B11 · Sample event page

- **Objective:** `SCREENS.md` §8.
- **Required inputs:** `SCREENS.md` §8; `Event.dc.html` fixtures (`DOT_DAYS`, `PEOPLE`, `WAITING`, `REMINDER`, `LINK`, `SLOT_INFO`); `styles/event.css`; `DESIGN_SYSTEM.md` §2.2, §6.6, §9; screenshots 37–42.
- **Implementation instructions:**
  1. Fixed content.
  2. The mobile fixed action bar.
  3. Its own propose sheet (head row, the 2–8 minimum, the three errors, Cancel as a secondary button).
  4. The `showRoster` option.
  5. "Back" returns to the flow with its state restored.
- **Preservation rules:** fixture only; it must not read flow data; keep the "Prototype: …" footer.
- **Acceptance tests:** screenshots 37–42.
- **Completion boundary:** the sample page matches.

### B12 · Seeded entry points

- **Objective:** reproduce the canvas frames for review: `startAt` = landing, create, respond, fresh, join, guest, participant.
- **Required inputs:** `Main.dc.html` `seed()`; `SCREENS.md` §10; screenshots 30–36.
- **Implementation instructions:** a dev-only query parameter (e.g. `?startAt=guest`) that calls the ported `seed()`. Not linked from the UI.
- **Preservation rules:** the fixtures exactly as in `SCREENS.md` §10.
- **Acceptance tests:** screenshots 30–36.
- **Completion boundary:** every seeded state is reachable.

### B13 · Accessibility and visual audit

- **Objective:** confirm the reconstruction matches the approved build.
- **Required inputs:** all screenshots; `DESIGN_SYSTEM.md` §5, §8.4, §10.
- **Implementation instructions:**
  1. Run the full capture at three widths, and the reduced-motion variants.
  2. Check keyboard-only completion of create → respond (with a condition) → event → propose.
  3. Check the screen-reader labels listed in `SCREENS.md`.
- **Preservation rules:** report differences; don't fix them by redesigning.
- **Acceptance tests:**
  - All 42 states match within animation-timing noise, except the documented intentional differences (D1 behaviour working; the wheel picker if swapped).
- **Completion boundary:** an audit report. Then stop. No integration work starts in Route B without §3.

---

## 3. Integration readiness

What exists now, where the seam is, and what has to be decided before each area can be built. "Blocked by" refers to §4.

| Area | Current state | Seam in the source | Ready to build? | Blocked by |
|---|---|---|---|---|
| **Backend / API** | None. Everything is in the browser | The storage module (A5 / B10) | Only the seam. No API contract exists | R7, R8 |
| **Persistence** | localStorage per device; event JSON in `showup-ev-<id>`; Your-events list | `saveEventData`, `loadEventData`, `recordMyEvent`, `loadMyEvents` | Schema draft: the shapes in `SCREENS.md` §9 can be the *starting* schema, but R3 may change `Range`/`Window`/`Slot` | R3, R7 |
| **Identity and permissions** | A typed name; organiser rights = `mode === 'organiser'` on this device; responses keyed by `role + who`; anyone can "Preview as a guest" | `mode`, `myName`, `joinContinue`, `saveToEvent` | No | R6, R8 |
| **Shareable link / QR** | One fixed fake URL and static QR for all events | `FRESH_LINK`, the QR SVG, `copy` | Generating a per-event link is mechanical once ids are server-issued | R8 |
| **AI interpretation of conditions** | Regex `parseConditions` returning `{status, chips}`; two condition types; unsupported phrasing blocked | `parseConditions(raw, group)` → `{status: 'empty'\|'ok'\|'unsupported'\|'none', chips: Condition[]}`; the 600ms debounce in `onSheetText` | The contract can be kept, but its behaviour is undefined | R4 |
| **Recommendation calculations** | `dayStats` (per-day iterative elimination), `bestWindow`, `dayDots`, `summarise` (the ranking) | Pure functions (A6) | No. The model and the ranking are unspecified | R1, R2, R3 |
| **Private conditions** | Stored in plain text inside the shared event object; only hidden in the UI ("Only you see this") | `conds`, `condText` on `Response` | No. Today any client holding the event can read them | R5 |
| **Proposal and confirmation** | `proposal {slotId, deadline, min}` saved locally; nothing is sent; no commitment step; status is derived | `saveProposal`, `withdraw`, propose sheet | No | R6 |
| **Notifications / reminder** | Reminder text to copy by hand | `REMINDER` template | Out of scope until R6 | R6 |
| **"Today" and time zone** | `TODAY = '2026-10-17'` hard-coded; minutes are local; "Sydney time" is text only | `TODAY`, `dayBefore`, date inputs | Swapping in the real date is mechanical; the time-zone rule is not | R6, R9 |

**Do not** write a complete backend or a coordination algorithm from this document. The rows marked "No" need the decisions in §4 first.

---

## 4. Missing requirements

These are open questions only; none of them has been answered here. They fall into two kinds:
- **Implementation gap:** the intended behaviour is known, but the code doesn't do it.
- **Documentation gap:** nobody has specified the behaviour, so it can't be built without a decision.

### R1 · Greatest-fixed-point algorithm (documentation gap; partial implementation)

- **Implemented:** `dayStats` keeps every Yes and If… person who is free that day, then repeatedly removes If… people whose conditions fail. A person condition needs that name to still be present; a minimum needs the remaining count ≥ n. It stops when nothing changes. This is the greatest fixed point **per day** for monotone conditions.
- **Undefined:**
  - Should it run per *window* (people present at the same time) rather than per day?
  - Do conditions refer to presence in the final window, or anywhere that day?
  - How does a name condition match a person: by display name, or by identity?
  - Unknown names: they're currently dropped silently on confirm; is that right?
  - Can new condition types be added, and do they stay monotone?
  - Does "No" ever count?
  - How do Favourites weigh? They have **no effect** today (only `avail > 0` is checked).

### R2 · Ranking and tie-breaks (documentation gap)

- **Implemented:**
  - Best day = most would-go, then more free, then the earlier day.
  - Display window = the longest run of 15-minute steps with the most would-go free (or the most free if nobody would go); on equal length, the earliest.
  - Dots count only people covering that whole window, which is why they can show fewer than `go`.
- **Undefined:**
  - Should ranking use the window count instead of the day count?
  - Do Favourites or If… people rank lower than Yes?
  - Is there a minimum window length?
  - Should several good options be shown?
  - What appears when the best day's window covers fewer people than its `go`?

### R3 · Days-and-windows model (documentation gap; mismatch flagged in `SCREENS.md` §9.2)

- **Implemented:**
  - One window per event.
  - Availability per day (0/1/2), with up to 2 ranges ≥ 60 minutes inside the window.
  - Willingness and conditions per day.
- **Undefined:**
  - Should there be per-day windows?
  - Should willingness and conditions attach to a range rather than a day?
  - Can a window cross midnight (today the 1440 end is "12am" and nothing goes past it)?
  - What are the maximum days and ranges?
  - Do ranges kept while a day is set back to Not free persist (today they are stored but ignored)?

### R4 · Natural-language interpretation (documentation gap)

- **Implemented:** regex rules (`SCREENS.md` §5) for "person goes" and "at least N", returning chips for the user to confirm. Negation, "or" and similar are refused with a fixed message.
- **Undefined:**
  - Which model or service to use, and with what latency budget (the UI assumes a 600ms debounce plus an immediate result)?
  - Which condition types are supported, and how is ambiguity resolved (e.g. two Sams)?
  - Which languages?
  - What is the failure or offline behaviour?
  - What may be sent to a third party (these conditions are private, see R5)?
  - Does the chip-confirmation step stay mandatory?

### R5 · Access control for private conditions (documentation gap; implementation gap)

- **Copy promises:** "Only you see this. In small groups, the final group may hint at it."
- **Implemented:** conditions are stored in the shared event object and only hidden in the UI, so the promise isn't enforced.
- **Undefined:**
  - Who can read raw text versus parsed conditions?
  - Must the server evaluate conditions without exposing them?
  - What exactly may "hint at it" reveal, and below what group size?
  - Can the organiser see that a condition exists?

### R6 · Confirmation rounds and deadlines (documentation gap)

- **Implemented:** a local proposal `{slotId, deadline, min}` with a reply-by date between today and the day before the event (the flow) or a fixed range (the sample page), and minimum ≥ 2 (flow) or 2–8 (sample). The copy says "Collecting final commitments is designed in the next phase."
- **Undefined:**
  - **How a round works:** how are people asked? Does a commitment re-check conditions? What happens at the deadline, and when the minimum isn't met?
  - **Changes during a round:** re-proposing, withdrawing mid-round, late responses and edits after a proposal.
  - **States:** event states beyond Collecting and Proposed (confirmed, cancelled, failed).
  - **Deadlines:** which time zone defines the end of the reply-by day?
  - **Notifications:** channel and content.

### R7 · Persistence (documentation gap)

- **Implemented:** one device only.
- **Undefined:**
  - Storage engine, ids and retention.
  - Concurrent edits: today the last write wins on one device only.
  - Offline behaviour.
  - Deleting an event or a response.
  - Whether "Your events" is per account or per device.

### R8 · Identity, links and permissions (documentation gap)

- **Implemented:** names only; anyone on the device can act as organiser or guest; one fake link.
- **Undefined:**
  - Account or anonymous token per invite? What stops a guest using someone else's name, and how are duplicates handled beyond "add an initial"?
  - Organiser transfer, co-organisers, and removing a respondent.
  - Link format, expiry and revocation.

### R9 · Smaller implementation and documentation gaps

| Item | Kind |
|---|---|
| `componentDidUpdate` defect (D1): scroll and focus, sheet Escape, flow red dots, participant focus | Fixed in `src/showup-standalone/` (A2). Participant "Saved" focus and propose-sheet focus not yet re-checked; the fix is also in the canvas copy |
| Supplied wheel picker not integrated (D3) | Implementation gap (A3; awaiting file) |
| Wordmark dot detached (D2) | Implementation gap, cosmetic; needs a decision whether to correct it |
| `event.note` captured, never shown | Documentation gap: where it appears and who sees it |
| `TODAY` hard-coded; no time zone | Implementation gap (the real date) + documentation gap (time-zone rule) |
| Participant mode and sample page disconnected from real data | Documentation gap: keep as a demo or remove at integration? |
| Proposal minimum: no upper bound in the flow vs 2–8 on the sample page | Documentation gap: which rule applies? |
| Firefox / Safari / touch devices not verified | Implementation gap (testing) |

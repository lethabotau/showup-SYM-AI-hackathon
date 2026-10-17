# SHOWUP — SOURCE_MANIFEST.md

Document 1 of 4 · Read-only extraction · Source version: Design canvas artifact version `1792166501-1cda` (published 17 Oct 2026, 02:59 AEDT build)

All facts below were taken from the published source files, which were downloaded from the canvas and confirmed byte-identical to the working copies (`SHA256SUMS.txt`). Nothing in the application was modified.

---

## 0. Critical findings (read first)

*Revised after the two authorised fixes. See §14 for what changed.*

1. **The app is not a conventional web project, but it now has a standalone copy that runs anywhere.** The source is a set of **Design Component files (`*.dc.html`)**. Inside the canvas they run on the host's `support.js`, which turns out to be **React 18.3.1 + ReactDOM 18.3.1 plus a template layer**. That host file is not part of the project. `showup-standalone.zip` replaces it with `standalone-support.js` (§14), which I wrote for this handoff, plus vendored React 18.3.1. The standalone copy was tested against the real canvas runtime: same behaviour on every check, and pixel-identical screenshots apart from timing artefacts (§14.4).
2. **The supplied wheel-style time picker is STILL MISSING. Fix 1 could not be done.** The 03:30 message says `time-wheel-picker.html` is attached, but no such file arrived. The upload folder holds only the five text briefs (checked at 03:30 and again before this update). The wheels in both the canvas and the standalone copy are still the **stand-in inside `Main.dc.html`** (§7). §7 lists the exact integration points, ready for the swap once the file arrives.
3. **Only two files are hand-authored.** `Main.dc.html` (the whole flow) and `Event.dc.html` (the fixed sample event). The other 14 `.dc.html` files are **mechanical copies** that differ only in a start screen, a title, a preview size and link targets (§3.3).
4. **The approved canvas build has a lifecycle defect** (found while reading the canvas runtime, and confirmed in it). The host calls `componentDidUpdate(prevProps)` **without `prevState`**. Both authored files read `prevState`, so their `componentDidUpdate` throws on every update. The canvas catches the error and logs it, and the page keeps working, but several behaviours silently never happen (§15). This was **not fixed**, because the fixes weren't authorised. The standalone copy reproduces it on purpose so that it matches the canvas.

---

## 1. Framework, language, tooling

| Item | Actual value |
|---|---|
| Format | Design Component HTML (`.dc.html`), one self-contained file per artboard |
| Host | Claude Design canvas (artifact type "Design", contract `0.2.47`) |
| Runtime | Canvas: host-supplied `./support.js` = React 18.3.1 + ReactDOM 18.3.1 + the canvas template layer (not in project). Standalone: `standalone-support.js` + vendored React 18.3.1 / ReactDOM 18.3.1 (§14) |
| Component model | One class per file: `class Component extends DCLogic`, React-style class lifecycle (`constructor`, `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`, `setState`) |
| Template language | Host markup inside `<x-dc>`: `{{dotted.path}}` holes, `<sc-if value>`, `<sc-for list as>`, JSX-style camelCase events (`onClick="{{fn}}"`), `ref="{{callback}}"` |
| Language | Plain ES2015+ JavaScript (classic script, no modules, no TypeScript) |
| Styling | One `<style>` block per file inside `<helmet>`: CSS custom properties, media queries, keyframes, View Transition pseudo-elements |
| Build tools | None |
| Package manager | None |
| Tests | None in the project (logic was only exercised in throwaway Node harnesses during the session, which are not part of the deliverable) |

---

## 2. Complete source tree

```
project/
├── canvas.json                    # canvas index: artboards, frames, order, titles, launch, notes
├── Main.dc.html                   # ★ AUTHORED — full flow (Landing, Create, Join, Respond, Event), starts at Landing, desktop link family
├── MainMobile.dc.html             #   derived — Landing, mobile link family
├── Create.dc.html                 #   derived — starts at Create
├── CreateMobile.dc.html           #   derived
├── Respond.dc.html                #   derived — starts at Respond (organiser)
├── RespondMobile.dc.html          #   derived
├── Fresh.dc.html                  #   derived — starts at Event page, organiser, 1 response
├── FreshMobile.dc.html            #   derived
├── Join.dc.html                   #   derived — starts at Join (guest)
├── JoinMobile.dc.html             #   derived
├── Guest.dc.html                  #   derived — starts at Event page, guest view, 2 responses
├── GuestMobile.dc.html            #   derived
├── Participant.dc.html            #   derived — starts at Respond on the fixed 8-person sample ("participant" mode)
├── ParticipantMobile.dc.html      #   derived
├── Event.dc.html                  # ★ AUTHORED — fixed sample event page (8 fictional responses), desktop link family
└── EventMobile.dc.html            #   derived — same, mobile link family
```

Sizes: `Main.dc.html` 1,920 lines / 128,133 bytes (CSS ≈ 30.8k chars, markup ≈ 39.6k, script ≈ 56.9k). `Event.dc.html` 549 lines / 35,316 bytes (CSS ≈ 14.5k, markup ≈ 11.0k, script ≈ 9.1k). `canvas.json` 3,283 bytes.

There are **no** separate component files, image files, font files, icon files or uploaded assets. QR codes are inline SVG paths (§6.4).

---

## 3. Entry points, routes and navigation

### 3.1 Entry point
`canvas.json` → `"launch": {"view":"focused","file":"Main.dc.html"}`. The prototype opens on **Main.dc.html at the Landing screen**.

### 3.2 There is no URL router
Navigation happens in two ways:

**a) Inside `Main.dc.html`, as a state machine.** `state.screen` ∈ `landing | create | join | respond | event`, together with `state.mode` ∈ `organiser | guest | participant`. Screens are switched by `go(patch)`, which uses `document.startViewTransition` when available and otherwise a 160 ms fade-out followed by an enter animation.

| From | Action | To |
|---|---|---|
| Landing | Next | Create |
| Landing | "Your events" row (organising/invited) | Event page (loaded from localStorage) |
| Create | Create event | Respond (organiser) |
| Respond (organiser/guest) | Submit response / Save changes | Event page |
| Respond (editing) | Back to event | Event page |
| Event (organiser) | Edit my response | Respond (editing) |
| Event (organiser) | Plan something else | Landing |
| Event (organiser) | Preview as a guest | Join |
| Join | Continue | Respond (guest) |
| Event (guest) | Edit my response | Respond (editing) |
| Event (guest) | Plan your own | Landing |
| Any screen | Wordmark `showup.` (button) | Landing |
| Respond (participant) | Submit → saved block | stays on Respond (saved state) |

**b) Between artboards, through canvas links.** Plain `<a href="X.dc.html">` links are intercepted by the canvas Play mode:

| Link | Desktop family target | Mobile family target |
|---|---|---|
| "See an example" (Landing) | `Event.dc.html` | `EventMobile.dc.html` |
| "Your events" row for the sample event | `Event.dc.html` | `EventMobile.dc.html` |
| "Preview with sample responses" (Event, organiser) | `Event.dc.html` | `EventMobile.dc.html` |
| "Continue to event" (participant saved block) | `Event.dc.html` | `EventMobile.dc.html` |
| Sample page wordmark and "Back" | `Main.dc.html` | `MainMobile.dc.html` |

Before each outbound link, `saveForReturn()` writes the whole flow state to `sessionStorage['showup-proto-flow']` (tagged with a `family` of `desktop` or `mobile`). The Landing variant (`startAt === 'landing'`) restores it once on construction if the family matches, so "Back" returns to where the user was.

### 3.3 How the 14 derived files differ from their source (exhaustive)

Derived from `Main.dc.html`:

| Field | Values |
|---|---|
| `<title>` | per file |
| `var DEFAULT_START` and `data-props.startAt.default` | `landing`, `create`, `respond`, `fresh`, `join`, `guest`, `participant` |
| `$preview` (`width` × `height`) | must equal the canvas frame size in `canvas.json` |
| `var FAMILY` | `'desktop'` or `'mobile'` |
| `href="Event.dc.html"` (4 occurrences) | becomes `href="EventMobile.dc.html"` in mobile files |

Derived from `Event.dc.html`: `EventMobile.dc.html` differs only in its title, the `$preview` size (390×1800), and its two `href="Main.dc.html"` links, which become `MainMobile.dc.html`.

The mobile files contain **identical CSS**. Responsiveness comes from media queries that respond to the frame width; the mobile frames are simply 390 px wide.

---

## 4. Host constructs a port must replace

| Construct | Where used | Meaning |
|---|---|---|
| `<script src="./support.js">` | head of every file | Loads the host runtime |
| `<x-dc>…</x-dc>` | body | The component's template root |
| `<helmet>` | top of `<x-dc>` | Holds `<link>` (Google Fonts) and `<style>` |
| `{{path}}` | text and attributes | Dotted lookup into the object returned by `renderVals()`; no expressions |
| `<sc-if value="{{bool}}">` | 54 in Main, 7 in Event | Conditional render |
| `<sc-for list="{{arr}}" as="x">` | 16 in Main, 3 in Event | List render (nested up to 4 levels: days → ranges → wheels → items) |
| `onClick`, `onChange`, `onKeyDown`, `onScroll`, `onFocus` = `"{{fn}}"` | throughout | Event handlers returned from `renderVals()` |
| `ref="{{fn}}"` | headings, slot buttons, sheets, wheels, link text | Callback refs (element or `null`) |
| `class DCLogic` | script | Base class giving `props`, `state`, `setState(patch, cb)` and the lifecycle hooks |
| `data-props='{…}'` | script tag | Canvas "Tweaks": `startAt` (enum, Main family), `showRoster` (boolean, Event family), plus `$preview` |

A **React port maps almost one-to-one**: `renderVals()` → render-time values, `sc-if` → `&&`, `sc-for` → `.map()`, `ref` callbacks unchanged, `setState` unchanged.

---

## 5. Components (all inline; there are no component files)

### 5.1 `Main.dc.html`: markup sections (`<sc-if>` per screen)
| Screen / overlay | Gate | Key classes |
|---|---|---|
| Landing | `isLanding` | `.l-form`, `.l-field`, `.l-actions`, `.my-events`, `.my-row` |
| Create | `isCreate` | `.name-title`, `.c-sec`, `.cal` (`.cal-head`, `.cal-dow`, `.cal-grid`, `.cal-day`), `.wheels`, `.org-field`, `.more`, `.c-actions` |
| Join | `isJoin` | `.j-org`, `.j-form` |
| Respond | `isRespond` | `.kicker`, `.eyebrow`, `.back-link`, `.days`, `.day` (`.is-slim`), `.day-top`, `.seg` / `.seg-thumb` / `.seg-opt`, `.reveal`, `.tl` / `.tl-track` / `.tl-fill` / `.tl-hours`, `.ranges` / `.range-label`, `.range-wheels`, `.will-row`, `.cond-sum`, `.r-actions`, `.saved`, `.r-rail` |
| Event (flow) | `isEvent` | `.ev-grid` (`.is-full`), `.ev-title`, `.ev-status`, `.f-invite`, `.f-qr`, `.ev-best` (`.rec-time`), `.ev-dots` (`.dotrows`, `.dr`, `.dot`), `.ev-people` (`.avatars`, `.av`), `.ev-side` (`.e-share`, `.ev-actions`, `.proposal`, `.reminder`), `.ev-links` |
| Conditions sheet | `sheetOpen` | `.overlay`, `.scrim`, `.sheet.glass`, `.sheet-input`, `.cchips`, `.cchip`, `.cchip-edit`, `.name-opt`, `.stepper`, `.quiet`, `.sheet-actions` |
| Propose sheet | `proposeOpen` | same overlay and sheet classes plus `.field`, `.select`, `.num` |

### 5.2 `Main.dc.html`: script structure
- **Top-level helpers:** `clone`, `cloneConds`, `joinList`, `chipLabel`, `describe`, `sameConds`, `pad2`, `fmtShort`, `fmtNum`, `suffix`, `fmtCompact`, `fmtWheel`, `fmtTick`, `rangeText`, `steps`, `dateFromIso`, `isoFromDate`, `slotFromIso`, `mergeRanges`, `emptyMaps`, `newId`
- **Storage:** `store`, `loadMyEvents`, `recordMyEvent`, `saveEventData`, `loadEventData`
- **Aggregation:** `dayStats` (iterative condition elimination), `bestWindow`, `coverCount`, `dayDots`, `summarise`, `dotRowsFrom`
- **Simulated condition interpretation:** `parseConditions` (regex rules, not AI)
- **Fixtures and seeding:** `demoEvent`, `baseState`, `respondFor`, `seed`, plus constants `SAMPLE_SLOTS`, `SAMPLE_WINDOW`, `ORG_RESP`, `GUEST_RESP`, `NAMES`
- **Component methods (66):** lifecycle; motion (`reduced`, `motion`, `go`, `goHome`, `maybeGrowDiscs`); stand-in wheels (`registerWheel`, `wheelScrolled`, `syncWheels`, `makeWheel`); Landing and Create (`next`, `openMyEvent`, `toggleDay`, `shiftMonth`, `setFrom`, `setUntil`, `createEvent`); Join (`joinContinue`, `previewGuest`); Respond (`setAvail`, `setRanges`, `tapBar`, `setRangeEdge`, `toggleWheels`, `addRangeFor`, `addRange`, `removeRange`, `pick`, `markNone`, `submit`, `saveToEvent`, `savedSummary`, `myResponse`, `editMyResponse`); conditions sheet (`groupNames`, `openSheet`, `dismissSheet`, `closeSheet`, `patchSheet`, `onSheetText`, `editChip`, `removeChip`, `validChips`, `confirmSheet`, `reuseTargets`, `reuse`); Event (`flash`, `legacyCopy`, `copy`, `dayBefore`, `openPropose`, `closePropose`, `setProp`, `saveProposal`, `withdraw`); render (`segThumb`, `renderVals`, `screenClsOf`, `renderValsReminder`)

### 5.3 `Event.dc.html`
- **Sections:** header, title, `.e-rec` (Best so far), `.e-dots` (dot rows), `.e-side` (glass invite panel `.e-share` + `.e-actions`), `.e-people` (avatars), footer, mobile sticky bar `.m-bar.glass`, Propose sheet.
- **Script:** constants `REMINDER`, `LINK`, `DOTS_KEY`, `DOT_DAYS`, `SLOT_INFO`, `PEOPLE`, `WAITING`; helpers `dotRowsFrom`, `dayBefore`, `prettyDate`, `reducedMotion`; methods `constructor`, `componentDidMount`, `componentWillUnmount`, `componentDidUpdate`, `flash`, `legacyCopy`, `copy`, `openPropose`, `closePropose`, `setForm`, `saveProposal`, `renderVals`.

---

## 6. Styles, fonts, animations, assets

### 6.1 Fonts
`https://fonts.googleapis.com/css2?family=Manrope:wght@400..600&display=swap`, with preconnects to `fonts.googleapis.com` and `fonts.gstatic.com`. The family is `"Manrope", sans-serif` and there is no other family. Weights in use: 400, 500, 600.

### 6.2 Stylesheets
There is one inline `<style>` per authored file. Both share the same token block and component CSS (buttons, glass materials, fields, sheets, dot rows, avatars); `Main.dc.html` additionally holds the flow-only CSS. Breakpoints are `min-width: 720px`, `min-width: 1024px` and `max-width: 719px` (Main only), plus `prefers-reduced-motion: reduce`. Exact values follow in Document 2.

### 6.3 Animations
- **Keyframes in `Main.dc.html`:** `s-in`, `s-out`, `vt-out`, `fade-in`, `fade-out`, `reveal-unclip`, `sheet-in`, `sheet-out`
- **Keyframes in `Event.dc.html`:** `sheet-in`, `sheet-out`, `fade-in`, `fade-out`, `rise`
- **View Transition rules (Main):** `::view-transition-old/new/group` for `root`, `su-title` and `su-header`

### 6.4 Assets
- **No raster or vector files.** Two QR codes are inlined as SVG `<path>` data (29×29 modules, error correction M, drawn in a `viewBox="-2 -2 33 33"`):
  - `Main.dc.html` (two occurrences): encodes `https://showup.example/e/N8R2VQ`
  - `Event.dc.html`: encodes `https://showup.example/e/7Q4KX2`
  - These were generated once, offline in the session workspace, with Python `qrcode` (`ERROR_CORRECT_M`, `border=0`, horizontal-run path compression). They are **static**: every event created in the flow shows the same N8R2VQ link and QR. `showup.example` is a reserved non-resolving domain.
- **No icons.** Glyphs used as text are `−` and `+` (stepper) and `…` ("If…").

---

## 7. Supplied components: wheel-style time picker

| | |
|---|---|
| **Supplied file** | `time-wheel-picker.html`: **MISSING. Never received.** |
| **What is in the source instead** | A stand-in wheel implemented inside `Main.dc.html` |
| **Stand-in markup** | `.wheels > .wheel-col > (.wheel-label, .wheel.glass-control > (.wheel-band.glass-silver, .wheel-scroll[role=spinbutton][tabindex=0] > (.wheel-pad, .w-item × n, .wheel-pad)))` |
| **Stand-in logic** | `makeWheel(key, label, values, current, commit)`, `registerWheel`, `wheelScrolled` (120 ms settle debounce → nearest item), `syncWheels` (scrolls to the selected value after state changes), arrow, PageUp and PageDown keys, and click-to-select by Y position; `ITEM_H = 40` |
| **Stand-in CSS** | `.wheels`, `.wheel-col`, `.wheel-label`, `.wheel` (200 px tall), `.wheel-band` (40 px, `top: 80px`), `.wheel-scroll` (scroll-snap, mask fade), `.wheel-pad` (80 px), `.w-item`, `.w-item.is-sel`, `.wheel-done` |
| **Used in** | Create (From 0:00–23:00 and Until 1:00–24:00, 15-minute steps); Respond range editor (From and Until limited to the organiser's window, 15-minute steps) |
| **Dependencies** | None |
| **Status** | **Placeholder. Still missing as of the 03:30 fix request** (no file was received). Any reproduction must obtain the real `time-wheel-picker.html` and swap it in at these two integration points. |

**Integration plan, ready once the file arrives.** This follows the instructions in the 03:30 message; I have not seen the component's API beyond its name.

| Integration point | Where in `Main.dc.html` | Stand-in to remove | Bounds to pass |
|---|---|---|---|
| Create, From / Until | the `<sc-for list="{{createWheels}}">` block under "What time?"; values from `renderVals().createWheels` built by `makeWheel('c-from' …)` and `makeWheel('c-until' …)`; commits go to `setFrom(m)` and `setUntil(m)` (minutes since midnight; 1440 = 12am) | `.wheels` markup + `makeWheel`, `registerWheel`, `wheelScrolled`, `syncWheels` + wheel CSS | none (no window limit) |
| Respond, per range | the `<sc-for list="{{r.wheels}}">` block inside `.range-wheels`; commits go to `setRangeEdge(slotId, rangeIndex, 's' or 'e', minutes)`, which keeps the timeline bar and the label in sync | as above | the organiser window `state.win = {s, e}` in minutes (sample: 1020–1440), passed as the component's `min` and `max` (the 03:30 message gives the example `{ min: 17*60, max: 0 }`) |

Mounting a plain-JS component inside the DC template needs a `ref` callback that calls `createWheelTimePicker` on the mounted element, because the template can't run `<script>` blocks itself. Its CSS goes in the `<helmet>` style block. Copy the CSS exactly; only size and placement may change.

---

## 8. State management

- **Per-artboard component state** (`this.state`, `setState`). Nothing is shared in memory between artboards.
- **`localStorage`** (Main only, wrapped in try/catch; when storage is unavailable the "Your events" list is simply hidden):
  - `showup-events`: list of `{id, name, role: 'organising'|'invited', who, status, updated, sample?}`, at most 20 stored and 5 shown
  - `showup-ev-<id>`: the full event object for each created or joined event
- **`sessionStorage`:**
  - `showup-proto-flow`: snapshot of the flow state for returning from the sample page (Main)
  - `showup-dots-seen`: `'1'` once the dot-fill animation has played this session (Main and Event)
- **No backend, network calls or authentication.** Everything is local to one browser on one device.

---

## 9. External packages and browser APIs

| Kind | Item |
|---|---|
| Web font | Google Fonts Manrope 400–600 |
| npm packages | None |
| Browser APIs used | View Transitions (`document.startViewTransition`, feature-detected), Clipboard (`navigator.clipboard.writeText`, with `document.execCommand('copy')` fallback via selection), `localStorage`, `sessionStorage`, `matchMedia('(prefers-reduced-motion: reduce)')`, `scrollTo`, `scrollIntoView`, `getBoundingClientRect` |
| CSS features relied on | `backdrop-filter` (glass), `mask-image` (wheel fade), `scroll-snap`, `grid-template-rows: 0fr→1fr` transitions, `text-wrap: balance`, `env(safe-area-inset-bottom)`, discrete `overflow` keyframe animation (`reveal-unclip`) |

---

## 10. Installation and local run

**Canvas:** open the Design canvas artifact (owner-private) and use Play.

**Standalone (`showup-standalone.zip`)** needs no install, no build and no package manager:

1. Unzip anywhere.
2. Either:
   - **Chromium-based browsers:** open `Main.dc.html` directly (tested via `file://`); or
   - **Any browser (recommended):** in the unzipped folder run `python3 -m http.server 8000`, then open `http://localhost:8000/Main.dc.html`.
3. Navigation works as in the canvas Play mode: "See an example" opens `Event.dc.html`, and its "Back" returns to `Main.dc.html` with the flow restored.

Over `file://`, Firefox gives each page its own storage, so "Your events", the return from the sample page and the once-per-session dot fill do not carry between `Main.dc.html` and `Event.dc.html`. Use the http option. This was not testable here: only Chromium is installed in this environment.

Fonts: when online, the files' own Google Fonts link loads Manrope. Offline, `standalone-support.js` registers the bundled `fonts/manrope-latin-wght-normal.woff2` under the same family name.

## 11. Configuration and environment variables

- **Environment variables, secrets and API keys:** none.
- **Canvas Tweaks:** `startAt` (Main family, selects the start screen and seed fixture); `showRoster` (Event family, adds two fictional "waiting" invitees, Priya and Tom).
- **Hard-coded "today":** `TODAY = '2026-10-17'` in Main. It drives the calendar's minimum date, the starting month and the deadline minimum. Event.dc.html hard-codes `min="2026-10-17"`.
- **Time zone:** none is handled in code. The 5pm–12am sample window is in local minutes.

---

## 12. What must be transferred

| Priority | Item | Why |
|---|---|---|
| Essential | `project/Main.dc.html` | All flow screens, logic, CSS, stand-in wheels, QR (N8R2VQ) |
| Essential | `project/Event.dc.html` | Fixed sample event page, its CSS and fixtures, QR (7Q4KX2) |
| Essential | `time-wheel-picker.html` (**missing — must be supplied by you**) | Approved wheel component |
| Essential (for the canvas only) | `project/canvas.json` | Frame sizes, launch file, titles. Not needed in a ported app, but it documents the intended preview sizes |
| Reference | the 14 derived `.dc.html` files | Reproducible from the two authored files using §3.3. Useful as ready-made start-state fixtures |
| Reference | `SHA256SUMS.txt` | Integrity check of this exact version |
| Essential (to run outside the canvas) | `showup-standalone.zip`: `standalone-support.js`, `vendor/` (React 18.3.1, ReactDOM 18.3.1), `fonts/` (Manrope) | Replaces the canvas runtime (§14) |
| Not transferable | the canvas's own `support.js` | Belongs to the host; replaced by `standalone-support.js` |
| Not part of the app | Session briefs, Node test harnesses, QR generation one-off | Development artifacts |

---

## 13. Export checklist

- [x] Downloaded every published project file from the canvas (version `1792166501-1cda`)
- [x] Verified byte-identical with the working copies (16/16 `.dc.html` files, plus `canvas.json`)
- [x] Packaged as `showup-source.zip`: `project/` (16 `.dc.html` + `canvas.json`) + `SHA256SUMS.txt`
- [x] Marked the authored files (`Main.dc.html`, `Event.dc.html`) and the derivation rules for the other 14
- [x] Recorded storage keys, external URLs and browser APIs
- [x] Built `showup-standalone.zip` (`Main.dc.html` + `Event.dc.html` with only line 6 changed, `standalone-support.js`, React 18.3.1, Manrope) and verified it against the real canvas runtime (§14.4)
- [ ] **Supply `time-wheel-picker.html`.** Still not received (Fix 1 blocked); the stand-in must not be treated as approved
- [ ] Decide whether to authorise the `componentDidUpdate` fix (§15). It changes behaviour in both the canvas and the standalone copy
- [ ] Decide the runtime route for the receiving platform (run the standalone copy as-is, or port to React). See Document 4
- [x] Reference screenshots can now be captured locally (Document 3)

---

## 14. Standalone copy (`showup-standalone.zip`)

### 14.1 Contents
```
showup-standalone/
├── Main.dc.html              # byte-identical to project/Main.dc.html except line 6
├── Event.dc.html             # byte-identical to project/Event.dc.html except line 6
├── standalone-support.js     # 318 lines, plain ES5/ES2015 browser JS, no dependencies besides vendor/
├── README.txt
├── vendor/react.production.min.js        # React 18.3.1 UMD (MIT) + LICENSE
├── vendor/react-dom.production.min.js    # ReactDOM 18.3.1 UMD (MIT) + LICENSE
└── fonts/manrope-latin-wght-normal.woff2 # Manrope variable, Latin, from @fontsource-variable/manrope 5.3.0 (SIL OFL) + LICENSE
```
The only edit to the two app files is line 6: `<script src="./support.js"></script>` becomes `<script src="./standalone-support.js"></script>`. The React files' SHA-384 hashes match the integrity hashes the canvas runtime pins for its own React 18.3.1 downloads, so they are byte-identical builds. The 14 preview copies are left out.

### 14.2 What `standalone-support.js` replaces

| Canvas runtime responsibility | Standalone implementation |
|---|---|
| Load React 18.3.1 and ReactDOM 18.3.1 | `document.write` of `vendor/*.js` script tags (synchronous, same order) |
| Read the **raw** file source (the canvas re-fetches `location.href`) so that `<sc-for>` inside `<select>` and camelCase attributes survive HTML parsing | A `<plaintext>` element written straight after React captures the rest of the file as raw text; this also works on `file://`, where `fetch` is blocked |
| Preprocess the template: `<helmet>` → `<sc-helmet>`, camelCase attribute names encoded as `sc-camel-…`, `select`/`table`/`tr`/`td`… renamed `sc-raw-*` | Same transforms, same regular expressions |
| `<helmet>`: hoist `<link>`, `<style>` and `<meta>` into `<head>` once | Same (deduplicated) |
| `{{ }}` grammar: dotted paths, numeric indexes, literals (`true`, `false`, `null`, numbers, quoted strings), `!`, `==`, `!=`, `===`, `!==`, parentheses | Same grammar |
| Text holes render as `<span class="sc-interp">value</span>`; `null` and booleans render nothing; unresolved holes render empty with a console warning | Same |
| `<sc-if value>`, i.e. a React Fragment or `null`; `<sc-for list as>`, i.e. nested Fragments keyed by index, with `$index` in scope | Same |
| Attribute → prop mapping: `class` → `className`, `for` → `htmlFor`, lower-case `on*` → React event names, empty boolean attributes → `true`, `style` string → style object, `value` or `checked` of `undefined` → `''` or `false`, `hint-*` dropped | Same mapping |
| `DCLogic` base class (`props`, `state`, `setState(patch, cb)`, `forceUpdate`, lifecycle no-ops, `renderVals`), exposed as `window.DCLogic` | Same contract |
| Host component: `logic.state` replaced **immediately** on `setState`, then React re-renders and the callback fires after commit; `componentDidMount`, `componentDidUpdate(prevProps)` (**without `prevState`**; see §15), `componentWillUnmount`, each wrapped in try/catch | Same, including the missing `prevState` |
| Default props from `data-props` `default` values; mount into `#dc-root`, which replaces `<x-dc>`; output wrapped in `div.sc-host[data-sc-name]` | Same |
| Not reproduced (only used by the canvas editor) | Streaming placeholders, the canvas's Tweaks panel, `dc-import`/`x-import` (not used by these files), editor annotations (`data-dc-tpl`), keyframe scrubbing, render-error banners (errors go to the console), and the canvas's base CSS for placeholders and print |

### 14.3 Changing a start screen in the standalone copy
The canvas Tweaks (`startAt`, `showRoster`) only have their default values here. To open the flow at another screen, change `"default":"landing"` in `Main.dc.html`'s `data-props`, or use one of the 14 derived files from `showup-source.zip` with the same line-6 change.

### 14.4 Verification performed (Chromium via Playwright, Manrope loaded identically for both builds)

The reference was **the canvas's own runtime** (`dc-runtime.js` from the artifact type, served locally as `support.js`, used only for testing and not shipped). The same 15-step script ran against the reference and the standalone copy at 390×844, 768×1024 and 1440×900:

> Landing → type name → Create → pick Fri 23 and Sat 24, enter name → Create event → Respond → Favourite → tap timeline at 7p and 11p → open wheels → Done → If… → type "I'll go if Sam is going and at least five people come" → wait for chips → Looks right → day 2 Free + Yes → Submit → fresh event → Preview as a guest → Join as "Sam" → Free + Yes → Submit → guest event → Plan your own → Landing with "Your events" → open the organiser event → Propose a time → Escape → sample event page

| Check (all three widths) | Result |
|---|---|
| Timeline taps give "7pm – 11pm"; wheel values and scroll positions | identical |
| Chips "Sam goes", "5+ people"; summary "Only you see this: Sam goes · 5+ people" | identical |
| Dot-row aria-labels and red-dot counts (flow and sample) | identical |
| Best so far, "Your events" rows, propose options | identical |
| Scroll position after screen changes; Escape on sheets | identical (both show the §15 defect) |
| Console errors | identical: the two `componentDidUpdate` TypeErrors (§15) |
| Screenshots (45 per build) | 40 pixel-identical in both runs. The other 5 differ by anti-aliasing (max channel Δ ≤ 15) or by capture timing (the sticky desktop rail and the mid-scroll wheel frame), and **the reference differs from itself between runs by the same amount** |
| `file://` open of the standalone copy (Chromium) | renders; Create → reload keeps "Your events"; See an example → Back works; no page errors |

**Not verified:** Firefox and Safari (not installed here), touch devices, and the live claude.ai canvas itself (it only renders on claude.ai; its runtime code was used locally instead).

## 15. Defect in the approved build: `componentDidUpdate` never receives `prevState`

Both `Main.dc.html` (`componentDidUpdate(prevProps, prevState)`, reading `prevState.screen`, `.sheet`, `.proposeOpen`, `.phase`) and `Event.dc.html` (reading `prevState.proposeOpen`) assume React's two-argument signature. The canvas host passes only `prevProps`, so the method throws `TypeError: Cannot read properties of undefined` after its first statement on every update. The canvas logs the error and carries on.

**Observed effects (identical in the canvas runtime and the standalone copy):**
- **No scroll-to-top or heading focus on screen changes.** For example, the mobile fresh event page opened at scrollY 22.
- **Focus is not moved into the conditions sheet or the propose sheet,** so **Escape does nothing** until the user clicks inside the sheet.
- **On the flow's event page, the red "would go" dots never fill in** when it is reached through the flow (0 red dots in the test, where 1 would go). They do fill on frames that *start* on the event page (`componentDidMount` path) and on the sample page.
- Participant "Saved" block: the scroll to it and the focus move never happen.
- Stand-in wheels are not re-synced after timeline taps while they are open (`syncWheels` never runs).
- The `startAt` Tweak change still works, because its check runs before the throw.

**Fix (not applied; needs your authorisation):** have the logic track its own previous state instead of relying on the second argument. For example, snapshot `this.state` at the end of each `componentDidUpdate` and compare against that snapshot. This changes the canvas version too, so it falls outside "change nothing else".

# showup.

Group plans that actually happen. The organiser picks candidate days. Everyone marks when they're free, whether they'd actually go, and what it depends on ("if Sam's going and there's at least 5 of us"). showup then shows the time most people would really turn up for.

This is the hackathon frontend, ported from the original HTML prototype to **Next.js 14 (App Router) + TypeScript**. The behaviour and appearance match the original. The backend (Supabase, Anthropic API, coordination engine) hasn't been built yet.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (also runs ESLint + type checks)
npm run start        # serve the production build
npm run smoke        # after a build: loads every route in Chromium, fails on any console error
```

Requires Node 18.17+. `npm run smoke` and `npm run visual` need Playwright's Chromium once: `npx playwright install chromium`.

| Route | What it is |
|---|---|
| `/` | The whole flow: Landing → Create → Respond → Event, plus Join, the conditions sheet and the propose sheet. It's one state machine, so screens change without changing the URL. |
| `/example` | Sample event page with fixed, fictional responses ("See an example") |
| `/preview/create` · `respond` · `fresh` · `join` · `guest` · `participant` | The flow opened at a seeded start screen (the old canvas boards). Unknown values return 404. |

Links between `/` and `/example` are deliberately plain `<a href>`, not `next/link`. The two pages' CSS defines some of the same selectors differently, and a full page load keeps them apart (see `app/(flow)/layout.tsx`).

## Folder structure

```
app/
  layout.tsx                 <html>, fonts, shared CSS (variables, reset, fonts)
  (flow)/layout.tsx          the flow's CSS
  (flow)/page.tsx            /
  (flow)/preview/[startAt]/  /preview/<startAt>
  example/                   /example (+ its own CSS)
  api/                       PLACEHOLDER: backend routes go here
components/
  flow/                      FlowClient (client-only entry; props: startAt, event, initialState), FlowView
  flow/screens/              Landing, Create, Join, Respond, EventPage
  flow/sheets/               ConditionsSheet, ProposeSheet
  sample/                    the /example page and its propose sheet
  shared/                    DotRows, ReminderPanel, ProposalNotice, TimeWheels
lib/
  ui/dc-runtime.tsx          the component runtime the logic was written for (see the note in the file)
  ui/flow/, ui/sample/       page logic: one mixin per screen or feature, plus main.ts (the page class)
  ui/utils/                  helpers, formatting, dates, recommend (the current "engine"), conditions parser
  ui/services/storage.ts     localStorage persistence (the seam for the backend)
  ui/data/, ui/config.ts     constants, fixtures, TODAY, storage keys
  engine/                    PLACEHOLDER: coordination engine
  supabase/                  PLACEHOLDER: Supabase client
styles/                      the original CSS, unchanged
public/fonts/                Manrope (offline fallback for Google Fonts)
scripts/                     smoke.mjs, visual-diff.mjs
docs/                        DESIGN_SYSTEM.md, SCREENS.md, BACKEND_REQUIREMENTS.md, design-references/, archive/
archive/                     the original prototype (runnable) and handoff files; not part of the app
MIGRATION_AUDIT.md           how the old code was audited and mapped to this structure
```

## Done vs placeholder

**Done (ported, matches the original):** every screen and sheet, the Your-events list, the sample event page, View Transitions, reduced motion, clipboard copy, and the return trip from the sample page.

**Still simulated in the frontend.** The backend will replace these. `docs/BACKEND_REQUIREMENTS.md` lists what has to be decided first.

| Simulated | Where |
|---|---|
| All data is stored in `localStorage` on one device | `lib/ui/services/storage.ts` |
| Condition "AI" is a regex parser | `lib/ui/utils/conditions-parser.ts` |
| Best-time calculation | `lib/ui/utils/recommend.ts` |
| Fake 700 ms save, fixed invite links and QR codes, `TODAY = 2026-10-17` | `lib/ui/flow/respond.ts`, `lib/ui/config.ts`, `components/flow/screens/EventPage.tsx` |
| Demo fixtures (Alex, Jess, the 8-person sample) | `lib/ui/data/fixtures.ts`, `lib/ui/sample/constants.ts` |
| Wheel time picker is a stand-in (the supplied component never arrived) | `components/shared/TimeWheels.tsx`, `lib/ui/flow/wheels.ts` |

**Empty placeholders:** `app/api/`, `lib/engine/`, `lib/supabase/`.

## Working on the code

- The ported logic (`lib/ui/**`) is the original JavaScript, unchanged apart from module `export`/`import` lines. It is marked `// @ts-nocheck`, and adding types is a later job.
- **Don't swap `lib/ui/dc-runtime.tsx` for plain React state.** Its `setState` updates `this.state` immediately, and the logic depends on that. The file explains why.
- To check you haven't changed anything visible, run `npm run build && npm run start`, then `npm run visual -- all`. This captures the original (`archive/showup-standalone`) and the port at 1440px and 390px and pixel-diffs them into `.visual/`. Use `ONLY=<regex>` to run a subset.

SHOWUP — standalone copy (runs outside the Claude Design canvas)

Contents
  Main.dc.html              the full flow (Landing, Create, Join, Respond, Event): the page markup only
  Event.dc.html             the fixed sample event page: the page markup only
  standalone-support.js     stand-in for the canvas runtime (support.js)
  css/                      all styles: variables, reset, base, layout, transitions, event,
                            components/ (materials, buttons, fields, segmented, wheels),
                            screens/ (landing, create, respond, join, event-flow, sheets)
  js/                       all logic, as plain scripts (no build step, no ES modules)
    config.js, state.js, registry.js
    main.js                 entry for Main.dc.html: builds the page's Component class
    data/                   constants, fixtures
    utils/                  helpers, format, dates, recommend, dot-rows, conditions-parser
    services/storage.js     the localStorage functions
    components/             one file per screen or sheet (app, wheels, landing, create, join,
                            respond, conditions-sheet, event-page, propose-sheet)
    sample/                 the same layout for Event.dc.html (main.js, constants.js, helpers.js,
                            components/app, results, invite, propose-sheet)
  vendor/react.production.min.js, vendor/react-dom.production.min.js   React 18.3.1 + ReactDOM 18.3.1 (MIT)
  fonts/manrope-latin-wght-normal.woff2                                Manrope variable, Latin subset (SIL OFL 1.1), offline fallback

Run
  Option A (simplest, Chromium-based browsers): double-click Main.dc.html.
  Option B (recommended, all browsers): from this folder run
      python3 -m http.server 8000
  then open http://localhost:8000/Main.dc.html
  Firefox isolates file:// pages from each other, so "Your events", "See an example" → "Back"
  and the dot-fill-once flag only carry across pages when served over http (Option B).

No build step, no install, no network required (Google Fonts is used when online; the bundled Manrope otherwise).

Notes
  The page markup is still compiled at load time by standalone-support.js from the raw .dc.html text, so each
  page lists its css and js files in <head> before the runtime script. The scripts must stay in that order.
  The componentDidUpdate defect found in the approved canvas build is fixed here (see docs/SOURCE_MANIFEST.md §15).
  standalone-support.js still runs a page's inline <script data-dc-script> if it has one; these two pages use js/main.js instead.

Missing: the supplied wheel time picker (time-wheel-picker.html) has not been received; the wheels are the
stand-in in js/components/wheels.js.

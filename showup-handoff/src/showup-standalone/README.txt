SHOWUP — standalone copy (runs outside the Claude Design canvas)

Contents
  Main.dc.html              the full flow (Landing, Create, Join, Respond, Event) — unchanged except line 6
  Event.dc.html             the fixed sample event page — unchanged except line 6
  standalone-support.js     stand-in for the canvas runtime (support.js)
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

Missing: the supplied wheel time picker (time-wheel-picker.html) has not been received; the wheels are the
stand-in that lives inside Main.dc.html.

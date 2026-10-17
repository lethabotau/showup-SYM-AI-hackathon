# SHOWUP standalone baseline smoke test

The smoke test serves `../showup-standalone` over HTTP, drives the existing
standalone files without modifying them, and captures Landing, Create, Respond,
Event, and sample-event states at 390×844 and 1440×900.

## Automated run

```sh
cd showup-handoff/baseline-tests
npm ci
npx playwright install chromium
npm test
```

To use an already-installed Google Chrome instead of downloading Chromium:

```sh
SHOWUP_BROWSER_CHANNEL=chrome npm test
```

Screenshots are written to `artifacts/` and are intentionally ignored by Git.
The test fails for unexpected local HTTP failures, page errors, or console
errors. Google Fonts is optional because the standalone build includes a local
Manrope fallback, so external resource failures are reported separately without
failing the smoke test.

The known `componentDidUpdate` `prevState` TypeError is counted separately and
must remain reproducible during Stage A1.

## Manual server

From the repository root:

```sh
python3 -m http.server 8000 --directory showup-handoff/showup-standalone
```

Then open <http://127.0.0.1:8000/Main.dc.html>.

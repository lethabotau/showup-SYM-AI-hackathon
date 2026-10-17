# Stage A1 baseline report

Date: 2026-10-17  
Branch: `lethabo-branch1`  
Starting commit: `c10b6d5`

## Standalone integrity

The application and runtime files were not changed.

| File | SHA-256 |
|---|---|
| `showup-standalone/Main.dc.html` | `26e0a5eac09be7bb0802f457194f889a67076b07d6fcaa1cd88737448fc3b65e` |
| `showup-standalone/Event.dc.html` | `211800a731beb370e5b4f921fdcdd6161a5533023a097a5520146282304054ac` |
| `showup-standalone/standalone-support.js` | `d92e94571a61f39e403286e720e07345dda1446204286f65ae41ede6aac12969` |
| `showup-standalone/vendor/react.production.min.js` | `d949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd` |
| `showup-standalone/vendor/react-dom.production.min.js` | `35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d` |
| `showup-standalone/fonts/manrope-latin-wght-normal.woff2` | `a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972` |

## Smoke-test result

Command used:

```sh
cd showup-handoff/baseline-tests
SHOWUP_BROWSER_CHANNEL=chrome npm test
```

| Viewport | Main flow | Sample navigation | Known lifecycle errors | Unexpected browser errors | External resource issues |
|---|---|---|---:|---:|---:|
| 390×844 | Pass | Pass | 13 | 0 | 0 |
| 1440×900 | Pass | Pass | 13 | 0 | 0 |

Verified:

- Landing → Create → Respond → Event
- Landing → sample event → Back
- Flow event → sample event → Back to restored flow state
- Local storage/session storage behavior used by those paths
- The known `componentDidUpdate` missing-`prevState` defect remains reproducible
- No horizontal or structural failure was observed in the captured mobile and desktop states

The test generated full-page captures for Landing, Create, Respond, Event, and
both sample-event entry paths at each viewport. These captures are local test
artifacts and are not committed.

## Reference-image limitation

`screenshots/index.json` is present, but the referenced PNG files are not in the
repository. A pixel-diff comparison against the approved 42-state reference set
could therefore not be run. The smoke test and fresh captures establish the
working local baseline available from this branch.

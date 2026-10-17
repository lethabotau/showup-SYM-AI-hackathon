# Archived docs

These were written for an AI "handoff" that has been scrapped. They are kept for history. Don't follow them as instructions.

| File | Why it was archived | What replaces it |
|---|---|---|
| `SOURCE_MANIFEST.md` | It describes the Claude Design canvas source and the standalone runtime (`standalone-support.js`, vendored React UMD, `.dc.html` templates), all of which the Next.js app replaced. §2, §5, §6.2, §10 and §12–14 were already out of date before the migration (they predate the split into `css/` and `js/`). §3 (navigation), §8 (state) and §15 (the `componentDidUpdate` fix) are still correct as history. | `README.md` (how to run, structure), `MIGRATION_AUDIT.md` (how the old code maps to the new) |
| `BUILD_STAGES.md` | Step-by-step prompts for an implementing agent. A2 was done before the migration. A4 is this migration. A5/A6 were half done (storage and engine functions already sit in their own modules, without tests). | `docs/BACKEND_REQUIREMENTS.md` keeps §3 (integration readiness), §4 (missing requirements R1–R9) and the A6 expected engine values, with the text unchanged and a path mapping added. |

The old source itself is in `/archive/`:
- `showup-standalone/` is the runnable original and the visual-regression baseline. Serve it with `python3 -m http.server` from that folder.
- `showup-source/` holds the 16 canvas files + `canvas.json`.
- `zips/` holds the original handoff zips and checksums.
- `design-reference-styles/` holds the verbatim CSS reference copies.

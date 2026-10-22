# Build status

_Last updated: 23 Oct 2026, ~01:00 Türkiye time (AI session)._

## Completed components

| Component | State |
|---|---|
| OSM data pipeline (one-time extract, classification, duplicate merge) | ✅ done, tested |
| Scenario engine (Haversine, before/after, canal belt, validation, suggestions over 1,456 candidates) | ✅ done, tested |
| Interactive map (canals, study area, grid, facilities with sources, hypothetical drag/tap/arrows, live recalculation, recentre, overlay) | ✅ done, E2E-tested (desktop drag; mobile tap-to-move) |
| A/B/C scenario comparison under identical settings | ✅ done, E2E-tested |
| Text alternative tables (points, facilities) | ✅ done |
| Priorities form (local-only, validation, JSON download) | ✅ done, E2E-tested |
| PDF planning brief (from state, schematic SVG map) | ✅ done, unit- and E2E-tested |
| Landing / evidence / method / limitations / English summary | ✅ done |
| Canal corridor → hypothetical linear park (point-to-polyline) | ✅ done, unit- and E2E-tested |
| Accessibility audit (axe) + keyboard-only journey | ✅ 0 violations; keyboard test passes |
| Docs (`docs/`), submission drafts (`submission/`) | ✅ drafted |
| Captioned demo video (silent, automated, real app) | ✅ draft recorded (local file) |

## Test results (latest run, outputs in `docs/test-output/`)

- Unit (Vitest): **77 passed**
- E2E (Playwright, production build, desktop + Pixel 7): **9 passed, 1 skipped by design** (the keyboard-only journey runs on desktop only); run twice in a row with identical results
- Accessibility (axe-core 4.14, WCAG 2.0/2.1 A+AA): **0 violations** on desktop and mobile, initial and with a scenario
- `tsc --noEmit`: no errors · ESLint: no problems · `next build`: success

## Known issues / unverified

- Touch-drag of the marker on real phones: **unverified** (tap-to-move and arrows verified).
- Screen-reader testing with real assistive technology: not done.
- Facility operating status: unverified by design (MAPPED).

## Pending owner decisions

See `NEEDS_OWNER_INPUT.md`.

## Deployment status

**Not deployed.** No Vercel/Netlify credentials on this machine. Commands are in `MORNING_READ_ME_FIRST.md`.

## Repository status

Local git repo, commits on `main`, author "Deniz Efe Bulut". **Not pushed**: no GitHub remote or credentials.

## Demo video status

Draft at `submission/video/kanalatlas-demo-draft.webm` (≈ 3:48, silent, bilingual captions, includes the canal-corridor scenario). See `submission/VIDEO_STATUS.md`.

## Exact commands to resume

```bash
cd ~/Documents/kanalatlas
export PATH=~/.local/node/bin:$PATH     # Node 22 lives here on this Mac
npm install
npm run dev                             # http://localhost:3000
npm test                                # unit tests
npm run build && npm run e2e            # browser tests (npx playwright install chromium first on a new machine)
npm run proof                           # real-data A/B table
npm run demo:record                     # re-record the demo (after npm run build)
```

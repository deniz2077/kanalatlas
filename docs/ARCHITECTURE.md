# Architecture

KanalAtlas is a static Next.js site. It has no server, database or accounts: all computation runs in the browser on a small, versioned dataset.

```
 data/raw/study_raw.json  ──(npm run data:build)──►  src/data/kanalatlas-data.json
   (one-time Overpass extract)   scripts/build-dataset.ts       (shipped with the app)
                                 └─ src/lib/facilities.ts
                                    classify + merge duplicates
                                                                      │
                                                                      ▼
 ┌──────────────────────────── browser ─────────────────────────────────────────┐
 │ src/lib/data.ts        dataset + 72-point evaluation grid + 100 m candidates  │
 │ src/lib/scenario.ts    evaluateScenario(), suggestSites(), validation         │
 │ src/lib/geo.ts         Haversine, point-to-segment, polygon centroid          │
 │ src/lib/insights.ts    Turkish explanations & formatting (shared with PDF)    │
 │ src/lib/report.ts      buildReportDoc(): state ─► pdfmake document definition │
 │ src/lib/priorities.ts  validation/parsing of local-only priorities            │
 │ src/lib/evidence.ts    source ledger (mirrors docs/EVIDENCE.md)               │
 │                                                                               │
 │ src/components/KanalAtlasApp.tsx  state: category, scope, threshold,          │
 │                                   hypotheticals, saved scenarios, priorities  │
 │ src/components/MapView.tsx        Leaflet drawing only (no calculations)      │
 │ src/components/PrioritiesForm.tsx localStorage form                           │
 │ src/app/page.tsx                  landing, evidence, method, English summary  │
 └───────────────────────────────────────────────────────────────────────────────┘
```

## Module responsibilities

| Module | Responsibility | Pure? | Tests |
|---|---|---|---|
| `geo.ts` | Coordinate validation, Haversine, local projection, point-to-segment, polygon area/centroid | yes | `geo.test.ts` |
| `facilities.ts` | OSM tags → category; tiering (core/extended/excluded); status; duplicate merging | yes | `facilities.test.ts` |
| `scenario.ts` | Evaluation grid, active-facility filtering, nearest search, before/after summaries, canal belt, site suggestions, placement validation | yes | `scenario.test.ts` |
| `insights.ts` | Formatting (tr-TR), interpretation text, “why this result” explanations | yes | via report tests |
| `report.ts` | PDF document definition + schematic SVG built from the same coordinates | yes | `report.test.ts` (renders real PDFs in Node and parses them) |
| `priorities.ts` | Option lists, validation (incl. phone/email detection), safe parsing of stored JSON | yes | through E2E |
| `KanalAtlasApp.tsx` | UI state; calls the engine through `useMemo`; never computes distances itself | — | E2E |
| `MapView.tsx` | Draws layers; reports clicks/drags upward; snaps back rejected drags | — | E2E |

**Design rule:** all numbers come from `evaluateScenario()`. The UI, map overlay, text table and PDF all read the same `ScenarioResult` object, so they cannot disagree.

## Data flow during a drag

1. Leaflet fires `drag` → `moveHypothetical(id, lat, lon, final=false)`.
2. `validateHypothetical` checks the coordinates and the analysis box. An invalid move is ignored; on `dragend` an invalid drop snaps back.
3. State updates → `useMemo` re-runs `evaluateScenario` (72 points × ≤ 200 facilities: well under a millisecond).
4. The map recolours points, redraws nearest-facility lines and the threshold ring. The results card and overlay update. The screen-reader announcement waits until the inputs settle.

## Runtime dependencies

| Package | Why |
|---|---|
| next 15 / react 19 | App framework, static export-friendly |
| leaflet + react-leaflet 5 | Map rendering; mature, no API key |
| pdfmake 0.3 | Client-side PDF with embedded Roboto (supports Turkish ı, ğ, ş, İ); vector SVG support |
| tailwindcss 4 | Styling |

Development: vitest (unit), @playwright/test (E2E), pdfjs-dist (PDF text extraction in tests), tsx (scripts).

Deployment: `STATIC_EXPORT=1 PAGES_BASE_PATH=/repo next build` writes a fully static site to `out/`. `.github/workflows/pages.yml` runs the tests and publishes it to GitHub Pages. Vercel can also host the default build.

Basemap tiles: the OpenStreetMap Foundation tile server (attribution shown). For heavier production use, a tile provider with its own usage terms should be configured. See `ENGINEERING_DECISIONS.md`.

## Scaling to more neighbourhoods

1. Add a query and box per area → `data/raw/<area>.json`.
2. Generalise `scripts/build-dataset.ts` to emit one JSON per area with its own `studyArea`.
3. Add an area selector. The engine already takes `points`, `facilities` and `bbox` as parameters, so it needs no changes.
4. For walking distance, swap `nearestOf()`'s metric for a routing-table lookup precomputed offline (OSRM `table` service). The rest of the pipeline is unchanged.
5. For community responses, add a backend with consent and moderation. This is deliberately out of scope for the prototype.

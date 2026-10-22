# Technologies and implementation

**Built with:** TypeScript · Next.js 15 (App Router, static) · React 19 · Tailwind CSS 4 · Leaflet + react-leaflet · pdfmake · OpenStreetMap / Overpass API · Vitest · Playwright · pdf.js (tests) · tsx

## How it fits together

1. **Data pipeline (run once):** an Overpass query (`data/raw/q_study.txt`) pulls canals, parks, pools and neighbourhood labels for one box in Seyhan, Adana. `scripts/build-dataset.ts` classifies each record (core / extended / excluded), merges duplicates within 30 m, computes polygon centroids and areas, and writes `src/data/kanalatlas-data.json`. The raw response and timestamp are committed for reproducibility. The app never calls Overpass at runtime.
2. **Scenario engine (`src/lib/scenario.ts`):** pure TypeScript. A 500 m grid of 72 sample points; Haversine distance to the nearest active facility; before/after summaries (within threshold, mean, median, max), a canal-belt subset, validation, a site-screening heuristic over a 100 m candidate grid (1,456 sites, about 13 ms), and linear hypothetical facilities (canal corridor → park) measured by point-to-polyline distance.
3. **UI:** a React state holder (`KanalAtlasApp.tsx`) recomputes with `useMemo` whenever a hypothetical facility moves; Leaflet (`MapView.tsx`) only draws. The map overlay, results card, text table and PDF all read the same result object.
4. **PDF:** `buildReportDoc()` maps state to a pdfmake document (tables + an SVG schematic drawn from the same coordinates). Roboto supports Turkish characters.
5. **Testing:** 77 Vitest unit tests with hand-calculated expectations (including rendering real PDFs and parsing them back); Playwright journey tests in Desktop Chrome, Android Chromium and iPhone WebKit (Safari engine) against the production build, a native-TouchEvent drag test, including downloading and parsing the PDF; a keyboard-only journey; and an axe-core WCAG 2.1 A/AA audit (0 violations).

No backend, accounts, paid APIs or API keys.

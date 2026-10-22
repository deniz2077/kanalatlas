# Owner review guide (for Deniz)

You are the author and must be able to explain every part of this project. Most of the code was written with an AI assistant during this session. Please **read, run, question and change** it; anything you change or rewrite becomes your genuine contribution, and you should record it in `submission/AI_DISCLOSURE.md`.

## 1. Run it yourself (10 minutes)

```bash
cd ~/Documents/kanalatlas
export PATH=~/.local/node/bin:$PATH
npm install
npm run dev          # open http://localhost:3000
npm test             # 71 unit tests
npm run proof        # prints the A/B real-data table
```

Then, in the browser:
1. Note the baseline (13 / 72). Switch the data scope to “Tüm haritalanmış” and back. Why does the number change?
2. Press “En çok fayda sağlayan konuma ekle”, then drag the orange marker west. Watch the numbers.
3. Save scenario A, move the marker, save scenario B. Read the comparison table.
4. Fill in priorities and download the PDF. Open it and find your coordinates in it.
5. On your phone (same Wi-Fi, `npm run dev -- -H 0.0.0.0`, then open `http://<your-mac-ip>:3000`), try **dragging** the marker. This is the one thing we could not verify automatically. Record the result in `BUILD_STATUS.md`.

## 2. Code paths to read (in this order)

| File | What to understand | Time |
|---|---|---|
| `src/lib/geo.ts` → `haversineMeters` | The formula, R, why `asin(min(1, …))` | 10 min |
| `src/lib/scenario.ts` → `evaluateScenario` | before / after / “strictly closer” / undefined baseline | 20 min |
| `src/lib/__tests__/scenario.test.ts` | The hand-built 3-point example; redo it on paper | 15 min |
| `src/lib/facilities.ts` → `classify`, `mergeDuplicates` | Which OSM records count and why | 15 min |
| `src/lib/scenario.ts` → `suggestSites` | The “best location” screening | 10 min |
| `src/components/KanalAtlasApp.tsx` | Where state lives; `useMemo` recalculation | 15 min |
| `src/lib/report.ts` | How the PDF is built from state | 10 min |
| `scripts/build-dataset.ts` + `data/raw/q_study.txt` | Where the data comes from | 10 min |

**Exercise:** do `docs/SCENARIO_METHOD.md` §6 with a calculator. Then change `GRID_SPACING_M` in `src/lib/data.ts` to 400, run the app, and explain what changed and why.

## 3. Judge Q&A study guide

**How are nearest facilities determined?**
For each of the 72 sample points, we compute the Haversine distance to every active facility in the chosen category and keep the minimum. “Active” means the right category and scope, and never `access=private`. Ties are broken by id so results are reproducible.

**Why Haversine?**
It gives the exact great-circle distance between two coordinates, needs no external service, and anyone can check it by hand. At neighbourhood scale it is accurate to well under a metre for the straight line.

**What are its limitations?**
It is not walking distance: it ignores roads, bridges, the canal and the railway. A point 300 m from a pool “as the crow flies” could be a 1 km walk if there is no bridge. That is why we always say “kuş uçuşu” and never “walking time”.

**How does scenario recomputation work?**
Hypothetical facilities are React state. When one moves, `useMemo` re-runs `evaluateScenario` with the new coordinates. A hypothetical becomes a point's nearest facility only if it is strictly closer than the existing one. The summaries (within threshold, mean, median, max, canal belt) are recomputed from the per-point results.

**How do we avoid duplicate facilities?**
`mergeDuplicates` groups same-category records within 30 m (OSM often has both a node and a polygon for one pool). The merged record keeps all OSM ids. If any record in a group is private, the whole group is excluded and flagged.

**What is verified versus hypothetical?**
VERIFIED applies only to documents (the council decisions and ministry news). Facilities are MAPPED: they exist in OSM, but operating status and public access are unknown. Unnamed pools are REQUIRES CONFIRMATION. User-placed facilities are HYPOTHETICAL. Nothing on the map is claimed as open, free or public.

**How does PDF generation work?**
`buildReportDoc()` turns the current state into a pdfmake document (text, tables and an SVG map drawn from the same coordinates). The browser renders it with embedded Roboto, which supports Turkish letters. The tests render the PDF and read its text back to check the numbers.

**How would the system scale to more neighbourhoods?**
Run the same Overpass extract for another box, build another JSON, and add an area selector. The engine takes points, facilities and a box as inputs, so it does not change. For a whole city, precompute walking distances offline with a routing engine.

**What was built with AI assistance?**
Be specific and honest. See `submission/AI_DISCLOSURE.md` and correct it to match what you actually did.

**What limitations would you prioritise next?**
(1) Walking-network distance, (2) verifying facility status and adding the official municipal pool list, (3) real community input with consent, (4) more study areas, (5) a canal-corridor intervention type for the post-closure future.

## 4. Decisions you should make (and may change)

See `NEEDS_OWNER_INPUT.md`. In particular: the study area, the thresholds (1 km for swimming, 300 m for parks), the core/extended rules, and whether to keep “Hayal Park” in the core set.

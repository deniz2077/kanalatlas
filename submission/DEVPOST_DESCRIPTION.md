# Devpost description (draft — student must review, personalise and fill placeholders)

> Placeholders in [BRACKETS] must be replaced with genuine information or deleted. Do not fill them with invented details. Items marked *(optional)* can simply be deleted; the text reads complete without them.

## Inspiration

I live in Adana, in southern Türkiye, where summers are extremely hot. Open irrigation canals run straight through residential neighbourhoods, and some people, including children and teenagers according to local reports, go into them to cool off.

[STUDENT MUST DESCRIBE A REAL PERSONAL OBSERVATION OR RESEARCH EXPERIENCE: 2–3 factual sentences about what you have seen near a canal or why this matters to you. Strongly recommended for the Community Relevance score.]

This is not just a feeling. In June 2026, Adana Metropolitan Council approved a programme with local sports clubs to give free swimming lessons to children from low-income families. The council's written rationale names preventing drownings in unsafe places **such as irrigation canals** in the summer heat. The year before, the municipality reported free lessons for about 10,000 children in 26 pools. At the same time, the Ministry of Agriculture announced that the open canals running through the city centre will be replaced by closed, pressurised pipes, so the future of these canal corridors is changing.

What I noticed was an **information problem**. The swimming programmes exist, but their locations are not published in a way that shows whether a neighbourhood next to a canal has a pool nearby. And if a canal is eventually closed, nobody can easily compare where a new pool or park along that corridor would help most.

## What is the specific problem, and how do you know it's real?

**The problem:** In Adana's open-canal neighbourhoods, it is hard for residents and planners to see where public swimming and cooling options actually are, how far canal-side areas are from them, and where a new facility would help most, just as the canals themselves are set to be closed.

**How we know it's real (sources we read, with dates):**
1. **Adana Metropolitan Council decision no. 183, 12 June 2026.** It approves free swimming lessons via sports clubs. The rationale explicitly names drowning in unsafe places “such as irrigation canals” in the summer heat.
2. **Adana Metropolitan Municipality, 21 July 2025.** Free swimming lessons for about 10,000 children aged 6–14 in 26 semi-Olympic pools, aimed at reducing summer drownings. No pool locations are published.
3. **Ministry of Agriculture and Forestry (Adana), 10 September 2025.** The transition to closed pressurised irrigation has begun; open canals passing through the city centre will be taken out of service.
4. **OpenStreetMap (extracted 22 Oct 2026).** Our study area shows an open canal running through dense housing. Only 5 swimming facilities nearby have a name or swimming tag, and all of them lie in the north-west of the corridor.
5. *(optional)* [STUDENT MUST DESCRIBE A REAL PERSONAL OBSERVATION OR RESEARCH EXPERIENCE]
6. *(optional)* [STUDENT MUST ADD VERIFIED INTERVIEW INFORMATION IF AVAILABLE]

We deliberately do **not** quote drowning totals, because we could not confirm one with an official source and reporting period.

## What it does

KanalAtlas is a working geospatial decision-support prototype for one real study area: the open canal corridor in central Seyhan, Adana (about 5.5 × 2.6 km).

1. **Shows real data:** canals, swimming facilities and parks from OpenStreetMap, each with a link to its source and an honest status label. Nothing is called “open” or “public” without evidence; mapped facilities are labelled *MAPPED*.
2. **Measures access:** 72 sample points on a 500 m grid. For each one, KanalAtlas calculates the straight-line distance to the nearest mapped facility of the chosen type. Baseline: **13 of 72** sample points are within 1 km of a named or swimming-tagged pool.
3. **Tests “what if?”:** you place a hypothetical pool or park and **drag it**. Every point, line and number is recalculated live from coordinates. A “best location” button screens 1,456 candidate sites. A “why this result?” note explains the outcome (how many points it serves, how far it is from existing facilities).
4. **Compares fairly:** save locations A, B and C; they are re-evaluated with identical settings side by side. With real data, a pool in the east of the corridor reaches **27/72** points, while the same pool in the west reaches **21/72**.
5. **Asks “what if the canal closes?”** In the park view, one button turns the 6.82 km mapped canal line into a hypothetical linear park, with distance measured to the nearest point on the line. Park access within 300 m goes from **32/72 to 44/72** points (canal-side points: 12/27 → 24/27), while the best single new park reaches only 34/72. It is clearly labelled as an assumption: we do not claim the canal will close or that the land is available.
6. **Is honest about uncertainty:** a data-scope switch shows that counting unnamed (probably private) pools would raise the baseline from 13 to 44. How much you trust the data is itself a finding.
7. **Collects your priorities privately:** “Mahallen İçin Ne Önemli?” stores choices only in your browser. It is clearly labelled as personal input, not a survey.
8. **Creates a planning brief:** a Turkish PDF with the settings, sources, before/after tables, a map drawn from the same coordinates, the A/B comparison, method, limitations and questions to ask local planners.

**What can it tell you that a normal map can't?** A map shows where pools are. KanalAtlas tells you how many places in a neighbourhood are far from one, where one new facility would close the biggest gap, how that answer changes if you move it, and how confident you can be in the data.

## How we built it

TypeScript, Next.js 15, React 19, Tailwind CSS, Leaflet and pdfmake, with OpenStreetMap data extracted once through the Overpass API and committed to the repo.

- **Data pipeline:** classifies OSM records (core / extended / excluded), merges duplicate records within 30 m while keeping every source ID, and excludes pools tagged as private.
- **Scenario engine:** pure functions, separate from the UI. Haversine distance (R = 6,371,008.8 m); a hypothetical facility counts only if strictly closer; undefined baselines never produce fake percentages.
- **Testing:** 77 unit tests with hand-calculated expected values (for example, a three-point line where moving the pool from 2,200 m to 1,500 m changes the results from 2/3 to 3/3 within range). The tests render real PDFs and read them back to check the numbers. Playwright tests run the full journey on desktop and mobile against the production build, including downloading and parsing the PDF.
- **Accessibility:** zero axe-core WCAG 2.1 A/AA violations in automated audits (desktop and mobile, with and without a scenario); a tested keyboard-only journey; Turkish-first; keyboard alternatives for every map action; a full text table instead of the map, labelled forms, visible focus, live-region announcements, and no meaning conveyed by colour alone.

[STUDENT MUST CONFIRM TECHNICAL CONTRIBUTIONS — describe what you personally designed, decided, reviewed, tested or changed. The project was built with substantial AI coding assistance; see the AI disclosure.]

## Challenges we ran into

- **Honest data vs. impressive data.** Most mapped pools are unnamed polygons inside apartment complexes. Counting them makes access look three times better, so we made the choice visible instead of hiding it.
- **A fair metric.** Real walking routes were out of reach in the time available. We used straight-line distance and say so on every screen and in the PDF.
- **Testing our own claims.** In browser testing, a location dragged by hand beat our “best location” button. We fixed the algorithm to screen a 100 m candidate grid.
- **Mobile.** Touch-dragging a map marker couldn't be verified in automated tests, so we added tap-to-move and arrow buttons that we could verify.

## Accomplishments that we're proud of

- Every number on screen and in the PDF comes from one tested function using real coordinates.
- The tool says clearly what it does *not* know.
- The full journey is tested in a real browser on desktop and mobile, from the map to the downloaded PDF.

## What we learned

*Draft based on what happened during the build; rewrite it in your own words:* Open data needs to be read critically. The same OpenStreetMap query can make access look three times better or worse depending on which records you trust. A simple, honest metric (straight-line distance, clearly labelled) beats an impressive but unverified one. And testing the claims, not just the code, matters: our own browser test found a location that beat our “best location” button, which made us improve the algorithm. [STUDENT: add one thing you personally learned.]

## What's next for KanalAtlas

Walking-network distances; verifying facilities against the official municipal pool list; a consent-based way for residents to submit priorities; more Adana neighbourhoods; and richer corridor scenarios (only some sections closing, shade, or water-play points along the route).

## Important limitations

Straight-line distance is not walking distance. Sample points are not people (no population data is used). Facility operating status and public access are not verified. KanalAtlas does not predict drowning risk, does not claim any canal will close, and does not assess land availability or cost. One study area only. No community input has been collected yet.

## AI assistance disclosure (required by the rules)

KanalAtlas was built with substantial help from an AI coding assistant, **Claude Code (Anthropic)**. I defined the problem, scope, honesty rules and requirements, and directed and reviewed the work. The AI agent wrote most of the code, tests, data-processing scripts and documentation drafts, and recorded an automated demo walkthrough of the real app. [STUDENT: describe what you personally reviewed, tested, changed or wrote.] No data, results, interviews or community responses were generated by AI; all facts come from the cited sources and OpenStreetMap. Full details: `submission/AI_DISCLOSURE.md` in the repository.

## Sources

- Adana Büyükşehir Belediye Meclisi, decision 67597785-105.04/183, 12.06.2026: https://www.adana.bel.tr/panel/uploads/mecliskararlari_v/files/2026-haziran-ayi-pdf.pdf
- Adana Büyükşehir Belediyesi, 21.07.2025: https://www.adana.bel.tr/tr/haber/27-bin-684-cocuga-ucretsiz-spor-egitimi-veriliyor
- T.C. Tarım ve Orman Bakanlığı (Adana), 10.09.2025: https://egitim.tarimorman.gov.tr/adana/Haber/1162/Adana-Tariminda-Yeni-Donem-Basliyor-Acik-Sulama-Kanallari-Tarihe-Karisiyor-Kapali-Basincli-Sulama-Sistemine-Geciliyor
- Map data © OpenStreetMap contributors (ODbL), extracted 22.10.2026.

**Links:** Live demo: [STUDENT: add tested URL after deployment] · Code: [STUDENT: add public GitHub URL] · Video: [STUDENT: add YouTube/Vimeo URL]

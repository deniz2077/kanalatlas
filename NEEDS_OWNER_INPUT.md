# Decisions and inputs needed from the owner

None of these blocked the build: a safe default was chosen for each. Please review.

| # | Question | Why it matters | Default chosen | If you answer differently |
|---|---|---|---|---|
| 1 | **Is the Seyhan central canal corridor the right study area?** | Community relevance depends on a place you know | Chosen for data availability (`docs/STUDY_AREA.md`) | Change the bbox in `scripts/build-dataset.ts`, re-run the Overpass query (`data/raw/q_study.txt`), `npm run data:build`, update the docs |
| 2 | **Your genuine personal observation / any real conversations** | The biggest gap for Community Relevance | Placeholders only | Fill in `docs/COMMUNITY_RESEARCH_TEMPLATE.md` and the description placeholders |
| 3 | **Swimming threshold 1 km, park threshold 300 m (defaults)** | Headline numbers depend on them | 1 km is a round, explainable radius; 300 m follows common “green space nearby” guidance | Edit `DEFAULT_THRESHOLD` in `src/lib/insights.ts` |
| 4 | **Should “Hayal Park” (a covered pool with a commercial-looking operator tag) count as core?** | It is one of only 5 core pools | Kept as core (named) but labelled MAPPED | Add an exclusion rule in `classify()` and document why |
| 5 | **Core park rule: named or ≥ 5,000 m²** | Affects park results | Default as stated | Change `PARK_CORE_MIN_AREA_M2` in `src/lib/facilities.ts` |
| 6 | **Can you confirm any facility is open and public?** | Would allow VERIFIED labels | None verified | Record the source in `docs/EVIDENCE.md`; add an override list in the build script |
| 7 | **Licence: MIT** | Public repo requirement | MIT for code; ODbL attribution for data | Replace `LICENSE` |
| 8 | **GitHub account / repo name** | Required public repo | Suggested name: `kanalatlas` | See `MORNING_READ_ME_FIRST.md` §B |
| 9 | **Hosting** | A live URL helps judges | GitHub Pages workflow prepared and tested locally; Vercel also possible | See `MORNING_READ_ME_FIRST.md` §B |
| 10 | **Video: your voice or captions only?** | Presentation score | Silent captioned draft recorded | Record a voice-over (`submission/DEMO_SCRIPT.md`) |
| 11 | **Basemap: OSM Foundation tiles** | Their usage policy is for light use | Fine for a hackathon demo | For heavy traffic, use a provider with a key |
| 12 | **Touch-drag on your real phone works?** | Not verifiable in automation | Tap-to-move added as a verified alternative | Report the result in `BUILD_STATUS.md` |
| 13 | **Allow Claude to use the iOS Simulator?** | Lets touch-drag be verified in mobile Safari | Not granted (a request was pending while you were away) | Click “Let Claude use it” in the simulator panel, then ask for the test |

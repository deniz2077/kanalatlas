# Final judge report (acceptance test by the AI assistant)

Performed on 23 Oct 2026, around 00:30–01:00 Türkiye time, on the **local production build**. There was no deployed URL to test.

## What makes KanalAtlas distinctive

It links a documented local safety concern (canal drowning, named in a June 2026 council decision) with access to public swimming and cooling options and with a planned infrastructure change (closing city-centre canals). It turns that into an **interactive, testable comparison**: drag a proposed pool and watch sampled locations re-route to it, compare sites under one method, and see how much the answer depends on which data you trust.

## What genuinely works (verified by automated browser tests and screenshots)

- Real OSM map of the Seyhan canal corridor; every facility links to its source.
- Baseline 13/72 points within 1 km of a core swimming facility (same value in the unit-tested engine, the proof script and the E2E check).
- Add hypothetical (best-location button, map click, tap-to-move), drag with live updates, nudge with arrows. An outside placement is rejected with a message.
- A/B comparison table; data-scope and threshold changes alter the numbers.
- Priorities form with validation; local-only storage.
- PDF downloads, and its extracted text contains the on-screen coordinates and values.
- Mobile viewport: full journey passes; no horizontal scroll.
- No page or console errors during the journey.
- Canal corridor as a hypothetical linear park (parks within 300 m: 32 → 44 of 72); the PDF contains the corridor scenario.
- Runs in Desktop Chrome, Android Chromium and the iPhone Safari engine (WebKit); touch-drag of the marker verified with native TouchEvents.
- Keyboard-only journey passes; axe-core finds 0 WCAG 2.1 A/AA violations (desktop and mobile).

## Technical evidence

`docs/PROOF_OF_FUNCTIONALITY.md`, `docs/test-output/` (raw outputs), `docs/PROOF_RUN_OUTPUT.md` (real-data A/B), `docs/screenshots/`, `docs/sample-report.pdf`, and the demo video draft.

## Community evidence

Three verified official sources (two council decisions of 12.06.2026 and the municipal news of 21.07.2025) plus the ministry announcement of 10.09.2025. One local news item is marked REQUIRES CONFIRMATION, and its unattributed death figure is not used. **No first-hand community evidence yet.**

## Weaknesses that remain

1. No personal observation or community input (owner must add genuine material).
2. Straight-line distance only; one study area; no population weighting.
3. Facility operating status unverified; the baseline is sensitive to data scope (13 vs 44).
4. Touch-drag verified in emulation (native TouchEvents) but not on a physical device; no screen-reader test.
5. Silent demo video (captions only).

## Actual submission readiness

| Requirement | Ready? |
|---|---|
| Working project | **Yes** (locally) |
| Name / pitch / description / tech / challenges / next steps | **Drafts ready**; placeholders need the owner |
| 2–6 min demo video | **Draft file exists** (≈ 3:48); not uploaded; no narration |
| Public repository | **Yes**: https://github.com/deniz2077/kanalatlas |
| AI disclosure | **Draft**; the owner must correct it |
| Live URL (optional) | **Yes**: https://deniz2077.github.io/kanalatlas/, with 14/17 browser tests passing against it |

**Verdict:** The software is ready to demonstrate. The **submission is not yet complete**: it needs the repo link, an uploaded video, the owner's genuine input, and a corrected disclosure. All of these are owner actions and are listed in `MORNING_READ_ME_FIRST.md`.

## Outstanding actions requiring the owner

Publish the repo → deploy and test the URL → review the code and do the hand calculation → add a genuine observation → fill the placeholders → correct the AI disclosure → narrate or record the video and upload it → submit on Devpost.

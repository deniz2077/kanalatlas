# ☀️ READ ME FIRST

Deniz, this is the honest state of KanalAtlas as of **23 Oct 2026, evening (Türkiye time)**. The Devpost deadline is **24 Oct, 08:00 TRT**; confirm it on the Devpost countdown. Nothing has been submitted for you.

## A. Status

### ✅ Done and verified
- **Live site:** https://deniz2077.github.io/kanalatlas/. It is deployed by GitHub Actions on every push, and all 17 browser tests pass against the live URL.
- **Public repo:** https://github.com/deniz2077/kanalatlas
- **App:** a question headline, then a guided 3-step flow (explore the baseline → test a solution → compare & share).
  - “Find a promising location” screens 1,456 candidate sites.
  - You can drag the hypothetical facility or tap to move it; BEFORE / AFTER / CHANGE tiles show the effect.
  - A/B/C comparison and the canal line as a hypothetical linear park.
  - A local-only priorities form and a PDF brief in the UI language.
  - English by default, with a TR toggle.
- **Tests:** 79 unit and 17 E2E (Desktop Chrome, Android Chromium, iPhone WebKit; 4 skipped by design). axe reports 0 WCAG A/AA violations. Typecheck, lint and build pass.
- **Demo video:** `submission/video/kanalatlas-demo.mp4`, about 4:44, 1280×720, recorded from the real app.
  - English voice-over by the Kokoro text-to-speech model (voice “am_michael”), with subtitles.
  - The recorder aborts if any spoken number differs from what the app showed.
  - See `submission/VIDEO_STATUS.md` for the upload state.

### 🟡 Not verified
- Touch-drag on a physical phone: it is verified with native TouchEvents in mobile Chromium, but not on a real device. Please try it.
- Screen reader (VoiceOver) use.

### ❌ Only you can do
- Watch and listen to the video once (pronunciation, pacing).
- Add a genuine personal observation if you have one (`docs/COMMUNITY_RESEARCH_TEMPLATE.md`). Never invent one.
- Read `submission/AI_DISCLOSURE.md` and confirm it is accurate.
- **Submit on Devpost yourself**, pasting from `submission/`.

## B. Run it locally

```bash
cd ~/Documents/kanalatlas
export PATH=~/.local/node/bin:$PATH
npm run dev          # → http://localhost:3000
npm test             # unit tests
npm run e2e          # browser tests (builds first)
```

## C. Devpost copy-paste map

| Field | Source |
|---|---|
| Project name | `submission/PROJECT_NAME.md` |
| Elevator pitch | `submission/ELEVATOR_PITCH.md` |
| **Every Devpost field, paste-ready** | `submission/DEVPOST_FORM.md` |
| Description (problem evidence, what it does, AI disclosure, links) | `submission/DEVPOST_DESCRIPTION.md` |
| Built with | `submission/TECH_STACK.md` |
| Challenges | `submission/CHALLENGES.md` |
| Next steps | `submission/FUTURE_WORK.md` |
| Gallery (English, 3:2) | `submission/gallery/` |
| Sample PDF | `docs/sample-report.pdf` |
| Repo | https://github.com/deniz2077/kanalatlas |
| Live demo | https://deniz2077.github.io/kanalatlas/ |
| Video | https://youtu.be/CL7fIi5G-mE (Unlisted) |

## D. Remaining risks

1. Judges may read straight-line distance as walking distance. The app, video and description all say “straight line”.
2. There is no first-hand community input. The description says so honestly.
3. The OSM tile server could be slow; the analysis still works without tiles.

Other files: `BUILD_STATUS.md`, `FINAL_JUDGE_REPORT.md`, `docs/PROOF_OF_FUNCTIONALITY.md`, `docs/OWNER_REVIEW.md`.

# Submission checklist — Neighborhood Hacks 2026

Rules: https://neighborhoodhacks.org/rules/. The development window is **16–23 October 2026 (CST)**. The Devpost deadline should be confirmed on the Devpost countdown; the owner's note says **24 Oct 2026, 08:00 Türkiye time** (= 23 Oct, 23:59 CDT).

| # | Requirement | Where | Status |
|---|---|---|---|
| 1 | Project name | `submission/PROJECT_NAME.md` | ✅ Draft ready |
| 2 | Elevator pitch | `submission/ELEVATOR_PITCH.md` | ✅ Draft ready (≈ 180 chars) |
| 3 | Full description | `submission/DEVPOST_DESCRIPTION.md` | ✅ Ready |
| 4 | “What is the specific problem, and how do you know it's real?” | Section in the description | ✅ Sources + your answer (heard from people around you) |
| 5 | What it does | Description | ✅ |
| 6 | Technologies | `submission/TECH_STACK.md` | ✅ (Devpost “Built with” tags: typescript, nextjs, react, tailwindcss, leaflet, openstreetmap, pdfmake, vitest, playwright) |
| 7 | Challenges & lessons | `submission/CHALLENGES.md` | ✅ Ready (edit freely) |
| 8 | Next steps | `submission/FUTURE_WORK.md` | ✅ Draft |
| 9 | Demo video 2–6 min | `submission/video/kanalatlas-demo.mp4`; link in `VIDEO_STATUS.md` | ✅ ≈ 4:44, narrated, subtitled |
| 10 | Public code repository | https://github.com/deniz2077/kanalatlas | ✅ Public, pushed 23 Oct 2026 |
| 11 | AI-use disclosure in the written description | Description § “AI assistance disclosure” + `AI_DISCLOSURE.md` | ✅ Short and accurate, based on your answers |
| 12 | Live demo URL (optional but strongly recommended) | https://deniz2077.github.io/kanalatlas/ | ✅ Deployed by GitHub Actions; all 17 browser tests pass against it |
| 13 | Original work during the window | git history: first commit 22 Oct 2026 23:46 TRT | ✅ Owner to confirm |

## Final pre-submit checks (owner)

- [ ] The video link in `DEVPOST_DESCRIPTION.md` is the current narrated English version.
- [ ] Every number in the text matches the app (13/72 baseline; 27/72 east; 21/72 west in the proof run; 44/72 with unnamed pools).
- [ ] The repository is public, the README renders, and there are no secrets (none are used by the project).
- [ ] The video link plays in a logged-out browser.
- [ ] The live URL (if any) works on a phone.
- [ ] The AI disclosure honestly reflects who did what.

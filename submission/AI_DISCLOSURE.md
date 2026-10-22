# AI assistance disclosure (DRAFT — the student must review and correct this)

> This draft was written by the AI assistant that did most of the implementation. It describes what the AI did during the build session of 22–23 October 2026. **The student must edit this to accurately describe their own contributions** and must not claim AI-written work as independently authored.

## Tool used

- **Claude Code** (Anthropic, model Claude Opus 5.5), an AI coding agent running in the Claude desktop app with access to the project folder, a terminal and web search/fetch.

## What the student did

[STUDENT MUST CONFIRM TECHNICAL CONTRIBUTIONS]

- Chose the problem (Adana's open irrigation canals, drowning concern and swimming access) from personal experience as a resident: [STUDENT: describe].
- Wrote the detailed project brief and constraints that the AI followed (scope, honesty rules, rubric priorities, required deliverables).
- Selected the starting sources (municipal swimming news, council decision PDF, ministry announcement).
- [STUDENT: list what you reviewed, tested, changed or rewrote yourself after the session, e.g. code you modified, decisions you overturned, text you rewrote, the voice-over you recorded.]

## What the AI assistant did (during this session)

- **Research:** read the three starting sources and found two more (a second June 2026 council decision and a local news report), extracted the council PDF text, and wrote the evidence ledger with status labels.
- **Data:** wrote and ran the one-time Overpass queries, chose the study area based on data availability, and wrote the classification and duplicate-merge logic and the build script.
- **Code:** wrote essentially all application code (scenario engine, geometry, React UI, Leaflet map, priorities form, PDF report), configuration and scripts.
- **Tests:** wrote the 71 unit tests (with hand-calculated expected values) and the Playwright E2E tests, ran them, and fixed the failures they revealed.
- **Design:** chose the visual design, colours, layout and the original SVG illustration.
- **Writing:** drafted the README, all docs and these submission texts, including placeholders where the student's own experience is required.
- **Demo video:** wrote a Playwright script that records a captioned walkthrough of the real running app (no voice).

## What the AI did not do

- It did not invent interviews, community responses, statistics or results. Placeholders mark where the student's genuine input is needed.
- It did not deploy the app, publish the repository or submit anything to Devpost.

## Honest summary for Devpost (edit before use)

> KanalAtlas was built with substantial AI assistance. I defined the problem, scope, constraints and requirements, and directed the work; an AI coding agent (Claude Code) wrote most of the code, tests and documentation drafts under that direction. I then [STUDENT: describe your review, testing, modifications and own work]. All data comes from cited public sources and OpenStreetMap; no results or community input were fabricated.

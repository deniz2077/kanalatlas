# Skeptical judge review (self-assessment)

Written by the AI assistant after building and testing the prototype, to find weaknesses before the judges do. These are **not** predicted scores, only an honest view of strengths and gaps per rubric category.

## Community relevance (25%)

**Strong:** The problem is specific and documented. An official June 2026 council decision names drowning in irrigation canals as a reason for free swimming lessons. The ministry has announced that city-centre open canals will be closed. The study area is a real canal corridor in Seyhan.

**Weak:** There is **no first-hand community input yet**: no interviews, no personal observation in the text, no local partner. A community-impact judge will ask, “What do people there say?” The submission currently has placeholders, which is honest but costs points.
→ *Biggest single improvement available: the owner adds genuine observations or 2–3 short real conversations (COMMUNITY_RESEARCH_TEMPLATE.md).*

## Impact potential (20%)

**Strong:** A clear path from output to decision. The tool shows that the five core mapped pools (named or swimming-tagged) all lie in the north-west of the corridor and the eastern corridor is the gap. It ranks candidate sites and produces a brief a resident could bring to a muhtar or municipal meeting.

**Weak:** No adoption, no stakeholder feedback, and one study area. The facility data is unverified, so a planner could dismiss the baseline (“there's a pool you didn't map”). The scope switch shows the result is sensitive (13 → 44 points).
→ Verify the 5 core facilities and add the municipal summer-pool list if one can be found.

## Technical execution (20%)

**Strong:**
- Pure, tested engine (79 unit tests with hand-derived values), with a worked example in the docs.
- Live recalculation while dragging; A/B comparison re-evaluated under identical settings.
- PDF tested by rendering and parsing real PDFs, including the one the browser downloads.
- E2E on desktop and mobile against the production build; a reproducible data pipeline with raw data committed.

**Weak / a skeptical engineer would say:**
- “Straight-line distance across a canal and a railway isn't access.” True, and acknowledged. Network distance is the obvious next step.
- “A 500 m grid of 72 points is coarse.” It is a deliberate choice for auditability; the spacing is a single constant.
- “Centroid distance to large parks overestimates.” Documented.
- Touch-drag is verified in emulation with native TouchEvents, but not on a physical device. Tap-to-move is the fallback.
- No deployment URL yet, so judges must run it locally unless the owner deploys.

## Creativity (15%)

**Strong:** The link between canal drowning risk, swimming access and the canal-closure transition is unusual and local. The distinctive interaction is dragging a proposed pool and watching amber “nearest facility” lines and counts re-route live, plus the “best location” screening and the “why this result” explanation. Treating data trust as a visible variable (the scope switch) is also uncommon.

**Added after the first review:** a “Kanal kapatılırsa ne olur?” scenario turns the mapped canal line into a hypothetical linear park, evaluated by the same engine with point-to-polyline distance (parks within 300 m: 32 → 44 of 72; canal belt 12 → 24 of 27).

**Weak:** On first glance the visual language is still close to a standard map dashboard. The corridor scenario uses the whole mapped line; choosing individual sections is not supported.

## Presentation and clarity (10%)

**Strong:** An English-by-default landing page (with a Turkish toggle for residents) that states the problem with sources in the first screen; a bilingual captioned demo video (about 3:48) recorded from the real app; extensive docs.

**Weak:** The automated video has captions but **no voice**. Judges often respond better to the student explaining in their own voice. The page is long; a judge may not scroll to the method section.
→ The owner should record narration over the video or re-record live (`submission/DEMO_SCRIPT.md`).

## Accessibility (10%)

**Strong:** Turkish language, keyboard paths for every map action (best-location button, 100 m arrow buttons, tap-to-move), a full text-table alternative, labelled forms, visible focus, `aria-live` announcements, information not conveyed by colour alone (filled vs hollow points, text “Evet/Hayır”), reduced-motion support, no horizontal scroll on mobile, 44 px touch targets for main controls.

**Measured:** axe-core 4.14 WCAG 2.0/2.1 A + AA audit: **0 violations**, on desktop and mobile, both on first load and with an active scenario (`docs/test-output/a11y-*.txt`). It found one serious issue (unfocusable scroll regions), which was fixed. A keyboard-only E2E journey passes.

**Weak:** Not tested with VoiceOver/NVDA (axe does not replace a real screen-reader test); there is no English UI toggle (only an English summary section). Map tooltips are mouse/hover-oriented.

## Top three weaknesses to fix (in priority order)

1. **Missing genuine community voice** → owner action (cannot be generated).
2. **No public URL / repository** → owner action (needs accounts); about 10 minutes with the commands in `MORNING_READ_ME_FIRST.md`.
3. **Video without narration** → owner records a voice-over or a live run-through.

Engineering weaknesses fixed during this session (documented in `ENGINEERING_DECISIONS.md`): a basemap that required an API key, a suggestion grid a hand-placed site could beat, the map not re-centring after layout changes, no way to return to the study area, the PDF missing the “→” glyph, and mobile users unable to move a facility without dragging.

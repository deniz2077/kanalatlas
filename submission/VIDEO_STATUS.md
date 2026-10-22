# Demo video status

| Item | Status |
|---|---|
| Automated captioned walkthrough of the real app | **EXISTS (draft):** `submission/video/kanalatlas-demo-draft.webm`, 1280×720, about 3 min 25 s, WebM/VP8, no audio, about 48 MB. Recorded 23 Oct 2026 by `npm run demo:record` against the production build. Not committed to git (size). Regenerate with `npm run build && npm run demo:record`. |
| Narration in the student's voice | **NOT DONE**, owner action |
| MP4 export | **NOT DONE**: no full ffmpeg on this machine. YouTube and Vimeo accept WebM directly. |
| Uploaded to YouTube/Vimeo | **NOT DONE**, owner action |
| URL added to Devpost | **NOT DONE**, owner action |

## What the draft video shows (all real interactions)

Landing → evidence cards → computed baseline → real map with canal and grid → facility popup with OSM source → data-scope sensitivity (13 → 44) → recentre → “best location” hypothetical (13 → 27, +14) → save A → drag to the west (live recalculation; the result is read from the screen) → “why this result?” → save B → comparison table → text-table alternative → priorities form → PDF generated and downloaded → the downloaded PDF rendered with pdf.js and scrolled → limitations → next steps.

Captions are bilingual (TR/EN) and their numbers are read from the live page, not typed in. The script aborts if the drag does not move the marker.

## Recommendation

Judges usually prefer the student's own voice. Either record a voice-over on top of the draft (iMovie: import the .webm, add a voice-over track) or record a live run-through using `DEMO_SCRIPT.md` and `SHOT_LIST.md`. Keep it between 2 and 6 minutes.

# Demo video status

| Item | Status |
|---|---|
| Finished demo video | **EXISTS:** `submission/video/kanalatlas-demo.mp4`: H.264 MP4, 1280×720, 30 fps, 3:51, about 35 MB, no audio. Recorded 23 Oct 2026 by `npm run demo:record`, which drives the real production build and encodes Chrome's screencast frames with WebCodecs. Not committed to git (size); regenerate with `npm run build && npm run demo:record`. |
| Narration | None. Bilingual on-screen captions (TR/EN) explain every step; their numbers are read from the live page. |
| Uploaded to YouTube | Pending the owner's confirmation |
| URL added to Devpost text | Pending |

## Contents (all real interactions with the running app)

Title card → landing and sourced evidence → computed baseline (13/72) → real map with canal and grid → facility popup with OSM source → data-scope sensitivity (13 → 44) → recentre → “best location” hypothetical (13 → 27, +14) → save A → live drag west (13 → 24, +11) → “why this result?” → save B → A/B comparison → text-table alternative → park view: canal line as a hypothetical linear park (32 → 44) → private priorities form → real PDF generated, downloaded and opened → limitations and next steps → end card with live demo and code links.

The script aborts if the drag does not move the marker, so a caption can never claim a change that did not happen.

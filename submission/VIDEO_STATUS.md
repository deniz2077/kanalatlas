# Demo video status

| Item | Status |
|---|---|
| Finished demo video | `submission/video/kanalatlas-demo.mp4`: H.264 + AAC, 1280×720, 30 fps, 4:44, ≈ 42 MB. Recorded 23 Oct 2026 by `npm run demo:record` from the production build of the current (guided 3-step, English) app. Not committed to git (size). |
| Upload copy | `submission/video/kanalatlas-demo-upload.mp4`: same frames and audio, 24 fps, ≈ 7.4 MB (`node scripts/reencode-upload.mjs` re-encodes it from the last recording). |
| Narration | English voice-over by the open-source Kokoro text-to-speech model (voice “am_michael”), run locally, with hand-set pronunciation for KanalAtlas, Adana, Seyhan and neighbourhood names. Subtitles show the same sentences. The title and end cards say the narration is a computer-generated voice. |
| Number check | The recorder runs the walkthrough twice: a silent rehearsal collects every sentence with the live numbers, then the recording pass aborts if any sentence differs (“narration mismatch”). It also aborts if a drag does not move the marker. |
| Uploaded to YouTube | **Not yet** (waiting for the owner's OK). The older silent Turkish version is still at https://youtu.be/dLlOJlkT4So and is outdated. |
| URL in Devpost text | Still the old link until the new upload exists. |

## Contents (all real interactions with the running app)

Title card → question headline and sourced evidence → baseline (13/72 within 1 km) → map with canal, grid and facility popup → Advanced settings: data scope (13 → 44) → “Find a promising location” (13 → 27, BEFORE/AFTER/CHANGE tiles) → save A → live drag west → save B → A/B comparison and text table → park view: canal line as a hypothetical linear park (32 → 44) → local-only priorities → PDF generated and opened → Turkish toggle → limitations → next steps → end card with links.

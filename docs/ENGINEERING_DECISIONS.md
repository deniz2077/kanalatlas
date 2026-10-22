# Engineering decisions and trade-offs

Each entry gives the decision, the alternatives, and the reason. The owner should review and may overturn any of them; see `NEEDS_OWNER_INPUT.md`.

1. **One study area, done properly.** Alternative: the whole city. Reason: a city-wide map with unverified data would look bigger and be less defensible. One corridor with 72 auditable points can be checked by a judge in minutes.

2. **A static dataset extracted once from Overpass.** Alternative: live Overpass queries. Reason: public Overpass servers are rate-limited and sometimes overloaded, and live data would make results non-reproducible. The raw response, query and timestamp are committed, so `npm run data:build` reproduces the shipped JSON.

3. **Straight-line (Haversine) distance, labelled as such everywhere.** Alternative: pedestrian routing. Reason: there was not enough time to build and verify routing correctly; a wrong walking time would be worse than an honest straight-line distance. Every screen, the PDF footer and the docs say “kuş uçuşu / düz çizgi”.

4. **Sample grid instead of population.** Alternative: population-weighted points. Reason: we have no reliable small-area population data for this box, so we report “X of 72 sampled map locations” and never “residents”.

5. **Data tiers and a visible scope switch.** Many OSM pools are unnamed polygons inside apartment complexes. Counting them as public would inflate access (44/72 within 1 km); ignoring every unnamed record might miss real public pools. We show both: core by default, “all mapped” as a sensitivity check. Records tagged `access=private/customers` are always excluded.

6. **Duplicate merging (30 m, same category).** OSM often has a node and a polygon for the same pool. Without merging, duplicates would not change nearest distances, but they would inflate counts and confuse the facility list. A merged record keeps every source id. If any member is access-restricted, the merged record is excluded and flagged REQUIRES CONFIRMATION.

7. **Polygon centroid as a facility's location.** Alternative: distance to the polygon edge. Reason: simpler to verify. For large parks this overestimates distance by up to the park's radius (documented limitation).

8. **Ties keep the existing facility.** A hypothetical facility counts as nearest only if strictly closer, so placing one on top of an existing pool shows “no change” instead of claiming an improvement.

9. **Saved scenarios are re-evaluated with current settings.** This guarantees A/B comparisons use the same method even if the user changes the threshold after saving.

10. **Suggestions screen a 100 m candidate grid.** The first version used the 72 sample points as candidates, and a hand-placed location beat the “best” one during E2E testing. The finer grid (1,456 candidates, about 13 ms) fixed that, and the method is described in the UI.

11. **Tap-to-move in addition to dragging.** In mobile emulation, Leaflet marker dragging could not be driven by automated touch events: the gesture panned the map. Rather than claim untested touch-drag, we added a “Haritada yeni konum seç” (pick new location on map) button plus 100 m arrow buttons. These were verified on a mobile viewport and are also keyboard-accessible.

12. **Local-only priorities.** No authorised backend credentials existed, and collecting community data needs consent, moderation and a privacy notice. The form stores data only in localStorage and labels it “personal input, not a survey”.

13. **pdfmake for the PDF.** jsPDF's default fonts lack Turkish glyphs; pdfmake ships Roboto, which covers them. The report is a pure function of state, so it is tested by rendering real PDFs in Node and checking their text. We found and fixed one glyph Roboto lacks (“→”).

14. **Schematic SVG instead of a map screenshot.** Capturing Leaflet tiles into a PDF is unreliable (CORS, timing). The PDF map is drawn from the same coordinates as the app.

15. **Basemap: OSM tiles, greyed with CSS.** The first choice, CARTO Positron, now requires an API key and showed “API KEY REQUIRED” tiles; screenshot review caught this. We switched to the OSM Foundation tile server, which is acceptable for low-traffic demos with attribution. For real deployment, configure a provider with a key.

16. **Next.js 15 (not 16).** We used the stable major that `create-next-app@15` installs, to avoid spending deadline time on framework churn.

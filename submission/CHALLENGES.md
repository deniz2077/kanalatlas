# Challenges and lessons learned

> Draft. [STUDENT MUST CONFIRM TECHNICAL CONTRIBUTIONS] and rewrite in your own voice; add any challenges you personally ran into.

**1. Honest data is harder than more data.** OpenStreetMap had 42 swimming-pool records in our area, but most are unnamed polygons inside apartment complexes. Counting them gives 44 of 72 sample points within 1 km of a pool; counting only named or swimming-tagged records gives 13. Instead of hiding this, we made the data scope a visible switch and labelled every facility MAPPED rather than “public”.

**2. Defining a fair metric.** Real walking routes would be best, but building and verifying routing in the time available was not realistic, and a wrong walking time would be worse than an honest straight-line distance. We used Haversine distance, labelled it everywhere, and reported “sampled map locations” instead of “residents”, because we have no population data.

**3. Our own tests caught our own claims.** The first “best location” button only tested the 72 sample points. During browser testing, a location we dragged by hand beat the “best” one. We switched to screening a 100 m grid of 1,456 candidates. Lesson: test the claim, not just the code.

**4. Things that look fine in code can be broken on screen.** The first basemap provider began requiring an API key, and the tiles showed “API KEY REQUIRED”. Tests passed because they checked for map elements, not pixels. Reviewing real screenshots caught it, and we now also test that tile images actually load.

**5. Mobile interaction.** Dragging a marker by touch could not be reliably automated in an emulated phone (the gesture panned the map). Rather than claim it works, we added a tap-to-move button and 100 m arrow buttons, which we could verify, and which also help keyboard users.

**6. Turkish in PDFs.** Many PDF libraries' default fonts cannot draw ı, ğ, ş, İ. We used pdfmake with Roboto, and discovered by rendering the PDF that one symbol (→) was missing, so we removed it from the report text.

**7. Writing without overclaiming.** The hardest writing rule was not to say more than the evidence supports: no drowning totals we could not verify, no claim that a specific canal will close, no “residents served”.

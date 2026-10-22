# Demo video script (target ≈ 4:00; allowed 2–6 min)

Record the **real running app** (local `npm run dev` or the deployed URL). Narrate in your own voice (Turkish or English; English subtitles help international judges). Every sentence below describes behaviour that has been tested. If something behaves differently when you record, describe what actually happens.

An automated, captioned, silent draft already exists: `submission/video/kanalatlas-demo-draft.webm` (about 3:48, recorded by `npm run demo:record`). You can (a) add your voice-over to it, or (b) use this script to record yourself live, which is recommended.

---

### 0:00–0:30 · The problem
*Screen: landing page → scroll to the three evidence cards.*

> “I'm Deniz, a high-school student in Adana, Türkiye. In our summers, open irrigation canals run right through neighbourhoods, and people go in to cool off. [ONE SENTENCE OF YOUR OWN REAL EXPERIENCE.] This isn't just my impression: in June 2026 our metropolitan council wrote that its free swimming lessons aim to prevent drownings in places like irrigation canals. And the government has announced these city-centre canals will be closed and piped. So two questions: where are swimming and park options today, and where would a new one help most?”

### 0:30–1:15 · The map and the data
*Screen: scroll to the map. Hover over the canal; click a green “H” facility marker to open its popup; press “Alanı ortala”.*

> “This is a real canal corridor in Seyhan. The blue line is the canal from OpenStreetMap; the dashed box is my study area. Each circle is a sample location on a 500-metre grid. These are map points, not people. Green markers are mapped swimming facilities, and each links to its OpenStreetMap source. They're labelled ‘mapped’, not ‘public’, because I couldn't verify they're open.”

*Switch “Veri kapsamı” to “Tüm haritalanmış”, then back.*

> “Only 13 of 72 points are within 1 km straight-line of a named pool. If I also count unnamed pools, which are mostly private apartment-complex pools, it jumps to 44. So how much you trust the data is itself a result.”

### 1:15–2:30 · The scenario engine
*Click “En çok fayda sağlayan konuma ekle”.*

> “Now a hypothetical pool. This button checks 1,456 possible sites and picks the one that brings the most points within 1 km. 13 becomes 27. The orange lines show which points now have this pool as their nearest.”

*Click “Bu senaryoyu kaydet”. Drag the orange marker slowly west; pause while numbers change.*

> “Watch what happens when I drag it. Every move recalculates from coordinates using the Haversine formula. Over here in the west it only reaches about 21–25. The ‘why this result?’ box explains how many points it serves and how far it is from existing pools.”

*Click “Bu senaryoyu kaydet” again → scroll to the comparison table.*

> “Saved scenarios are recalculated with the same settings so the comparison is fair. Location A wins on this metric, but it's a ranking rule, not a decision. It doesn't know about land or cost.”

*(Optional, 10 s) Open “Harita yerine tablo”.*

> “Everything is also available as a table for people who can't use a map.”

### 2:30–2:55 · “What if the canal closes?”
*Click “Park / yeşil alan”, then “Kanal hattını doğrusal parka dönüştür”. Pause on the map and headline.*

> “The government plans to close these city-centre canals. So what if this canal line became a linear park? This button measures that: for parks within 300 metres, access goes from 32 to 44 of 72 points, and for points right next to the canal it doubles. It's a ‘what if’: I'm not claiming the canal will close or that the land is free.”

*Click “Yüzme tesisi” to return.*

### 2:55–3:20 · Priorities
*Scroll to “Mahallen İçin Ne Önemli?”. Choose a neighbourhood, a priority and barriers; press save.*

> “Residents can add their own priorities. This is not a fake survey: it stays only in your browser, with no names or addresses, and it's labelled as personal input in the report.”

### 3:20–3:50 · The PDF
*Scroll to “Rapor”; click “PDF raporu oluştur ve indir”; open the downloaded file and scroll through it.*

> “The report is generated from exactly what's on screen: settings, sources and their status, the before/after table, a map drawn from the same coordinates, my A/B comparison, my priorities, the method and the limitations.”

### 3:50–4:10 · Limits and next steps
*Scroll to “Yöntem, kaynaklar ve sınırlılıklar”.*

> “It's honest about its limits: straight-line isn't walking distance, points aren't population, and it doesn't predict drowning risk. Next I want walking routes, a verified list of municipal pools, and real input from neighbours. Thanks for watching.”

---

**Checklist before uploading:** length between 2:00 and 6:00 · the app shown is the real app · no claims beyond what's on screen · YouTube/Vimeo visibility set to *Public* or *Unlisted*, as Devpost allows · link pasted into Devpost.

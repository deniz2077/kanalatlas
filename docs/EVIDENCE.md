# Evidence ledger

Every factual claim KanalAtlas makes about Adana is listed here with its source, date, period and scope.
The same records are in `src/lib/evidence.ts`, which feeds the landing page, the methodology section and the PDF. **Update both together.**

Status labels:

| Label | Meaning |
|---|---|
| **VERIFIED** | Documented by a relevant authoritative/original source that we read. |
| **MAPPED** | Present in OpenStreetMap; operating status and public access **not** verified. |
| **REQUIRES CONFIRMATION** | Uncertain, conflicting, unattributed or possibly outdated. |
| **HYPOTHETICAL** | A user-placed scenario. Not an existing facility. |

Research was carried out on 22 October 2026 (Türkiye time). Sources were read through a web-fetch tool. The council PDF was downloaded once and its text was extracted with pdf.js.

---

## E1. Council decision: “Yüzme Bilmeyen Çocuk Kalmasın” protocol — VERIFIED

- **Publisher:** Adana Büyükşehir Belediye Meclisi (Adana Metropolitan Municipal Council)
- **Document:** June 2026 council decisions PDF, decision no. `67597785-105.04/183`, pages 74–75
- **Date:** 12.06.2026 (commission met 10.06.2026; department letter dated 04.06.2026)
- **URL:** https://www.adana.bel.tr/panel/uploads/mecliskararlari_v/files/2026-haziran-ayi-pdf.pdf
- **What it says (paraphrased):** The council unanimously approved a cooperation protocol with sports clubs that have pools. The clubs give free swimming lessons to children from low-income families during July–August, and the municipality pays the pools' water bills for that period. The stated rationale names drowning that may occur “havuz dışı güvensiz alanlarda (sulama kanalları, baraj gölü vb.)” in the heat of summer.
- **Scope/limits:** City-wide. The document gives **no drowning statistics** and **no pool locations**.
- **Used for:** Establishing that canal drowning risk is an officially recognised local concern linked to swimming access.

## E2. Municipal news: free swimming lessons, summer 2025 — VERIFIED

- **Publisher:** Adana Büyükşehir Belediyesi news page
- **Date:** 21.07.2025
- **URL:** https://www.adana.bel.tr/tr/haber/27-bin-684-cocuga-ucretsiz-spor-egitimi-veriliyor
- **What it says:** In 2025 the municipality offered free swimming lessons in **26 semi-Olympic pools** in **10 districts** to about **10,000 children aged 6–14**, every July and August. It states the aim of reducing drowning cases that rise in summer. The overall summer sports programme reached 27,684 children in 13 sports.
- **Scope/limits:** Covers the 2025 programme only. The page does **not** list pool addresses. 2026 availability is not established by this source.
- **Used for:** Showing that public swimming initiatives exist, while their locations are not easy to see at neighbourhood level.

## E3. Ministry announcement: closed pressurised irrigation — VERIFIED

- **Publisher:** T.C. Tarım ve Orman Bakanlığı — Adana Zirai Üretim İşletmesi Tarımsal Yayım ve Hizmetiçi Eğitim Merkezi Müdürlüğü
- **Date:** 10.09.2025
- **URL:** https://egitim.tarimorman.gov.tr/adana/Haber/1162/Adana-Tariminda-Yeni-Donem-Basliyor-Acik-Sulama-Kanallari-Tarihe-Karisiyor-Kapali-Basincli-Sulama-Sistemine-Geciliyor
- **What it says:** The transition from open canals to a closed, pressurised pipe system “has officially begun”. Open irrigation canals passing through the city centre will be taken out of service. The budget is approximately 100 billion TL. The districts named are Seyhan, Yüreğir, Karataş and parts of Tarsus.
- **Scope/limits:** **No timeline, no phases, no list of canal sections.** KanalAtlas therefore never claims that the canal in its study area will be closed.
- **Used for:** The long-term question of what could happen to urban canal corridors.

## E4. Council decision: lease of the Gürselpaşa municipal pool — VERIFIED (location of pool: REQUIRES CONFIRMATION)

- **Publisher / document:** Same June 2026 PDF, decision no. `67597785-105.04/181`, page 69
- **Date:** 12.06.2026
- **What it says:** The council approved leasing the swimming pool and its outbuildings in Gürselpaşa Mahallesi, Seyhan, which the municipality owns, for 10 years. The process followed a petition from a swimming club.
- **Limits:** We could not determine which OSM feature, if any, is this pool. Public access after the lease is unknown. **The pool is not added to the map as a separate facility.**

## E5. Local press: July 2026 canal inspection in Yüreğir — REQUIRES CONFIRMATION

- **Publisher:** Yeni Birlik Gazetesi (local newspaper)
- **Date:** 25.07.2026
- **URL:** https://www.gazetebirlik.com/yerel-haberler/adanada-sulama-kanallarinda-denetim-7-kisiye-25-bin-tl-ceza-kesildi/1049295
- **What it says:** Police pulled children and teenagers out of irrigation canals around Ege Bagatur Bulvarı in Yüreğir, warned them, and fined 7 people a total of 25,942 TL. The article also states that 14 people died “this year” but gives **no source** for that figure.
- **Use:** Context only. **The death figure is not used anywhere in the app or the submission.**

## E6. OpenStreetMap extract — MAPPED

- **Provider:** OpenStreetMap contributors, via the public Overpass API (`overpass-api.de`), one-time query
- **Extracted:** 2026-10-22T20:38:43Z (`data/raw/extracted_at.txt`)
- **Query:** `data/raw/q_study.txt`. It selects canals, parks, swimming pools, `sport=swimming`, sports centres and place labels in the box 36.990–37.040 N, 35.260–35.345 E.
- **Licence:** ODbL 1.0. Attribution is shown on the map, in the footer and in the PDF.
- **Contents after processing:** 13 canal ways and 240 facility records (254 raw, 14 duplicates merged): 42 swimming records, of which 5 are in the core analysis, 34 are unnamed (extended scope) and 3 are access-restricted (excluded); 198 parks, of which 119 are core and 79 extended; plus 39 neighbourhood labels.
- **Limits:** OSM may miss facilities and may contain closed or private ones. **No mapped facility is labelled VERIFIED.**

---

## Claims we deliberately do NOT make

- No drowning totals (e.g. “28 deaths in 2026”). We found no official source that confirms a figure.
- No statement that any neighbourhood “lacks” swimming facilities. We only say what is or is not **mapped**.
- No statement that the study-area canal will be closed, or that its land is available.
- No population or “residents served” figures. Sample points are not people.
- No predicted reduction in drownings.

## Gaps the owner should try to fill (see NEEDS_OWNER_INPUT.md)

1. An official list or map of the 26 municipal summer pools (2025) or of the 2026 club-protocol pools, with addresses.
2. An official drowning statistic with its reporting period (Valilik, İl Emniyet, AFAD, Adli Tıp or a TBMM answer).
3. Genuine personal observations or conversations (`docs/COMMUNITY_RESEARCH_TEMPLATE.md`).

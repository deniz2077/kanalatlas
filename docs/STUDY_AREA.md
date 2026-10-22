# Study area: Seyhan central canal corridor

## Location and boundary

- **District:** Seyhan, Adana, Türkiye
- **Analysis box (sample points and hypothetical facilities):** south 36.999, west 35.268, north 37.022, east 35.330 (≈ 5.5 km × 2.6 km)
- **Facility search box (where existing facilities may be found):** 36.990–37.040 N, 35.260–35.345 E. This box is larger on purpose: the nearest facility for a point near the edge may lie outside the analysis box.
- **Neighbourhoods inside or touching the box:** OSM `place=suburb` labels, used only as approximate labels. They include İsmetpaşa, Fatih, Mithatpaşa, Namık Kemal, Sümer, Gazipaşa, Ziyapaşa, Yeşilyurt, Pınar, Tellidere, Bahçelievler, Denizli, Kurtuluş, Cemalpaşa, Gürselpaşa and Yenibaraj.

## Why this area

1. **A real, mapped open canal runs through housing.** OSM contains a continuous chain of `waterway=canal` ways running east–west at about 37.010–37.017 N from 35.265 E to 35.328 E. Some segments are mapped as culverts or tunnels (`tunnel=culvert`). They are drawn dashed and still count for the canal-belt measure.
2. **There is enough data to analyse.** The extract contains named swimming facilities (for example *Pınar Yüzme Havuzu* and *Adana Büyükşehir Belediyesi Kapalı Yüzme Havuzu*), dozens of unnamed pools and about 200 parks. We chose the area for data availability, not for how its name sounds.
3. **It is relevant to both questions.** Seyhan is named in the 2025 ministry announcement on closing city-centre canals (E3). Gürselpaşa, which touches the box, is where the council leased a municipal pool (E4).
4. **It is small enough to check by hand.** 72 sample points can be listed in a table and audited.

An overview query across the whole city (`data/raw/overview.json`) found 22 canal ways and 85 pool features. This Seyhan corridor combines a continuous, roughly 6 km mapped canal chain through dense housing with several named swimming facilities nearby, so we chose it as the single prototype area. Other candidates, such as Yüreğir canal sections, were not analysed in depth because of the deadline; that is a decision the owner can revisit.

## What is verified vs. uncertain

| Item | Status |
|---|---|
| Canal geometry | MAPPED (OSM). It matches the canal-chain shape; the water regime is not verified. |
| Pools / sports centres with names or `sport=swimming` | MAPPED. Operating status, fees and public access are **not verified**. |
| “Hayal Park” covered pool | MAPPED. Its operator tag suggests a commercial venue, so public access is unknown. |
| Unnamed `leisure=swimming_pool` polygons | REQUIRES CONFIRMATION. Many are probably apartment-complex (site) pools. They are excluded from the default scope. |
| Pools tagged `access=private/customers` | Excluded from all analysis. |
| Gürselpaşa municipal pool (council decision) | VERIFIED as existing in the document. Its map position is **unknown**. |
| Whether this canal section will be closed | **Unknown.** |
| Population distribution | **Not used.** No population data is incorporated. |

## Why it is suitable for a prototype (and not representative of Adana)

The corridor is a dense, mixed residential area where an open canal sits within walking range of homes, so the questions are concrete. It does **not** represent all of Adana: suburbs, Yüreğir and Çukurova have different canal, pool and park patterns. The architecture is built so that a second study area means adding a second extract and box (see `ARCHITECTURE.md` → *Scaling*).

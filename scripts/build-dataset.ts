/**
 * One-time dataset build: data/raw/study_raw.json (Overpass extract) ->
 * src/data/kanalatlas-data.json (what the app ships).
 *
 * Run with: npm run data:build
 * The app never calls Overpass at runtime.
 */
import fs from "node:fs";
import path from "node:path";
import { facilityFromOsm, mergeDuplicates, type RawOsmElement } from "../src/lib/facilities";
import type { Canal, Dataset, Facility, NeighbourhoodLabel } from "../src/lib/types";

const root = path.resolve(__dirname, "..");
const raw = JSON.parse(fs.readFileSync(path.join(root, "data/raw/study_raw.json"), "utf8")) as {
  elements: RawOsmElement[];
};
const extractedAt = fs.readFileSync(path.join(root, "data/raw/extracted_at.txt"), "utf8").trim();
const query = fs.readFileSync(path.join(root, "data/raw/q_study.txt"), "utf8");

const canals: Canal[] = [];
const neighbourhoods: NeighbourhoodLabel[] = [];
const facilities: Facility[] = [];

for (const el of raw.elements) {
  const tags = el.tags ?? {};
  if (tags.waterway === "canal" && el.type === "way" && el.geometry) {
    canals.push({
      id: `canal-w${el.id}`,
      name: tags.name ?? null,
      covered: tags.tunnel === "culvert" || tags.tunnel === "yes",
      coords: el.geometry.map((g) => ({ lat: g.lat, lon: g.lon })),
      source: { osmType: "way", osmId: el.id },
    });
    continue;
  }
  if (tags.place && el.type === "node" && tags.name && el.lat !== undefined && el.lon !== undefined) {
    neighbourhoods.push({ name: tags.name, lat: el.lat, lon: el.lon, osmId: el.id });
    continue;
  }
  const f = facilityFromOsm(el);
  if (f) facilities.push(f);
}

const merged = mergeDuplicates(facilities);

const dataset: Dataset = {
  generatedAt: new Date().toISOString(),
  extractedAt,
  source: {
    provider: "OpenStreetMap katkıcıları (Overpass API ile tek seferlik çekim)",
    license: "ODbL 1.0 — © OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    query,
  },
  studyArea: {
    id: "seyhan-merkez-kanal",
    name: "Seyhan Merkez Kanal Koridoru",
    district: "Seyhan, Adana",
    // ~5.5 km x 2.6 km box around the open irrigation canal mapped in OSM
    // between İsmetpaşa/Fatih (west) and Ziyapaşa (east).
    bbox: { south: 36.999, west: 35.268, north: 37.022, east: 35.33 },
    facilitySearchBBox: { south: 36.99, west: 35.26, north: 37.04, east: 35.345 },
    description:
      "Seyhan ilçesinde, OpenStreetMap'te açık sulama kanalı olarak haritalanmış doğu–batı koridoru ve çevresindeki yerleşim alanı.",
  },
  canals: canals.sort((a, b) => a.id.localeCompare(b.id)),
  facilities: merged.facilities,
  neighbourhoods: neighbourhoods.sort((a, b) => a.name.localeCompare(b.name, "tr")),
  stats: { rawElements: raw.elements.length, mergedDuplicates: merged.mergedCount },
};

const outDir = path.join(root, "src/data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "kanalatlas-data.json"), JSON.stringify(dataset, null, 1));

const count = (pred: (f: Facility) => boolean) => merged.facilities.filter(pred).length;
console.log(`canals=${canals.length} neighbourhoods=${neighbourhoods.length}`);
console.log(`facilities raw=${facilities.length} merged=${merged.facilities.length} (-${merged.mergedCount})`);
for (const c of ["swimming", "park"] as const)
  for (const t of ["core", "extended", "excluded"] as const)
    console.log(`  ${c}/${t}: ${count((f) => f.category === c && f.tier === t)}`);
for (const f of merged.facilities.filter((f) => f.category === "swimming" && f.tier !== "extended"))
  console.log(`  ${f.tier} ${f.id} ${f.name ?? "(isimsiz)"} ${f.lat.toFixed(5)},${f.lon.toFixed(5)} src=${f.sources.length}`);

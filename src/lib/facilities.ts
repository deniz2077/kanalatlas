/**
 * Turning raw OpenStreetMap elements into a curated facility list:
 * classification (which tier/status a facility gets) and duplicate merging.
 * Used once by scripts/build-dataset.ts; the app ships the resulting JSON.
 */
import { haversineMeters, polygonAreaCentroid, type LatLon } from "./geo";
import type { Category, DataTier, Facility, OsmSource, VerificationStatus } from "./types";

/** Facilities of the same category closer than this are treated as one place. */
export const DUPLICATE_RADIUS_M = 30;
/** Unnamed parks smaller than this go to the "extended" tier. */
export const PARK_CORE_MIN_AREA_M2 = 5000;

const RESTRICTED_ACCESS = new Set(["private", "customers", "no", "members"]);

export interface RawOsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
}

export function categoryOf(tags: Record<string, string>): Category | null {
  if (tags.leisure === "park") return "park";
  if (tags.leisure === "swimming_pool") return "swimming";
  if (tags.sport && tags.sport.split(";").includes("swimming")) return "swimming";
  return null;
}

/** Representative point (and area for polygons) of an OSM element. */
export function representativePoint(el: RawOsmElement): { point: LatLon; areaM2?: number } | null {
  if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") {
    return { point: { lat: el.lat, lon: el.lon } };
  }
  if (el.type === "way" && el.geometry && el.geometry.length > 0) {
    const { areaM2, centroid } = polygonAreaCentroid(el.geometry);
    return { point: centroid, areaM2 };
  }
  if (el.type === "relation" && el.members) {
    // Use the largest outer ring of a multipolygon.
    let best: { point: LatLon; areaM2: number } | null = null;
    for (const m of el.members) {
      if (m.role !== "outer" || !m.geometry || m.geometry.length < 3) continue;
      const { areaM2, centroid } = polygonAreaCentroid(m.geometry);
      if (!best || areaM2 > best.areaM2) best = { point: centroid, areaM2 };
    }
    return best;
  }
  return null;
}

export function classify(
  category: Category,
  tags: Record<string, string>,
  areaM2: number | undefined,
): { tier: DataTier; tierReason: string; status: VerificationStatus } {
  const name = tags.name?.trim();
  if (tags.access && RESTRICTED_ACCESS.has(tags.access)) {
    return {
      tier: "excluded",
      status: "MAPPED",
      tierReason: `OSM'de erişim kısıtlı olarak işaretli (access=${tags.access}); analize dahil edilmez.`,
    };
  }
  if (category === "swimming") {
    if (name || tags.sport?.includes("swimming")) {
      return {
        tier: "core",
        status: "MAPPED",
        tierReason: "Adı veya yüzme etiketi olan haritalanmış tesis. Halka açıklığı ve çalışma durumu doğrulanmadı.",
      };
    }
    return {
      tier: "extended",
      status: "REQUIRES_CONFIRMATION",
      tierReason: "İsimsiz havuz; site, otel veya özel havuz olabilir. Yalnızca 'tüm haritalanmış' kapsamında sayılır.",
    };
  }
  // park
  if (name || (areaM2 ?? 0) >= PARK_CORE_MIN_AREA_M2) {
    return {
      tier: "core",
      status: "MAPPED",
      tierReason: "Adı olan veya 5.000 m² üzeri haritalanmış park. Gölge, bakım ve kullanılabilirlik doğrulanmadı.",
    };
  }
  return {
    tier: "extended",
    status: "REQUIRES_CONFIRMATION",
    tierReason: "Küçük ve isimsiz yeşil alan; site bahçesi olabilir. Yalnızca 'tüm haritalanmış' kapsamında sayılır.",
  };
}

const TIER_RANK: Record<DataTier, number> = { excluded: 0, extended: 1, core: 2 };

/**
 * Merge facilities of the same category that lie within `radiusM` of each other
 * (single-linkage clustering, deterministic order). A merged facility keeps every
 * OSM source id. If any member is access-restricted the merged facility is
 * excluded and flagged REQUIRES_CONFIRMATION, because the sources disagree.
 */
export function mergeDuplicates(
  facilities: Facility[],
  radiusM = DUPLICATE_RADIUS_M,
): { facilities: Facility[]; mergedCount: number } {
  const sorted = [...facilities].sort((a, b) => a.id.localeCompare(b.id));
  const parent = sorted.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[i].category !== sorted[j].category) continue;
      if (haversineMeters(sorted[i], sorted[j]) <= radiusM) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, Facility[]>();
  sorted.forEach((f, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), f]);
  });

  const out: Facility[] = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      out.push(members[0]);
      continue;
    }
    // Representative: named member first, then highest tier, then largest area.
    const rep = [...members].sort(
      (a, b) =>
        Number(!!b.name) - Number(!!a.name) ||
        TIER_RANK[b.tier] - TIER_RANK[a.tier] ||
        (b.areaM2 ?? 0) - (a.areaM2 ?? 0),
    )[0];
    const sources: OsmSource[] = members.flatMap((m) => m.sources);
    const tags = Object.assign({}, ...members.map((m) => m.tags)) as Record<string, string>;
    const anyExcluded = members.some((m) => m.tier === "excluded");
    const tierDisagrees = new Set(members.map((m) => m.tier)).size > 1;
    out.push({
      ...rep,
      sources,
      tags,
      tier: anyExcluded ? "excluded" : rep.tier,
      status: anyExcluded && tierDisagrees ? "REQUIRES_CONFIRMATION" : rep.status,
      tierReason: anyExcluded
        ? `${members.length} OSM kaydı aynı yeri gösteriyor ve en az biri erişimi kısıtlı olarak işaretliyor; analize dahil edilmez.`
        : `${rep.tierReason} (${members.length} çakışan OSM kaydı birleştirildi.)`,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return { facilities: out, mergedCount: facilities.length - out.length };
}

export function facilityFromOsm(el: RawOsmElement): Facility | null {
  const tags = el.tags ?? {};
  const category = categoryOf(tags);
  if (!category) return null;
  const rep = representativePoint(el);
  if (!rep) return null;
  const { tier, tierReason, status } = classify(category, tags, rep.areaM2);
  return {
    id: `${category}-${el.type[0]}${el.id}`,
    category,
    name: tags.name?.trim() || null,
    lat: rep.point.lat,
    lon: rep.point.lon,
    areaM2: rep.areaM2 !== undefined ? Math.round(rep.areaM2) : undefined,
    status,
    tier,
    tierReason,
    sources: [{ osmType: el.type, osmId: el.id }],
    tags,
  };
}

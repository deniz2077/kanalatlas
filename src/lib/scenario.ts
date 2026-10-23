/**
 * KanalAtlas scenario engine.
 *
 * Deterministic, UI-independent calculations that compare straight-line
 * access to the nearest mapped facility BEFORE and AFTER the user adds
 * hypothetical facilities. Every number shown in the app and the PDF comes
 * from evaluateScenario(). See docs/SCENARIO_METHOD.md for a worked example.
 */
import {
  haversineMeters,
  inBBox,
  isValidLatLon,
  offsetMeters,
  pointToPolylinesMeters,
  toLocalXY,
  type BBox,
  type LatLon,
} from "./geo";
import type {
  Canal,
  Category,
  DataScope,
  EvaluationPoint,
  Facility,
  HypotheticalFacility,
  NeighbourhoodLabel,
} from "./types";

/** Points within this straight-line distance of a mapped canal form the "canal belt" subset. */
export const CANAL_BELT_M = 500;
/** A hypothetical facility this close to an existing one is flagged as a likely duplicate. */
export const NEAR_EXISTING_WARN_M = 30;
export const MAX_HYPOTHETICALS = 3;

// ---------------------------------------------------------------- sampling

/**
 * Regular grid of evaluation points covering the study box, `spacingM` apart,
 * centred inside the box. Rows are lettered from north (A) to south; columns
 * numbered west to east. These are sampled map locations, NOT homes or people.
 */
export function generateEvaluationGrid(
  bbox: BBox,
  spacingM: number,
  neighbourhoods: NeighbourhoodLabel[] = [],
  canals: Canal[] = [],
): EvaluationPoint[] {
  if (!(spacingM > 0)) throw new Error("spacingM must be positive");
  const nw = { lat: bbox.north, lon: bbox.west };
  const se = toLocalXY({ lat: bbox.south, lon: bbox.east }, nw);
  const width = se.x;
  const height = -se.y;
  const cols = Math.floor(width / spacingM) + 1;
  const rows = Math.floor(height / spacingM) + 1;
  const padX = (width - (cols - 1) * spacingM) / 2;
  const padY = (height - (rows - 1) * spacingM) / 2;
  const lines = canals.map((c) => c.coords);
  const points: EvaluationPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = offsetMeters(nw, padX + c * spacingM, -(padY + r * spacingM));
      const near = nearestLabel(p, neighbourhoods);
      points.push({
        id: `${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, "0")}`,
        lat: round6(p.lat),
        lon: round6(p.lon),
        nearLabel: near,
        canalDistanceM: lines.length ? Math.round(pointToPolylinesMeters(p, lines) ?? 0) : null,
      });
    }
  }
  return points;
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

function nearestLabel(p: LatLon, labels: NeighbourhoodLabel[]): string | null {
  let best: { name: string; d: number } | null = null;
  for (const l of labels) {
    const d = haversineMeters(p, l);
    if (!best || d < best.d) best = { name: l.name, d };
  }
  return best?.name ?? null;
}

// ---------------------------------------------------------------- filtering & validation

/** Facilities that count for a category under a data scope. Never mixes categories. */
export function activeFacilities(
  facilities: Facility[],
  category: Category,
  scope: DataScope,
): Facility[] {
  return facilities.filter(
    (f) =>
      f.category === category &&
      f.tier !== "excluded" &&
      (scope === "all" || f.tier === "core") &&
      isValidLatLon(f),
  );
}

export type ValidationResult = { ok: true; warnings: string[] } | { ok: false; error: string };

/** Check a proposed hypothetical location before it enters the scenario. */
export function validateHypothetical(
  p: unknown,
  studyBBox: BBox,
  existing: Facility[] = [],
  lang: "en" | "tr" = "tr",
): ValidationResult {
  const en = lang === "en";
  if (!isValidLatLon(p)) {
    return {
      ok: false,
      error: en
        ? "Invalid coordinate: latitude must be −90…90 and longitude −180…180."
        : "Geçersiz koordinat: enlem −90…90, boylam −180…180 arasında bir sayı olmalı.",
    };
  }
  if (!inBBox(p, studyBBox)) {
    return {
      ok: false,
      error: en
        ? "This location is outside the study area. Hypothetical facilities can only be placed inside the dashed box."
        : "Bu konum çalışma alanının dışında. Varsayımsal tesis yalnızca kesikli çizgiyle gösterilen alanın içine yerleştirilebilir.",
    };
  }
  const warnings: string[] = [];
  const close = existing.find((f) => haversineMeters(p, f) <= NEAR_EXISTING_WARN_M);
  if (close) {
    warnings.push(
      en
        ? `This location is within ${NEAR_EXISTING_WARN_M} m of an existing mapped facility (${close.name ?? "unnamed"}); the result may barely change.`
        : `Bu konum mevcut bir haritalanmış tesisin (${close.name ?? "isimsiz"}) ${NEAR_EXISTING_WARN_M} m yakınında; sonuç neredeyse değişmeyebilir.`,
    );
  }
  return { ok: true, warnings };
}

// ---------------------------------------------------------------- core evaluation

export interface NearestResult {
  facilityId: string;
  distanceM: number;
  hypothetical: boolean;
}

export function nearestOf(
  p: LatLon,
  candidates: { id: string; lat: number; lon: number }[],
  hypothetical = false,
): NearestResult | null {
  let best: NearestResult | null = null;
  for (const c of candidates) {
    const d = haversineMeters(p, c);
    // Tie-break on id so results are deterministic with duplicate coordinates.
    if (!best || d < best.distanceM || (d === best.distanceM && c.id < best.facilityId)) {
      best = { facilityId: c.id, distanceM: d, hypothetical };
    }
  }
  return best;
}

/** Distance (m) from a point to a hypothetical facility: to its line(s) if it has a path, else to its point. */
export function distanceToHypothetical(p: LatLon, h: HypotheticalFacility): number {
  if (h.path && h.path.length > 0) return pointToPolylinesMeters(p, h.path) ?? haversineMeters(p, h);
  return haversineMeters(p, h);
}

function nearestHypothetical(p: LatLon, hyps: HypotheticalFacility[]): NearestResult | null {
  let best: NearestResult | null = null;
  for (const h of hyps) {
    const d = distanceToHypothetical(p, h);
    if (!best || d < best.distanceM || (d === best.distanceM && h.id < best.facilityId)) {
      best = { facilityId: h.id, distanceM: d, hypothetical: true };
    }
  }
  return best;
}

/**
 * Hypothetical linear park along the mapped canal inside the study box:
 * every canal segment with at least one end inside the box (culverts included,
 * since a decommissioned canal's whole route would be freed). A "what if"
 * geometry only — closure and land availability are NOT verified.
 */
export function canalCorridorPath(canals: Canal[], bbox: BBox): LatLon[][] {
  const lines: LatLon[][] = [];
  for (const c of canals) {
    let current: LatLon[] = [];
    for (let i = 0; i < c.coords.length - 1; i++) {
      const a = c.coords[i];
      const b = c.coords[i + 1];
      if (inBBox(a, bbox) || inBBox(b, bbox)) {
        if (current.length === 0) current.push(a);
        current.push(b);
      } else if (current.length) {
        lines.push(current);
        current = [];
      }
    }
    if (current.length) lines.push(current);
  }
  return lines;
}

/** Total length (m) of a set of polylines. */
export function pathLengthMeters(lines: LatLon[][]): number {
  let total = 0;
  for (const l of lines) for (let i = 0; i < l.length - 1; i++) total += haversineMeters(l[i], l[i + 1]);
  return total;
}

export interface PointResult {
  pointId: string;
  before: NearestResult | null;
  after: NearestResult | null;
  /** after − before in metres (≤ 0). null when the baseline is undefined. */
  deltaM: number | null;
  withinBefore: boolean;
  withinAfter: boolean;
  inCanalBelt: boolean;
}

export interface Summary {
  pointCount: number;
  /** Points with a defined nearest-facility distance. */
  definedCount: number;
  meanM: number | null;
  medianM: number | null;
  maxM: number | null;
  withinCount: number;
}

export interface ScenarioResult {
  category: Category;
  scope: DataScope;
  thresholdM: number;
  baselineFacilityCount: number;
  hypotheticalCount: number;
  points: PointResult[];
  before: Summary;
  after: Summary;
  canalBelt: { before: Summary; after: Summary };
  change: {
    /** Defined only when both before and after means are defined. */
    meanDeltaM: number | null;
    medianDeltaM: number | null;
    withinGained: number;
    pointsImproved: number;
    /** Points with no baseline distance that gained one from a hypothetical facility. */
    newlyDefined: number;
    largestImprovementM: number | null;
  };
  notes: string[];
}

export interface ScenarioInput {
  points: EvaluationPoint[];
  facilities: Facility[];
  category: Category;
  scope: DataScope;
  hypotheticals: HypotheticalFacility[];
  thresholdM: number;
  /** Language of human-readable notes (numbers are unaffected). */
  lang?: "en" | "tr";
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function summarize(distances: (number | null)[], thresholdM: number): Summary {
  const defined = distances.filter((d): d is number => d !== null);
  return {
    pointCount: distances.length,
    definedCount: defined.length,
    meanM: defined.length ? defined.reduce((s, d) => s + d, 0) / defined.length : null,
    medianM: median(defined),
    maxM: defined.length ? Math.max(...defined) : null,
    withinCount: defined.filter((d) => d <= thresholdM).length,
  };
}

export function evaluateScenario(input: ScenarioInput): ScenarioResult {
  const { points, category, scope, thresholdM } = input;
  if (!(thresholdM > 0)) throw new Error("thresholdM must be positive");
  const existing = activeFacilities(input.facilities, category, scope);
  const hyps = input.hypotheticals.filter(
    (h) => h.category === category && isValidLatLon(h) && (!h.path || h.path.every((l) => l.every(isValidLatLon))),
  );

  const results: PointResult[] = points.map((p) => {
    const before = nearestOf(p, existing, false);
    const nearestHyp = nearestHypothetical(p, hyps);
    // A hypothetical replaces the nearest only when strictly closer.
    const after =
      nearestHyp && (!before || nearestHyp.distanceM < before.distanceM) ? nearestHyp : before;
    return {
      pointId: p.id,
      before,
      after,
      deltaM: before && after ? after.distanceM - before.distanceM : null,
      withinBefore: !!before && before.distanceM <= thresholdM,
      withinAfter: !!after && after.distanceM <= thresholdM,
      inCanalBelt: p.canalDistanceM !== null && p.canalDistanceM <= CANAL_BELT_M,
    };
  });

  const before = summarize(results.map((r) => r.before?.distanceM ?? null), thresholdM);
  const after = summarize(results.map((r) => r.after?.distanceM ?? null), thresholdM);
  const belt = results.filter((r) => r.inCanalBelt);
  const improvements = results
    .map((r) => (r.deltaM !== null && r.deltaM < 0 ? -r.deltaM : 0))
    .filter((d) => d > 0);

  const notes: string[] = [];
  if (existing.length === 0) {
    notes.push(
      input.lang === "en"
        ? "No mapped facility exists in this category and data scope; the baseline distance is undefined and no percentage change is computed."
        : "Bu kategori ve veri kapsamında haritalanmış tesis yok; başlangıç mesafesi tanımsızdır ve yüzde değişim hesaplanmaz.",
    );
  }
  if (hyps.length > 0 && improvements.length === 0 && results.every((r) => r.before)) {
    notes.push(
      input.lang === "en"
        ? "The hypothetical facility(ies) did not change the nearest facility for any sample point: the result equals the baseline."
        : "Varsayımsal tesis(ler) hiçbir örnek noktada en yakın tesisi değiştirmedi: sonuç başlangıçla aynı.",
    );
  }

  return {
    category,
    scope,
    thresholdM,
    baselineFacilityCount: existing.length,
    hypotheticalCount: hyps.length,
    points: results,
    before,
    after,
    canalBelt: {
      before: summarize(belt.map((r) => r.before?.distanceM ?? null), thresholdM),
      after: summarize(belt.map((r) => r.after?.distanceM ?? null), thresholdM),
    },
    change: {
      meanDeltaM:
        before.meanM !== null && after.meanM !== null && before.definedCount === after.definedCount
          ? after.meanM - before.meanM
          : null,
      medianDeltaM:
        before.medianM !== null && after.medianM !== null && before.definedCount === after.definedCount
          ? after.medianM - before.medianM
          : null,
      withinGained: after.withinCount - before.withinCount,
      pointsImproved: improvements.length,
      newlyDefined: results.filter((r) => !r.before && r.after).length,
      largestImprovementM: improvements.length ? Math.max(...improvements) : null,
    },
    notes,
  };
}

// ---------------------------------------------------------------- site suggestions

export interface SiteSuggestion extends LatLon {
  candidateId: string;
  nearLabel: string | null;
  withinGained: number;
  meanReductionM: number;
}

/**
 * "Where would ONE new facility help most?" — tries every candidate site
 * (by default the evaluation points; the app passes a finer 100 m grid) and ranks by (1) sampled points newly within the threshold,
 * (2) reduction in mean distance. A greedy screening heuristic on sampled points
 * only; it knows nothing about land availability, cost or ownership.
 */
export function suggestSites(
  points: EvaluationPoint[],
  facilities: Facility[],
  category: Category,
  scope: DataScope,
  thresholdM: number,
  topN = 3,
  candidates: EvaluationPoint[] = points,
): SiteSuggestion[] {
  const existing = activeFacilities(facilities, category, scope);
  const base = points.map((p) => nearestOf(p, existing)?.distanceM ?? Infinity);
  const n = points.length;
  const suggestions: SiteSuggestion[] = candidates.map((cand) => {
    let gained = 0;
    let reduction = 0;
    points.forEach((p, i) => {
      const d = haversineMeters(p, cand);
      if (d < base[i]) {
        if (d <= thresholdM && base[i] > thresholdM) gained++;
        // Undefined baselines count as reduction to d only for ranking, not reporting.
        reduction += Number.isFinite(base[i]) ? base[i] - d : 0;
      }
    });
    return {
      candidateId: cand.id,
      lat: cand.lat,
      lon: cand.lon,
      nearLabel: cand.nearLabel,
      withinGained: gained,
      // Rounded to 0.1 m: sub-metre differences are noise and would make ties unstable.
      meanReductionM: n ? Math.round((reduction / n) * 10) / 10 : 0,
    };
  });
  suggestions.sort(
    (a, b) =>
      b.withinGained - a.withinGained ||
      b.meanReductionM - a.meanReductionM ||
      a.candidateId.localeCompare(b.candidateId),
  );
  // Keep suggestions spatially distinct (at least one threshold apart).
  const picked: SiteSuggestion[] = [];
  for (const s of suggestions) {
    if (picked.length >= topN) break;
    if (s.withinGained === 0 && s.meanReductionM === 0) break;
    if (picked.every((q) => haversineMeters(q, s) >= thresholdM)) picked.push(s);
  }
  return picked;
}

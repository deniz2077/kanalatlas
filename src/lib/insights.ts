/**
 * Turns ScenarioResult numbers into plain-language explanations (Turkish by
 * default, English on request). Kept separate from the UI so the same
 * sentences appear on screen and in the PDF.
 */
import { haversineMeters } from "./geo";
import { fmtDelta, fmtMeters, type Lang } from "./i18n";
import { activeFacilities, distanceToHypothetical, type ScenarioResult } from "./scenario";
import type { Category, DataScope, EvaluationPoint, Facility, HypotheticalFacility, NeighbourhoodLabel } from "./types";

export const CATEGORY_LABEL: Record<Category, string> = {
  swimming: "Yüzme tesisi",
  park: "Park / yeşil alan",
};

export const CATEGORY_PLURAL: Record<Category, string> = {
  swimming: "yüzme tesisleri",
  park: "parklar",
};

/** Dative phrase: "… en yakın haritalanmış yüzme tesisine" */
export const NEAREST_DATIVE: Record<Category, string> = {
  swimming: "en yakın haritalanmış yüzme tesisine",
  park: "en yakın haritalanmış parka",
};

export const SCOPE_LABEL: Record<DataScope, string> = {
  core: "Temel veri (adı/etiketi olan kayıtlar)",
  all: "Tüm haritalanmış kayıtlar (isimsiz olanlar dahil)",
};

export const THRESHOLD_OPTIONS: Record<Category, number[]> = {
  swimming: [500, 1000, 1500, 2000],
  park: [200, 300, 500, 800],
};

export const DEFAULT_THRESHOLD: Record<Category, number> = { swimming: 1000, park: 300 };

export function formatMeters(m: number | null | undefined, lang: Lang = "tr"): string {
  return fmtMeters(m, lang);
}

export function formatDelta(m: number | null | undefined, lang: Lang = "tr"): string {
  return fmtDelta(m, lang);
}

export interface HypotheticalExplanation {
  id: string;
  label: string;
  /** Points whose nearest facility becomes this hypothetical one. */
  servesPoints: string[];
  /** Of those, how many newly fall within the threshold. */
  newlyWithin: number;
  /** Straight-line distance from this site to the nearest existing facility of the same category. */
  nearestExisting: { name: string | null; distanceM: number } | null;
  nearLabel: string | null;
}

/** Why does a hypothetical site perform the way it does? */
export function explainHypotheticals(
  result: ScenarioResult,
  hypotheticals: HypotheticalFacility[],
  facilities: Facility[],
  points: EvaluationPoint[],
  neighbourhoods: NeighbourhoodLabel[] = [],
): HypotheticalExplanation[] {
  const existing = activeFacilities(facilities, result.category, result.scope);
  return hypotheticals
    .filter((h) => h.category === result.category)
    .map((h) => {
      const served = result.points.filter((r) => r.after?.hypothetical && r.after.facilityId === h.id);
      let nearestExisting: HypotheticalExplanation["nearestExisting"] = null;
      for (const f of existing) {
        const d = distanceToHypothetical(f, h);
        if (!nearestExisting || d < nearestExisting.distanceM) nearestExisting = { name: f.name, distanceM: d };
      }
      // Label = nearest neighbourhood centroid (same rule as the evaluation grid);
      // falls back to the nearest sample point's label.
      let nearLabel: string | null = null;
      let best = Infinity;
      for (const l of neighbourhoods.length ? neighbourhoods : points.map((p) => ({ ...p, name: p.nearLabel }))) {
        const d = haversineMeters(h, l);
        if (d < best) {
          best = d;
          nearLabel = l.name;
        }
      }
      return {
        id: h.id,
        label: h.label,
        servesPoints: served.map((r) => r.pointId),
        newlyWithin: served.filter((r) => r.withinAfter && !r.withinBefore).length,
        nearestExisting,
        nearLabel,
      };
    });
}

/** One-paragraph interpretation of the current result (no causal or safety claims). */
export function interpretResult(r: ScenarioResult, lang: Lang = "tr"): string {
  if (lang === "en") return interpretResultEn(r);
  const n = r.before.pointCount;
  const th = formatMeters(r.thresholdM);
  const cat = CATEGORY_PLURAL[r.category];
  const parts: string[] = [];
  if (r.baselineFacilityCount === 0) {
    parts.push(
      `Seçilen veri kapsamında haritalanmış ${cat} bulunmadığı için başlangıç mesafesi tanımsız; ${n} örnek noktanın hiçbiri ${th} içinde sayılmıyor.`,
    );
  } else {
    parts.push(
      `Başlangıçta ${n} örnek harita noktasının ${r.before.withinCount} tanesi ${NEAREST_DATIVE[r.category]} ${th} veya daha az kuş uçuşu mesafede.`,
    );
  }
  if (r.hypotheticalCount === 0) {
    parts.push("Henüz varsayımsal tesis eklenmedi.");
  } else if (r.change.pointsImproved === 0 && r.change.newlyDefined === 0) {
    parts.push("Eklenen varsayımsal tesis hiçbir örnek noktada en yakın mesafeyi kısaltmıyor; konumu mevcut tesislere çok yakın olabilir.");
  } else {
    parts.push(
      `Varsayımsal senaryoda bu sayı ${r.after.withinCount} oluyor (${r.change.withinGained >= 0 ? "+" : ""}${r.change.withinGained}). ${r.change.pointsImproved} noktada en yakın tesis mesafesi kısalıyor` +
        (r.change.largestImprovementM ? `; en büyük kısalma ${formatMeters(r.change.largestImprovementM)}.` : "."),
    );
    if (r.change.meanDeltaM !== null) {
      parts.push(`Ortalama mesafe: başlangıçta ${formatMeters(r.before.meanM)}, senaryoda ${formatMeters(r.after.meanM)}.`);
    }
  }
  parts.push("Bu değerler yürüme süresi değil, düz çizgi (kuş uçuşu) mesafedir ve nüfusu temsil etmez.");
  return parts.join(" ");
}

function interpretResultEn(r: ScenarioResult): string {
  const n = r.before.pointCount;
  const th = fmtMeters(r.thresholdM, "en");
  const what = r.category === "swimming" ? "swimming facility" : "park";
  const parts: string[] = [];
  if (r.baselineFacilityCount === 0) {
    parts.push(`No mapped ${what === "park" ? "parks" : "swimming facilities"} exist in the selected data scope, so the baseline distance is undefined; none of the ${n} sample points counts as within ${th}.`);
  } else {
    parts.push(`At baseline, ${r.before.withinCount} of ${n} sample map points are within ${th} (straight line) of the nearest mapped ${what}.`);
  }
  if (r.hypotheticalCount === 0) {
    parts.push("No hypothetical facility has been added yet.");
  } else if (r.change.pointsImproved === 0 && r.change.newlyDefined === 0) {
    parts.push("The hypothetical facility does not shorten the nearest distance for any sample point; it may be too close to existing facilities.");
  } else {
    parts.push(
      `In the hypothetical scenario this becomes ${r.after.withinCount} (${r.change.withinGained >= 0 ? "+" : ""}${r.change.withinGained}). The nearest-facility distance gets shorter for ${r.change.pointsImproved} points` +
        (r.change.largestImprovementM ? `; the largest reduction is ${fmtMeters(r.change.largestImprovementM, "en")}.` : "."),
    );
    if (r.change.meanDeltaM !== null) {
      parts.push(`Mean distance: ${fmtMeters(r.before.meanM, "en")} at baseline, ${fmtMeters(r.after.meanM, "en")} in the scenario.`);
    }
  }
  parts.push("These are straight-line distances, not walking times, and they do not represent population.");
  return parts.join(" ");
}

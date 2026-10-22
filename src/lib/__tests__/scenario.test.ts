import { describe, expect, it } from "vitest";
import { haversineMeters, offsetMeters } from "../geo";
import {
  activeFacilities,
  evaluateScenario,
  generateEvaluationGrid,
  median,
  nearestOf,
  suggestSites,
  summarize,
  validateHypothetical,
} from "../scenario";
import type { EvaluationPoint, Facility, HypotheticalFacility } from "../types";

/*
 * Hand-built scenario on a straight east-west line (distances in metres):
 *
 *   P1 ─────── P2 ─────── P3
 *   0         1000       2000      ← evaluation points
 *   F (existing pool at 0)
 *
 * Positions are created with offsetMeters (local projection), so Haversine
 * distances agree with the round numbers to well under 1 m.
 */
const O = { lat: 37.01, lon: 35.3 };
const at = (east: number, north = 0) => offsetMeters(O, east, north);
const pt = (id: string, east: number, canal: number | null = null): EvaluationPoint => ({
  id,
  ...at(east),
  nearLabel: null,
  canalDistanceM: canal,
});
const fac = (id: string, east: number, over: Partial<Facility> = {}): Facility => ({
  id,
  ...at(east),
  category: "swimming",
  name: id,
  status: "MAPPED",
  tier: "core",
  tierReason: "",
  sources: [],
  tags: {},
  ...over,
});
const hyp = (id: string, east: number, north = 0): HypotheticalFacility => ({
  id,
  ...at(east, north),
  category: "swimming",
  label: id,
});

const points = [pt("P1", 0, 100), pt("P2", 1000, 300), pt("P3", 2000, 900)];
const F = fac("F", 0);
const base = { points, facilities: [F], category: "swimming" as const, scope: "core" as const, thresholdM: 800 };
const close = (a: number | null, b: number) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThan(1);
};

describe("summary statistics", () => {
  it("median of odd/even/empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("ignores undefined distances and counts threshold inclusively", () => {
    const s = summarize([100, null, 800, 801], 800);
    expect(s).toEqual({ pointCount: 4, definedCount: 3, meanM: 567, medianM: 800, maxM: 801, withinCount: 2 });
  });
});

describe("baseline (no hypothetical)", () => {
  const r = evaluateScenario({ ...base, hypotheticals: [] });
  it("finds distances 0 / 1000 / 2000 m to the single pool", () => {
    close(r.points[0].before!.distanceM, 0);
    close(r.points[1].before!.distanceM, 1000);
    close(r.points[2].before!.distanceM, 2000);
  });
  it("mean 1000, median 1000, 1 of 3 points within 800 m", () => {
    close(r.before.meanM, 1000);
    close(r.before.medianM, 1000);
    expect(r.before.withinCount).toBe(1);
  });
  it("reports no change when nothing is added", () => {
    expect(r.after).toEqual(r.before);
    expect(r.change.pointsImproved).toBe(0);
    expect(r.change.withinGained).toBe(0);
    close(r.change.meanDeltaM, 0);
  });
});

describe("Location A vs Location B produce different, hand-checked results", () => {
  // Location A: hypothetical at 2200 m → after distances 0 / 1000 (still F) / 200
  const A = evaluateScenario({ ...base, hypotheticals: [hyp("H", 2200)] });
  // Location B: hypothetical at 1500 m → after distances 0 / 500 / 500
  const B = evaluateScenario({ ...base, hypotheticals: [hyp("H", 1500)] });

  it("A: mean 400 m, median 200 m, 2/3 within 800 m, 1 point improved by 1800 m", () => {
    close(A.after.meanM, 400);
    close(A.after.medianM, 200);
    expect(A.after.withinCount).toBe(2);
    expect(A.change.withinGained).toBe(1);
    expect(A.change.pointsImproved).toBe(1);
    close(A.change.largestImprovementM, 1800);
    close(A.change.meanDeltaM, -600);
    expect(A.points[2].after!.hypothetical).toBe(true);
    expect(A.points[1].after!.facilityId).toBe("F");
  });

  it("B: mean 333.3 m, median 500 m, 3/3 within 800 m, 2 points improved", () => {
    close(B.after.meanM, 1000 / 3);
    close(B.after.medianM, 500);
    expect(B.after.withinCount).toBe(3);
    expect(B.change.withinGained).toBe(2);
    expect(B.change.pointsImproved).toBe(2);
    close(B.points[1].deltaM, -500);
    close(B.points[2].deltaM, -1500);
  });

  it("canal-belt subset (≤ 500 m from canal) only contains P1 and P2", () => {
    expect(B.canalBelt.before.pointCount).toBe(2);
    expect(B.canalBelt.before.withinCount).toBe(1);
    expect(B.canalBelt.after.withinCount).toBe(2);
  });
});

describe("edge cases", () => {
  it("zero facilities: baseline undefined, no invented mean change", () => {
    const r = evaluateScenario({ ...base, facilities: [], hypotheticals: [hyp("H", 1000)] });
    expect(r.baselineFacilityCount).toBe(0);
    expect(r.before.meanM).toBeNull();
    expect(r.before.definedCount).toBe(0);
    expect(r.after.definedCount).toBe(3);
    expect(r.change.meanDeltaM).toBeNull();
    expect(r.change.newlyDefined).toBe(3);
    expect(r.points.every((p) => p.deltaM === null)).toBe(true);
    expect(r.notes.join(" ")).toMatch(/tanımsız/);
  });

  it("zero facilities and no hypothetical: everything undefined, nothing within", () => {
    const r = evaluateScenario({ ...base, facilities: [], hypotheticals: [] });
    expect(r.after.meanM).toBeNull();
    expect(r.after.withinCount).toBe(0);
  });

  it("duplicate coordinates resolve deterministically by id", () => {
    const r = evaluateScenario({ ...base, facilities: [fac("Z", 0), fac("A", 0)], hypotheticals: [] });
    expect(r.points[0].before!.facilityId).toBe("A");
    expect(nearestOf(at(0), [fac("b", 10), fac("a", 10)])!.facilityId).toBe("a");
  });

  it("a hypothetical on top of an existing facility changes nothing (ties keep existing)", () => {
    const r = evaluateScenario({ ...base, hypotheticals: [hyp("H", 0)] });
    expect(r.change.pointsImproved).toBe(0);
    expect(r.points[0].after!.hypothetical).toBe(false);
    expect(r.notes.join(" ")).toMatch(/değiştirmedi/);
  });

  it("zero distance: a point exactly on a facility has distance 0 and is within", () => {
    const r = evaluateScenario({ ...base, hypotheticals: [] });
    close(r.points[0].before!.distanceM, 0);
    expect(r.points[0].withinBefore).toBe(true);
  });

  it("never mixes categories: parks do not count for swimming, nor park hypotheticals", () => {
    const park = fac("PARK", 1000, { category: "park" });
    const parkHyp: HypotheticalFacility = { ...hyp("HP", 2000), category: "park" };
    const r = evaluateScenario({ ...base, facilities: [F, park], hypotheticals: [parkHyp] });
    close(r.points[1].after!.distanceM, 1000);
    expect(r.hypotheticalCount).toBe(0);
    expect(r.baselineFacilityCount).toBe(1);
  });

  it("ignores invalid hypothetical coordinates", () => {
    const bad = { ...hyp("BAD", 0), lat: NaN };
    const r = evaluateScenario({ ...base, hypotheticals: [bad] });
    expect(r.hypotheticalCount).toBe(0);
  });

  it("rejects a non-positive threshold", () => {
    expect(() => evaluateScenario({ ...base, thresholdM: 0, hypotheticals: [] })).toThrow();
  });
});

describe("data scope and source-status handling", () => {
  const core = fac("core", 0);
  const ext = fac("ext", 1000, { tier: "extended", status: "REQUIRES_CONFIRMATION" });
  const excl = fac("excl", 2000, { tier: "excluded" });
  it("core scope uses only core facilities", () => {
    expect(activeFacilities([core, ext, excl], "swimming", "core").map((f) => f.id)).toEqual(["core"]);
  });
  it("all scope adds extended but never excluded (access=private)", () => {
    expect(activeFacilities([core, ext, excl], "swimming", "all").map((f) => f.id)).toEqual(["core", "ext"]);
  });
  it("scope changes the baseline numbers", () => {
    const facilities = [core, ext, excl];
    const c = evaluateScenario({ ...base, facilities, scope: "core", hypotheticals: [] });
    const a = evaluateScenario({ ...base, facilities, scope: "all", hypotheticals: [] });
    close(c.points[2].before!.distanceM, 2000);
    close(a.points[2].before!.distanceM, 1000); // excluded pool at 2000 m is never used
  });
});

describe("validateHypothetical", () => {
  const bbox = { south: 37.0, west: 35.29, north: 37.02, east: 35.33 };
  it("accepts a point inside the study area", () => {
    expect(validateHypothetical({ lat: 37.01, lon: 35.3 }, bbox)).toEqual({ ok: true, warnings: [] });
  });
  it("rejects outside points and invalid input with Turkish messages", () => {
    const out = validateHypothetical({ lat: 37.1, lon: 35.3 }, bbox);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/çalışma alanının dışında/);
    const bad = validateHypothetical({ lat: "x", lon: 35 }, bbox);
    expect(bad.ok).toBe(false);
  });
  it("warns when placed on top of an existing facility", () => {
    const r = validateHypothetical(at(10), bbox, [F]);
    expect(r.ok && r.warnings.length).toBe(1);
  });
});

describe("generateEvaluationGrid", () => {
  const bbox = { south: 37.0, west: 35.3, north: 37.01, east: 35.32 };
  // Box ≈ 1,776 m wide × 1,112 m tall → at 500 m spacing: 4 columns × 3 rows.
  const g = generateEvaluationGrid(bbox, 500);
  it("produces a deterministic labelled grid", () => {
    expect(g.length).toBe(12);
    expect(g[0].id).toBe("A01");
    expect(g[11].id).toBe("C04");
    expect(generateEvaluationGrid(bbox, 500)).toEqual(g);
  });
  it("spaces neighbours 500 m apart and stays inside the box", () => {
    expect(haversineMeters(g[0], g[1])).toBeCloseTo(500, 0);
    expect(haversineMeters(g[0], g[4])).toBeCloseTo(500, 0);
    expect(g.every((p) => p.lat >= 37 && p.lat <= 37.01 && p.lon >= 35.3 && p.lon <= 35.32)).toBe(true);
  });
  it("rejects invalid spacing", () => {
    expect(() => generateEvaluationGrid(bbox, 0)).toThrow();
  });
});

describe("suggestSites", () => {
  it("ranks by points gained, then mean reduction, then id", () => {
    const line = [0, 500, 1000, 1500, 2000, 2500].map((e, i) => pt(`P${i}`, e));
    const s = suggestSites(line, [F], "swimming", "core", 600, 3);
    // Baseline within 600 m: P0, P1. A site at 1500 m (P3) brings P2, P3, P4 within (+3)
    // and cuts total distance by 500+1500+1500+1500 = 5000 m. A site at 2000 m (P4) brings
    // P3, P4, P5 within (+3) and cuts 1000+2000+2000 = 5000 m. Exact tie → lower id wins.
    expect(s[0].candidateId).toBe("P3");
    expect(s[0].withinGained).toBe(3);
    expect(s[0].meanReductionM).toBeCloseTo(5000 / 6, 0);
    // Suggestions are at least one threshold apart.
    for (let i = 1; i < s.length; i++) expect(haversineMeters(s[0], s[i])).toBeGreaterThanOrEqual(600);
  });
  it("screens a separate candidate grid when given one", () => {
    const line = [0, 500, 1000, 1500, 2000, 2500].map((e, i) => pt(`P${i}`, e));
    // Candidate at 2100 m reaches P3 (600), P4 (100), P5 (400) → +3, but cuts less total distance than P3/P4.
    const cands = [pt("C1", 2100), pt("C2", 100)];
    const s = suggestSites(line, [F], "swimming", "core", 600, 3, cands);
    expect(s[0].candidateId).toBe("C1");
    expect(s[0].withinGained).toBe(3);
    // C2 sits next to the existing pool: it gains nothing within range.
    expect(s.find((x) => x.candidateId === "C2")?.withinGained ?? 0).toBe(0);
  });
  it("returns nothing when no site can improve anything", () => {
    const one = [pt("P0", 0)];
    expect(suggestSites(one, [F], "swimming", "core", 600)).toEqual([]);
  });
});

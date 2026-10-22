import { describe, expect, it } from "vitest";
import { offsetMeters } from "../geo";
import { categoryOf, classify, facilityFromOsm, mergeDuplicates } from "../facilities";
import data from "../../data/kanalatlas-data.json";
import type { Dataset } from "../types";

const O = { lat: 37.01, lon: 35.3 };

describe("categoryOf", () => {
  it("maps OSM tags to categories and ignores others", () => {
    expect(categoryOf({ leisure: "park" })).toBe("park");
    expect(categoryOf({ leisure: "swimming_pool" })).toBe("swimming");
    expect(categoryOf({ leisure: "sports_centre", sport: "swimming" })).toBe("swimming");
    expect(categoryOf({ leisure: "sports_centre", sport: "soccer" })).toBeNull();
  });
});

describe("classify", () => {
  it("excludes access-restricted pools", () => {
    expect(classify("swimming", { access: "private" }, undefined).tier).toBe("excluded");
    expect(classify("swimming", { access: "customers", name: "X" }, undefined).tier).toBe("excluded");
  });
  it("named or sport-tagged pools are core; bare pools are extended + REQUIRES_CONFIRMATION", () => {
    expect(classify("swimming", { name: "Pınar Yüzme Havuzu" }, undefined).tier).toBe("core");
    expect(classify("swimming", { sport: "swimming" }, undefined).tier).toBe("core");
    const bare = classify("swimming", {}, 300);
    expect(bare.tier).toBe("extended");
    expect(bare.status).toBe("REQUIRES_CONFIRMATION");
  });
  it("parks: named or >= 5,000 m² are core", () => {
    expect(classify("park", {}, 5000).tier).toBe("core");
    expect(classify("park", {}, 4999).tier).toBe("extended");
    expect(classify("park", { name: "Engelsiz Park" }, 100).tier).toBe("core");
  });
  it("never labels mapped data as VERIFIED", () => {
    expect(classify("swimming", { name: "X" }, undefined).status).toBe("MAPPED");
  });
});

describe("facilityFromOsm", () => {
  it("uses the polygon centroid and area for ways", () => {
    const ring = [O, offsetMeters(O, 100, 0), offsetMeters(O, 100, 100), offsetMeters(O, 0, 100), O];
    const f = facilityFromOsm({ type: "way", id: 7, tags: { leisure: "park" }, geometry: ring })!;
    expect(f.id).toBe("park-w7");
    expect(f.areaM2).toBeGreaterThan(9990);
    expect(f.areaM2).toBeLessThan(10010);
    expect(f.tier).toBe("core");
  });
  it("returns null for unrelated or geometry-less elements", () => {
    expect(facilityFromOsm({ type: "node", id: 1, tags: { amenity: "cafe" }, lat: 37, lon: 35 })).toBeNull();
    expect(facilityFromOsm({ type: "way", id: 1, tags: { leisure: "park" } })).toBeNull();
  });
});

describe("mergeDuplicates", () => {
  const mk = (id: string, east: number, over: object = {}) => ({
    ...facilityFromOsm({ type: "node", id: Number(id), lat: 0, lon: 0, tags: { leisure: "swimming_pool" } })!,
    ...offsetMeters(O, east, 0),
    ...over,
  });
  it("merges same-category facilities within 30 m and keeps every source id", () => {
    const a = mk("1", 0, { name: "Pınar Yüzme Havuzu", tier: "core" });
    const b = mk("2", 20);
    const c = mk("3", 500);
    const r = mergeDuplicates([a, b, c]);
    expect(r.mergedCount).toBe(1);
    expect(r.facilities).toHaveLength(2);
    const merged = r.facilities.find((f) => f.sources.length === 2)!;
    expect(merged.name).toBe("Pınar Yüzme Havuzu");
    expect(merged.tier).toBe("core");
  });
  it("a merged group with any access-restricted member is excluded and flagged", () => {
    const a = mk("1", 0, { tier: "core", status: "MAPPED" });
    const b = mk("2", 10, { tier: "excluded" });
    const [m] = mergeDuplicates([a, b]).facilities;
    expect(m.tier).toBe("excluded");
    expect(m.status).toBe("REQUIRES_CONFIRMATION");
  });
  it("does not merge across categories", () => {
    const a = mk("1", 0);
    const b = { ...mk("2", 0), category: "park" as const };
    expect(mergeDuplicates([a, b]).facilities).toHaveLength(2);
  });
});

describe("shipped dataset integrity", () => {
  const d = data as unknown as Dataset;
  it("has real OSM provenance on every facility and canal", () => {
    expect(d.facilities.length).toBeGreaterThan(0);
    expect(d.facilities.every((f) => f.sources.length > 0 && f.sources.every((s) => s.osmId > 0))).toBe(true);
    expect(d.canals.every((c) => c.source.osmId > 0 && c.coords.length >= 2)).toBe(true);
  });
  it("has unique ids and no facility marked VERIFIED or HYPOTHETICAL", () => {
    expect(new Set(d.facilities.map((f) => f.id)).size).toBe(d.facilities.length);
    expect(d.facilities.some((f) => f.status === "VERIFIED" || f.status === "HYPOTHETICAL")).toBe(false);
  });
  it("facilities lie inside the documented extraction box", () => {
    const b = d.studyArea.facilitySearchBBox;
    expect(d.facilities.every((f) => f.lat >= b.south - 0.01 && f.lat <= b.north + 0.01)).toBe(true);
  });
});

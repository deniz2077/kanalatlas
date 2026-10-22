import { describe, expect, it } from "vitest";
import {
  haversineMeters,
  inBBox,
  isValidLatLon,
  nearestPointOnPolylines,
  offsetMeters,
  pointToPolylinesMeters,
  pointToSegmentMeters,
  polygonAreaCentroid,
} from "../geo";

// Hand calculation: one degree of arc = 2πR/360 = 2π·6,371,008.8/360 = 111,195.08 m.
const M_PER_DEG = (2 * Math.PI * 6_371_008.8) / 360;

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters({ lat: 37.01, lon: 35.3 }, { lat: 37.01, lon: 35.3 })).toBe(0);
  });

  it("matches 1° of latitude = 111,195 m (hand-calculated)", () => {
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(M_PER_DEG, 3);
    expect(M_PER_DEG).toBeCloseTo(111_195.08, 1);
  });

  it("matches 0.01° of latitude in Adana = 1,111.95 m", () => {
    expect(haversineMeters({ lat: 37.0, lon: 35.3 }, { lat: 37.01, lon: 35.3 })).toBeCloseTo(1111.95, 1);
  });

  it("shrinks east-west distances by cos(latitude): 0.01° lon at 37°N ≈ 888.0 m", () => {
    // 111,195.08 × 0.01 × cos(37°) = 1111.95 × 0.79864 = 888.05 m
    const d = haversineMeters({ lat: 37, lon: 35.3 }, { lat: 37, lon: 35.31 });
    expect(d).toBeCloseTo(888.05, 0);
  });

  it("is symmetric", () => {
    const a = { lat: 37.0123, lon: 35.2871 };
    const b = { lat: 37.0201, lon: 35.3302 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 9);
  });

  it("matches a quarter of the meridian: equator → North Pole = πR/2 = 10,007.5 km", () => {
    expect(haversineMeters({ lat: 0, lon: 35 }, { lat: 90, lon: 35 }) / 1000).toBeCloseTo(10_007.56, 1);
  });
});

describe("isValidLatLon", () => {
  it("accepts valid coordinates", () => {
    expect(isValidLatLon({ lat: 37, lon: 35 })).toBe(true);
    expect(isValidLatLon({ lat: -90, lon: 180 })).toBe(true);
  });
  it.each([
    [null],
    [undefined],
    [{}],
    [{ lat: "37", lon: 35 }],
    [{ lat: NaN, lon: 35 }],
    [{ lat: 37, lon: Infinity }],
    [{ lat: 91, lon: 35 }],
    [{ lat: 37, lon: -181 }],
  ])("rejects %j", (v) => {
    expect(isValidLatLon(v)).toBe(false);
  });
});

describe("offsetMeters", () => {
  it("moves 500 m north and 300 m east within 0.5 m", () => {
    const o = { lat: 37.01, lon: 35.3 };
    const n = offsetMeters(o, 0, 500);
    const e = offsetMeters(o, 300, 0);
    expect(haversineMeters(o, n)).toBeCloseTo(500, 0);
    expect(haversineMeters(o, e)).toBeCloseTo(300, 0);
    expect(n.lon).toBeCloseTo(o.lon, 9);
    expect(e.lat).toBeCloseTo(o.lat, 9);
  });
});

describe("pointToSegmentMeters", () => {
  const a = { lat: 37.01, lon: 35.3 };
  const b = offsetMeters(a, 1000, 0); // segment 1 km due east

  it("measures perpendicular distance to the middle of a segment", () => {
    const p = offsetMeters(a, 500, 200);
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(200, 0);
  });
  it("clamps to the nearest endpoint beyond the segment", () => {
    const p = offsetMeters(a, -300, 400); // 3-4-5 triangle → 500 m from a
    expect(pointToSegmentMeters(p, a, b)).toBeCloseTo(500, 0);
  });
  it("handles a zero-length segment", () => {
    const p = offsetMeters(a, 0, 100);
    expect(pointToSegmentMeters(p, a, a)).toBeCloseTo(100, 0);
  });
  it("takes the minimum over several polylines and returns null for none", () => {
    const p = offsetMeters(a, 500, 200);
    const far = [offsetMeters(a, 0, 5000), offsetMeters(a, 1000, 5000)];
    expect(pointToPolylinesMeters(p, [far, [a, b]])).toBeCloseTo(200, 0);
    expect(pointToPolylinesMeters(p, [])).toBeNull();
  });
});

describe("polygonAreaCentroid", () => {
  it("computes area and centroid of a 100 m × 100 m square", () => {
    const o = { lat: 37.01, lon: 35.3 };
    const ring = [o, offsetMeters(o, 100, 0), offsetMeters(o, 100, 100), offsetMeters(o, 0, 100)];
    const { areaM2, centroid } = polygonAreaCentroid(ring);
    expect(areaM2).toBeCloseTo(10_000, -1);
    expect(haversineMeters(centroid, offsetMeters(o, 50, 50))).toBeLessThan(0.5);
  });
  it("is independent of ring orientation", () => {
    const o = { lat: 37.01, lon: 35.3 };
    const ring = [o, offsetMeters(o, 100, 0), offsetMeters(o, 100, 50), offsetMeters(o, 0, 50)];
    // Reversing changes the projection origin, so allow ~0.5 m² (0.01%) projection noise.
    expect(polygonAreaCentroid([...ring].reverse()).areaM2).toBeCloseTo(polygonAreaCentroid(ring).areaM2, 0);
  });
  it("falls back to the vertex average for degenerate rings", () => {
    const r = polygonAreaCentroid([{ lat: 37, lon: 35 }, { lat: 37, lon: 35.002 }]);
    expect(r.areaM2).toBe(0);
    expect(r.centroid.lon).toBeCloseTo(35.001, 9);
  });
});

describe("inBBox", () => {
  const b = { south: 37, west: 35, north: 37.1, east: 35.1 };
  it("includes edges and interior, excludes outside", () => {
    expect(inBBox({ lat: 37.05, lon: 35.05 }, b)).toBe(true);
    expect(inBBox({ lat: 37, lon: 35 }, b)).toBe(true);
    expect(inBBox({ lat: 37.2, lon: 35.05 }, b)).toBe(false);
  });
});

describe("nearestPointOnPolylines", () => {
  it("projects onto the segment interior and clamps at ends", () => {
    const a = { lat: 37.01, lon: 35.3 };
    const b = offsetMeters(a, 1000, 0);
    const mid = nearestPointOnPolylines(offsetMeters(a, 400, 250), [[a, b]])!;
    expect(haversineMeters(mid, offsetMeters(a, 400, 0))).toBeLessThan(0.5);
    const end = nearestPointOnPolylines(offsetMeters(a, 1300, 100), [[a, b]])!;
    expect(haversineMeters(end, b)).toBeLessThan(0.5);
    expect(nearestPointOnPolylines(a, [])).toBeNull();
  });
});

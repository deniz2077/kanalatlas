/**
 * Geographic helper functions used by the scenario engine.
 *
 * Everything here is pure (no React, no browser APIs) so it can be unit
 * tested and reproduced by hand. See docs/SCENARIO_METHOD.md.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** Mean Earth radius in metres (IUGG value, also used by Turf.js). */
export const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** True when lat/lon are finite numbers inside valid WGS84 ranges. */
export function isValidLatLon(p: unknown): p is LatLon {
  if (!p || typeof p !== "object") return false;
  const { lat, lon } = p as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Great-circle ("as the crow flies") distance in metres using the
 * Haversine formula. This is NOT walking distance: it ignores roads,
 * bridges, canals and other barriers.
 */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Project a point to a flat local x/y plane (metres) around an origin
 * using an equirectangular approximation. Accurate to well under 1% over
 * the few kilometres of a neighbourhood study area; used only for
 * point-to-segment distances, polygon areas and nudging markers.
 */
export function toLocalXY(p: LatLon, origin: LatLon): { x: number; y: number } {
  const x = toRad(p.lon - origin.lon) * Math.cos(toRad(origin.lat)) * EARTH_RADIUS_M;
  const y = toRad(p.lat - origin.lat) * EARTH_RADIUS_M;
  return { x, y };
}

export function fromLocalXY(xy: { x: number; y: number }, origin: LatLon): LatLon {
  const lat = origin.lat + (xy.y / EARTH_RADIUS_M) * (180 / Math.PI);
  const lon =
    origin.lon + (xy.x / (EARTH_RADIUS_M * Math.cos(toRad(origin.lat)))) * (180 / Math.PI);
  return { lat, lon };
}

/** Move a point by dx (east) / dy (north) metres. */
export function offsetMeters(p: LatLon, dxEast: number, dyNorth: number): LatLon {
  return fromLocalXY({ x: dxEast, y: dyNorth }, p);
}

/** Shortest straight-line distance (m) from a point to a line segment. */
export function pointToSegmentMeters(p: LatLon, a: LatLon, b: LatLon): number {
  const P = toLocalXY(p, a);
  const B = toLocalXY(b, a);
  const len2 = B.x * B.x + B.y * B.y;
  if (len2 === 0) return Math.hypot(P.x, P.y);
  const t = Math.max(0, Math.min(1, (P.x * B.x + P.y * B.y) / len2));
  return Math.hypot(P.x - t * B.x, P.y - t * B.y);
}

/** Shortest distance (m) from a point to any segment of any polyline. */
export function pointToPolylinesMeters(p: LatLon, lines: LatLon[][]): number | null {
  let best: number | null = null;
  for (const line of lines) {
    if (line.length === 1) {
      const d = haversineMeters(p, line[0]);
      if (best === null || d < best) best = d;
    }
    for (let i = 0; i < line.length - 1; i++) {
      const d = pointToSegmentMeters(p, line[i], line[i + 1]);
      if (best === null || d < best) best = d;
    }
  }
  return best;
}

/**
 * Area (m²) and area-weighted centroid of a simple polygon ring.
 * Falls back to the vertex average for degenerate (zero-area) rings.
 */
export function polygonAreaCentroid(ring: LatLon[]): { areaM2: number; centroid: LatLon } {
  if (ring.length === 0) throw new Error("Empty polygon ring");
  const origin = ring[0];
  const pts = ring.map((p) => toLocalXY(p, origin));
  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    a2 += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a2) < 1e-9) {
    const avg = {
      lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
      lon: ring.reduce((s, p) => s + p.lon, 0) / ring.length,
    };
    return { areaM2: 0, centroid: avg };
  }
  const centroid = fromLocalXY({ x: cx / (3 * a2), y: cy / (3 * a2) }, origin);
  return { areaM2: Math.abs(a2 / 2), centroid };
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function inBBox(p: LatLon, b: BBox): boolean {
  return p.lat >= b.south && p.lat <= b.north && p.lon >= b.west && p.lon <= b.east;
}

import type { BBox, LatLon } from "./geo";

/** Amenity categories are analysed separately and never mixed. */
export type Category = "swimming" | "park";

/**
 * Evidence status labels (see docs/EVIDENCE.md):
 * - VERIFIED: documented by a relevant authoritative source
 * - MAPPED: present in OpenStreetMap; operational status/public access not verified
 * - REQUIRES_CONFIRMATION: uncertain, conflicting or outdated information
 * - HYPOTHETICAL: a user-placed scenario, not an existing facility
 */
export type VerificationStatus = "VERIFIED" | "MAPPED" | "REQUIRES_CONFIRMATION" | "HYPOTHETICAL";

/**
 * Whether a mapped facility is part of the analysis:
 * - core: included by default (named or explicitly tagged; parks: named or >= 5,000 m²)
 * - extended: included only in the "all mapped" sensitivity scope (e.g. unnamed pools)
 * - excluded: shown on the map but never counted (e.g. access=private)
 */
export type DataTier = "core" | "extended" | "excluded";

export type DataScope = "core" | "all";

export interface OsmSource {
  osmType: "node" | "way" | "relation";
  osmId: number;
}

export interface Facility extends LatLon {
  id: string;
  category: Category;
  name: string | null;
  status: VerificationStatus;
  tier: DataTier;
  /** Plain-language Turkish reason for the tier, shown in the UI and report. */
  tierReason: string;
  sources: OsmSource[];
  tags: Record<string, string>;
  areaM2?: number;
}

export interface Canal {
  id: string;
  name: string | null;
  /** true if mapped as culvert/tunnel (water runs underground there) */
  covered: boolean;
  coords: LatLon[];
  source: OsmSource;
}

export interface NeighbourhoodLabel extends LatLon {
  name: string;
  osmId: number;
}

export interface StudyArea {
  id: string;
  name: string;
  district: string;
  bbox: BBox;
  /** Facilities are searched in this larger box so the nearest one may lie outside the study area. */
  facilitySearchBBox: BBox;
  description: string;
}

export interface Dataset {
  generatedAt: string;
  extractedAt: string;
  source: { provider: string; license: string; url: string; query: string };
  studyArea: StudyArea;
  canals: Canal[];
  facilities: Facility[];
  neighbourhoods: NeighbourhoodLabel[];
  stats: { rawElements: number; mergedDuplicates: number };
}

export interface EvaluationPoint extends LatLon {
  id: string;
  /** Nearest mapped neighbourhood centroid – an approximate label only. */
  nearLabel: string | null;
  /** Straight-line distance to the nearest mapped canal segment (m). */
  canalDistanceM: number | null;
}

export interface HypotheticalFacility extends LatLon {
  id: string;
  category: Category;
  label: string;
  /**
   * Optional linear geometry (e.g. a park along a decommissioned canal).
   * When present, distance is measured to the nearest point on these lines
   * and lat/lon is only a label position.
   */
  path?: LatLon[][];
}

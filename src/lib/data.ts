/** The shipped dataset plus the evaluation grid derived from it (computed once). */
import raw from "@/data/kanalatlas-data.json";
import { canalCorridorPath, generateEvaluationGrid, pathLengthMeters } from "./scenario";
import type { Dataset } from "./types";

export const GRID_SPACING_M = 500;

export const dataset = raw as unknown as Dataset;

export const evaluationPoints = generateEvaluationGrid(
  dataset.studyArea.bbox,
  GRID_SPACING_M,
  dataset.neighbourhoods,
  dataset.canals,
);

export const osmUrl = (s: { osmType: string; osmId: number }) =>
  `https://www.openstreetmap.org/${s.osmType}/${s.osmId}`;

export const CANDIDATE_SPACING_M = 100;

/** Finer grid of candidate sites screened by the "best location" suggestion. */
export const candidateSites = generateEvaluationGrid(
  dataset.studyArea.bbox,
  CANDIDATE_SPACING_M,
  dataset.neighbourhoods,
);

/** Hypothetical "canal → linear park" geometry: mapped canal segments inside the study box. */
export const canalCorridor = canalCorridorPath(dataset.canals, dataset.studyArea.bbox);
export const canalCorridorLengthM = pathLengthMeters(canalCorridor);

/** The shipped dataset plus the evaluation grid derived from it (computed once). */
import raw from "@/data/kanalatlas-data.json";
import { generateEvaluationGrid } from "./scenario";
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

import Site from "@/components/Site";
import { dataset, evaluationPoints } from "@/lib/data";
import { activeFacilities, evaluateScenario } from "@/lib/scenario";

// Baseline numbers for the intro are computed from the dataset at build time, not typed in.
const run = (scope: "core" | "all") =>
  evaluateScenario({ points: evaluationPoints, facilities: dataset.facilities, category: "swimming", scope, hypotheticals: [], thresholdM: 1000 });

export default function Home() {
  const core = run("core");
  const all = run("all");
  return (
    <Site
      facts={{
        within: core.before.withinCount,
        points: core.before.pointCount,
        allWithin: all.before.withinCount,
        swimCore: activeFacilities(dataset.facilities, "swimming", "core").length,
        swimAll: activeFacilities(dataset.facilities, "swimming", "all").length,
        parksCore: activeFacilities(dataset.facilities, "park", "core").length,
      }}
    />
  );
}

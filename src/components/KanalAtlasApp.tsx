"use client";

/**
 * Interactive part of KanalAtlas: scenario workbench (map + results),
 * personal priorities and PDF report. Holds all scenario state; every
 * number displayed is computed by src/lib/scenario.ts from that state.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CANDIDATE_SPACING_M, canalCorridor, canalCorridorLengthM, candidateSites, dataset, evaluationPoints, osmUrl } from "@/lib/data";
import { offsetMeters } from "@/lib/geo";
import { DEFAULT_THRESHOLD, THRESHOLD_OPTIONS, explainHypotheticals, interpretResult } from "@/lib/insights";
import { fmtDelta, fmtInt, fmtMeters, type Dict, type Lang } from "@/lib/i18n";
import { EMPTY_PRIORITIES, parseStoredPriorities, STORAGE_KEY, type Priorities } from "@/lib/priorities";
import { buildReportDoc, reportFileName, type SavedComparison } from "@/lib/report";
import {
  activeFacilities,
  CANAL_BELT_M,
  evaluateScenario,
  MAX_HYPOTHETICALS,
  suggestSites,
  validateHypothetical,
  type ScenarioResult,
} from "@/lib/scenario";
import type { Category, DataScope, HypotheticalFacility } from "@/lib/types";
import { useLang } from "./LangContext";
import PrioritiesForm from "./PrioritiesForm";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const { t } = useLang();
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted" role="status">
      {t.mapLoading}
    </div>
  );
}

const NUDGE_M = 100;
const SAVE_LABELS = ["A", "B", "C"];

interface SavedScenario {
  label: string;
  category: Category;
  hypotheticals: HypotheticalFacility[];
}

type Message = { kind: "error" | "warning" | "info"; text: string } | null;

export default function KanalAtlasApp() {
  const { lang, t } = useLang();
  const fm = useCallback((m: number | null | undefined) => fmtMeters(m, lang), [lang]);
  const { studyArea, facilities, canals } = dataset;
  const [category, setCategory] = useState<Category>("swimming");
  const [scope, setScope] = useState<DataScope>("core");
  const [thresholds, setThresholds] = useState<Record<Category, number>>(DEFAULT_THRESHOLD);
  const [hypotheticals, setHypotheticals] = useState<HypotheticalFacility[]>([]);
  const [placing, setPlacing] = useState(false);
  /** When set, the next map tap moves this hypothetical (touch-friendly alternative to dragging). */
  const [movingId, setMovingId] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [priorities, setPriorities] = useState<Priorities>(EMPTY_PRIORITIES);
  const [announce, setAnnounce] = useState("");
  const [reportState, setReportState] = useState<{ busy: boolean; done?: string; error?: string }>({ busy: false });
  const [recenterToken, setRecenterToken] = useState(0);
  const nextId = useRef(1);
  const dragging = useRef(false);

  const thresholdM = thresholds[category];
  const visibleHyps = useMemo(() => hypotheticals.filter((h) => h.category === category), [hypotheticals, category]);
  const active = useMemo(() => activeFacilities(facilities, category, scope), [facilities, category, scope]);
  const activeIds = useMemo(() => new Set(active.map((f) => f.id)), [active]);

  const result = useMemo(
    () => evaluateScenario({ points: evaluationPoints, facilities, category, scope, hypotheticals: visibleHyps, thresholdM, lang }),
    [facilities, category, scope, visibleHyps, thresholdM, lang],
  );
  const resultsById = useMemo(() => new Map(result.points.map((r) => [r.pointId, r])), [result]);
  const explanations = useMemo(
    () => explainHypotheticals(result, visibleHyps, facilities, evaluationPoints, dataset.neighbourhoods),
    [result, visibleHyps, facilities],
  );
  const suggestions = useMemo(
    () => suggestSites(evaluationPoints, facilities, category, scope, thresholdM, 3, candidateSites),
    [facilities, category, scope, thresholdM],
  );

  // Saved scenarios are always re-evaluated with the CURRENT settings so the
  // comparison uses one consistent methodology.
  const comparisons: SavedComparison[] = useMemo(
    () =>
      saved
        .filter((s) => s.category === category)
        .map((s) => ({
          label: s.label,
          hypotheticals: s.hypotheticals,
          result: evaluateScenario({ points: evaluationPoints, facilities, category, scope, hypotheticals: s.hypotheticals, thresholdM }),
        })),
    [saved, category, facilities, scope, thresholdM],
  );

  // Screen-reader announcement once inputs settle (not on every drag frame).
  useEffect(() => {
    if (dragging.current) return;
    const timer = setTimeout(() => setAnnounce(interpretResult(result, lang)), 400);
    return () => clearTimeout(timer);
  }, [result, lang]);

  useEffect(() => {
    try {
      const p = parseStoredPriorities(window.localStorage.getItem(STORAGE_KEY));
      if (p) setPriorities(p);
    } catch {
      /* storage unavailable: keep empty form */
    }
  }, []);

  const addHypothetical = useCallback(
    (lat: number, lon: number, source: string) => {
      if (visibleHyps.length >= MAX_HYPOTHETICALS) {
        setMessage({ kind: "error", text: t.msg.max(MAX_HYPOTHETICALS) });
        return;
      }
      const v = validateHypothetical({ lat, lon }, studyArea.bbox, active, lang);
      if (!v.ok) {
        setMessage({ kind: "error", text: v.error });
        return;
      }
      const n = nextId.current++;
      setHypotheticals((hs) => [
        ...hs,
        { id: `hyp-${n}`, lat, lon, category, label: t.hypLabel(category, n) },
      ]);
      setPlacing(false);
      setMessage(v.warnings.length ? { kind: "warning", text: v.warnings[0] } : { kind: "info", text: t.msg.added(source) });
    },
    [visibleHyps.length, studyArea.bbox, active, category, lang, t],
  );

  const hasCorridor = visibleHyps.some((h) => h.path);
  const addCorridor = () => {
    if (visibleHyps.length >= MAX_HYPOTHETICALS) {
      setMessage({ kind: "error", text: t.msg.maxShort(MAX_HYPOTHETICALS) });
      return;
    }
    // Label position: middle vertex of the longest corridor line.
    const longest = [...canalCorridor].sort((a, b) => b.length - a.length)[0];
    const mid = longest[Math.floor(longest.length / 2)];
    const n = nextId.current++;
    setHypotheticals((hs) => [
      ...hs,
      {
        id: `hyp-${n}`,
        lat: mid.lat,
        lon: mid.lon,
        category: "park",
        label: t.corridorLabel(fm(canalCorridorLengthM)),
        path: canalCorridor,
      },
    ]);
    setPlacing(false);
    setMessage({ kind: "info", text: t.msg.corridor });
  };

  const moveHypothetical = useCallback(
    (id: string, lat: number, lon: number, final: boolean): boolean => {
      dragging.current = !final;
      const v = validateHypothetical({ lat, lon }, studyArea.bbox, active, lang);
      if (!v.ok) {
        if (final) setMessage({ kind: "error", text: v.error + t.msg.reverted });
        return false;
      }
      setHypotheticals((hs) => hs.map((h) => (h.id === id ? { ...h, lat, lon } : h)));
      if (final) setMessage(v.warnings.length ? { kind: "warning", text: v.warnings[0] } : null);
      return true;
    },
    [studyArea.bbox, active, lang, t],
  );

  const nudge = (h: HypotheticalFacility, dx: number, dy: number) => {
    const p = offsetMeters(h, dx, dy);
    moveHypothetical(h.id, p.lat, p.lon, true);
  };

  const removeHypothetical = (id: string) => {
    if (movingId === id) setMovingId(null);
    setHypotheticals((hs) => hs.filter((h) => h.id !== id));
    setMessage({ kind: "info", text: t.msg.removed });
  };

  const resetScenario = () => {
    setHypotheticals((hs) => hs.filter((h) => h.category !== category));
    setPlacing(false);
    setMessage({ kind: "info", text: t.msg.reset });
  };

  const onMapClick = useCallback(
    (lat: number, lon: number) => {
      if (movingId) {
        if (moveHypothetical(movingId, lat, lon, true)) {
          setMovingId(null);
          setMessage({ kind: "info", text: t.msg.moved });
        }
        return;
      }
      if (placing) addHypothetical(lat, lon, t.msg.addedPick);
    },
    [placing, movingId, addHypothetical, moveHypothetical, t],
  );

  const saveScenario = () => {
    if (visibleHyps.length === 0) return;
    const used = new Set(saved.filter((s) => s.category === category).map((s) => s.label));
    const label = SAVE_LABELS.find((l) => !used.has(l));
    if (!label) {
      setMessage({ kind: "error", text: t.msg.maxSaved });
      return;
    }
    setSaved((s) => [...s, { label, category, hypotheticals: visibleHyps.map((h) => ({ ...h })) }]);
    setMessage({ kind: "info", text: t.msg.saved(label) });
  };

  const generateReport = async () => {
    setReportState({ busy: true });
    try {
      const doc = buildReportDoc({
        generatedAt: new Date(),
        dataset,
        points: evaluationPoints,
        result,
        hypotheticals: visibleHyps,
        explanations,
        saved: comparisons,
        priorities: priorities.priority ? priorities : null,
        lang,
      });
      const pdfMake = (await import("pdfmake/build/pdfmake")).default;
      const vfs = (await import("pdfmake/build/vfs_fonts")).default;
      pdfMake.addVirtualFileSystem(vfs);
      const name = reportFileName(result, new Date(), lang);
      await pdfMake.createPdf(doc).download(name);
      setReportState({ busy: false, done: name });
    } catch (e) {
      console.error(e);
      setReportState({ busy: false, error: t.msg.pdfError });
    }
  };

  const best = comparisons.length
    ? [...comparisons].sort(
        (a, b) =>
          b.result.after.withinCount - a.result.after.withinCount ||
          (a.result.after.meanM ?? Infinity) - (b.result.after.meanM ?? Infinity),
      )[0]
    : null;

  const catLabel = t.category[category];

  return (
    <>
      <section id="analiz" aria-labelledby="analiz-baslik" className="border-y border-line bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-data">{t.analysisKicker}</p>
            <h2 id="analiz-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">
              {t.analysisTitle}
            </h2>
            <p className="mt-3 text-ink-soft">{t.analysisText(t.studyAreaName, evaluationPoints.length)}</p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Map column */}
            <div className="min-w-0">
              <div
                className="relative h-[62vh] min-h-[380px] overflow-hidden rounded-xl border border-line shadow-sm lg:h-[640px]"
                data-testid="map"
              >
                <MapView
                  t={t}
                  lang={lang}
                  studyArea={studyArea}
                  canals={canals}
                  category={category}
                  facilities={facilities}
                  activeIds={activeIds}
                  points={evaluationPoints}
                  results={resultsById}
                  hypotheticals={visibleHyps}
                  suggestions={showSuggestions ? suggestions : []}
                  thresholdM={thresholdM}
                  placing={placing || movingId !== null}
                  showLinks={showLinks}
                  onMapClick={onMapClick}
                  onMoveHypothetical={moveHypothetical}
                  recenterToken={recenterToken}
                />
                <button
                  type="button"
                  onClick={() => setRecenterToken((n) => n + 1)}
                  className="absolute right-2 top-2 z-[1000] min-h-9 rounded-md border border-line bg-white/95 px-3 text-xs font-semibold shadow hover:border-ink-soft"
                >
                  {t.recenter}
                </button>
                {(placing || movingId) && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3">
                    <p className="rounded-full bg-hypo px-4 py-2 text-center text-sm font-semibold text-white shadow">
                      {movingId ? t.tapToMove : t.tapToPlace}
                    </p>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute bottom-6 left-2 z-[1000] rounded-lg border border-line bg-white/95 px-3 py-2 shadow-md"
                  aria-hidden="true"
                  data-testid="map-overlay"
                >
                  <p className="text-[11px] font-medium text-muted">{t.withinLabel(fm(thresholdM))}</p>
                  <p className="text-xl font-bold tabular leading-tight">
                    {result.before.withinCount}
                    {result.hypotheticalCount > 0 && (
                      <>
                        <span className="mx-1 text-sm text-muted">→</span>
                        <span className="text-hypo">{result.after.withinCount}</span>
                        <span className="ml-1 text-sm text-hypo">({result.change.withinGained >= 0 ? "+" : ""}{result.change.withinGained})</span>
                      </>
                    )}
                    <span className="ml-1 text-sm font-normal text-muted">/ {result.before.pointCount}</span>
                  </p>
                  {result.hypotheticalCount > 0 && (
                    <p className="text-[11px] text-ink-soft tabular">
                      {t.meanLabel} {fm(result.before.meanM)} → {fm(result.after.meanM)}
                    </p>
                  )}
                </div>
              </div>
              <MapLegend t={t} category={category} threshold={fm(thresholdM)} />
            </div>

            {/* Control + results column */}
            <div className="space-y-4">
              <fieldset className="rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-semibold">{t.step1}</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.categoryGroup}>
                  {(["swimming", "park"] as Category[]).map((c) => (
                    <label
                      key={c}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-water ${
                        category === c ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-ink-soft"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={c}
                        checked={category === c}
                        onChange={() => {
                          setCategory(c);
                          setPlacing(false);
                          setMessage(null);
                        }}
                        className="sr-only"
                      />
                      {t.category[c]}
                    </label>
                  ))}
                </div>

                <div className="mt-3">
                  <label htmlFor="threshold" className="text-sm font-medium">
                    {t.threshold}
                  </label>
                  <select
                    id="threshold"
                    value={thresholdM}
                    onChange={(e) => setThresholds((th) => ({ ...th, [category]: Number(e.target.value) }))}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm"
                  >
                    {THRESHOLD_OPTIONS[category].map((th) => (
                      <option key={th} value={th}>
                        {fm(th)}
                      </option>
                    ))}
                  </select>
                </div>

                <details className="group mt-3 rounded-lg border border-line bg-paper/60 px-3 py-2" data-testid="advanced">
                  <summary className="cursor-pointer text-sm font-medium text-ink-soft">{t.advanced}</summary>
                  <div className="mt-3 space-y-3 pb-1">
                    <div>
                      <label htmlFor="scope" className="text-sm font-medium">
                        {t.scope}
                      </label>
                      <select
                        id="scope"
                        value={scope}
                        onChange={(e) => setScope(e.target.value as DataScope)}
                        className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm"
                      >
                        {(["core", "all"] as DataScope[]).map((sc) => (
                          <option key={sc} value={sc}>
                            {t.scopeOption(t.scopeLabel[sc], activeFacilities(facilities, category, sc).length)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted">{category === "swimming" ? t.scopeHintSwim : t.scopeHintPark}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <label className="flex min-h-9 items-center gap-2">
                        <input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} className="h-4 w-4" />
                        {t.showLinks}
                      </label>
                      <label className="flex min-h-9 items-center gap-2">
                        <input type="checkbox" checked={showSuggestions} onChange={(e) => setShowSuggestions(e.target.checked)} className="h-4 w-4" />
                        {t.showSuggestions}
                      </label>
                    </div>
                    <p className="text-xs text-muted">{t.categoryNote}</p>
                    <p className="text-xs text-muted">{t.bestInfo(fmtInt(candidateSites.length, lang), CANDIDATE_SPACING_M)}</p>
                    <p className="text-xs text-muted">{t.keyboardInfo(NUDGE_M)}</p>
                  </div>
                </details>
              </fieldset>

              <fieldset className="rounded-xl border border-hypo/40 bg-hypo-soft/50 p-4">
                <legend className="px-1 text-sm font-semibold">{t.step2}</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => suggestions[0] && addHypothetical(suggestions[0].lat, suggestions[0].lon, t.msg.addedBest(suggestions[0].withinGained))}
                    disabled={!suggestions.length || visibleHyps.length >= MAX_HYPOTHETICALS}
                    className="min-h-11 rounded-lg bg-hypo px-4 text-sm font-semibold text-white hover:bg-[#92400e] disabled:opacity-50"
                  >
                    {t.addBest}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacing((v) => !v);
                      setMovingId(null);
                      setMessage(null);
                    }}
                    aria-pressed={placing}
                    disabled={visibleHyps.length >= MAX_HYPOTHETICALS}
                    className="min-h-11 rounded-lg border border-hypo bg-white px-4 text-sm font-semibold text-hypo hover:bg-hypo-soft disabled:opacity-50"
                  >
                    {placing ? t.cancelPick : t.pickOnMap}
                  </button>
                </div>
                {category === "park" && (
                  <div className="mt-3 rounded-lg border border-dashed border-hypo/60 bg-white p-3">
                    <p className="text-sm font-semibold">{t.corridorTitle}</p>
                    <p className="mt-1 text-xs text-ink-soft">{t.corridorText(fm(canalCorridorLengthM))}</p>
                    <button
                      type="button"
                      onClick={addCorridor}
                      disabled={hasCorridor || visibleHyps.length >= MAX_HYPOTHETICALS}
                      className="mt-2 min-h-11 rounded-lg border border-hypo bg-hypo-soft px-4 text-sm font-semibold text-[#7c2d12] hover:bg-white disabled:opacity-50"
                    >
                      {t.corridorButton}
                    </button>
                  </div>
                )}

                {visibleHyps.length > 0 && (
                  <ul className="mt-3 space-y-3" aria-label={t.hypList}>
                    {visibleHyps.map((h) => {
                      const ex = explanations.find((e) => e.id === h.id);
                      return (
                        <li key={h.id} className="rounded-lg border border-hypo/40 bg-white p-3" data-testid="hypothetical">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                <span className="mr-1 rounded bg-hypo px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">{t.hypBadge}</span>
                                {h.label}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-muted" data-testid="hyp-coords">
                                {h.path
                                  ? t.alongCanal(h.path.length)
                                  : `${h.lat.toFixed(5)}, ${h.lon.toFixed(5)}${ex?.nearLabel ? ` · ${t.near(ex.nearLabel)}` : ""}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeHypothetical(h.id)}
                              className="min-h-9 rounded-md px-2 text-xs font-medium text-alert underline hover:bg-red-50"
                              aria-label={t.removeLabel(h.label)}
                            >
                              {t.remove}
                            </button>
                          </div>
                          {!h.path && (
                            <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label={t.moveGroup(h.label)}>
                              {(
                                [
                                  ["↑", t.dirs.n, 0, NUDGE_M],
                                  ["↓", t.dirs.s, 0, -NUDGE_M],
                                  ["←", t.dirs.w, -NUDGE_M, 0],
                                  ["→", t.dirs.e, NUDGE_M, 0],
                                ] as const
                              ).map(([sym, dir, dx, dy]) => (
                                <button
                                  key={dir}
                                  type="button"
                                  onClick={() => nudge(h, dx, dy)}
                                  className="h-9 w-9 rounded-md border border-line bg-paper text-base hover:border-ink-soft"
                                  aria-label={t.moveBy(dir, NUDGE_M)}
                                >
                                  {sym}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setPlacing(false);
                                  setMovingId((m) => (m === h.id ? null : h.id));
                                }}
                                aria-pressed={movingId === h.id}
                                className={`ml-1 min-h-9 rounded-md border px-2 text-xs font-medium ${movingId === h.id ? "border-hypo bg-hypo text-white" : "border-hypo/50 bg-white text-hypo hover:bg-hypo-soft"}`}
                              >
                                {movingId === h.id ? t.cancelPick : t.pickNew}
                              </button>
                            </div>
                          )}
                          {ex && (
                            <p className="mt-2 text-xs leading-relaxed text-ink-soft" data-testid="hyp-explanation">
                              <strong>{t.why}</strong>{" "}
                              {h.path
                                ? t.whyCorridor(ex.servesPoints.length, ex.newlyWithin, fm(thresholdM))
                                : t.whyPoint(
                                    ex.servesPoints.length,
                                    ex.newlyWithin,
                                    fm(thresholdM),
                                    category,
                                    ex.nearestExisting ? fm(ex.nearestExisting.distanceM) : null,
                                    ex.nearestExisting ? ex.nearestExisting.distanceM < thresholdM : null,
                                  )}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {visibleHyps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={saveScenario} className="min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft">
                      {t.save}
                    </button>
                    <button type="button" onClick={resetScenario} className="min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:border-ink-soft">
                      {t.reset}
                    </button>
                  </div>
                )}
              </fieldset>

              <div aria-live="assertive" className="min-h-0">
                {message && (
                  <p
                    role={message.kind === "error" ? "alert" : "status"}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      message.kind === "error"
                        ? "border-alert/40 bg-red-50 text-alert"
                        : message.kind === "warning"
                          ? "border-hypo/40 bg-hypo-soft text-[#7c2d12]"
                          : "border-data/30 bg-data-soft text-ink"
                    }`}
                  >
                    <span className="font-semibold">{message.kind === "error" ? t.errorPrefix : message.kind === "warning" ? t.warningPrefix : ""}</span>
                    {message.text}
                  </p>
                )}
              </div>

              <ResultsCard t={t} lang={lang} result={result} />
            </div>
          </div>

          {comparisons.length > 0 && (
            <div className="mt-8" data-testid="comparison">
              <h3 className="text-lg font-bold">{t.compTitle}</h3>
              <p className="mt-1 text-sm text-muted">{t.compText(catLabel, fm(thresholdM), scope)}</p>
              <div className="relative mt-3 overflow-x-auto rounded-xl border border-line" tabIndex={0} role="region" aria-label={t.compRegion}>
                <table className="w-full min-w-[640px] text-left text-sm tabular">
                  <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
                    <tr>
                      {t.compHead.map((hd) => (
                        <th key={hd} scope="col" className="px-3 py-2">
                          {hd}
                        </th>
                      ))}
                      <th scope="col" className="px-3 py-2">
                        <span className="sr-only">{t.action}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-line">
                      <th scope="row" className="px-3 py-2 font-medium">{t.baseline}</th>
                      <td className="px-3 py-2 text-muted">{t.onlyExisting}</td>
                      <td className="px-3 py-2">{result.before.withinCount} / {result.before.pointCount}</td>
                      <td className="px-3 py-2">{fm(result.before.meanM)}</td>
                      <td className="px-3 py-2">{fm(result.before.medianM)}</td>
                      <td className="px-3 py-2">{result.canalBelt.before.withinCount} / {result.canalBelt.before.pointCount}</td>
                      <td />
                    </tr>
                    {comparisons.map((c) => (
                      <tr key={c.label} className={`border-t border-line ${best === c ? "bg-hypo-soft/60" : ""}`}>
                        <th scope="row" className="px-3 py-2 font-medium">
                          {t.scenario(c.label)} {best === c && comparisons.length > 1 && <span className="ml-1 text-xs font-semibold text-hypo">{t.bestRow}</span>}
                        </th>
                        <td className="px-3 py-2 font-mono text-xs">{c.hypotheticals.map((h) => (h.path ? t.canalLinePark : `${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}`)).join(" · ")}</td>
                        <td className="px-3 py-2">
                          {c.result.after.withinCount} / {c.result.after.pointCount}{" "}
                          <span className="text-muted">({c.result.change.withinGained >= 0 ? "+" : ""}{c.result.change.withinGained})</span>
                        </td>
                        <td className="px-3 py-2">{fm(c.result.after.meanM)}</td>
                        <td className="px-3 py-2">{fm(c.result.after.medianM)}</td>
                        <td className="px-3 py-2">{c.result.canalBelt.after.withinCount} / {c.result.canalBelt.after.pointCount}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSaved((sv) => sv.filter((x) => !(x.label === c.label && x.category === category)))}
                            className="text-xs text-alert underline"
                            aria-label={t.delLabel(c.label)}
                          >
                            {t.del}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {best && comparisons.length > 1 && <p className="mt-2 text-sm text-ink-soft">{t.bestNote}</p>}
            </div>
          )}

          <TextAlternative t={t} lang={lang} result={result} thresholdM={thresholdM} category={category} scope={scope} />
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
        </div>
      </section>

      <section id="oncelikler" aria-labelledby="oncelik-baslik" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <PrioritiesForm value={priorities} onChange={setPriorities} neighbourhoods={dataset.neighbourhoods.map((n) => n.name)} />
      </section>

      <section id="rapor" aria-labelledby="rapor-baslik" className="border-y border-line bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-data">{t.reportKicker}</p>
          <h2 id="rapor-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">
            {t.reportTitle}
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="text-ink-soft">
              <p>{t.reportIntro}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {t.reportItems(evaluationPoints.length).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-paper p-5">
              <dl className="space-y-1 text-sm tabular">
                <div className="flex justify-between gap-3"><dt className="text-muted">{t.reportDl.category}</dt><dd className="font-medium">{catLabel}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">{t.reportDl.hyps}</dt><dd className="font-medium">{visibleHyps.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">{t.reportDl.saved}</dt><dd className="font-medium">{comparisons.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">{t.reportDl.priorities}</dt><dd className="font-medium">{priorities.priority ? t.reportDl.added : t.reportDl.none}</dd></div>
              </dl>
              {visibleHyps.length === 0 && <p className="mt-3 text-xs text-ink-soft">{t.reportNoHyp}</p>}
              <button
                type="button"
                onClick={generateReport}
                disabled={reportState.busy}
                className="mt-4 min-h-12 w-full rounded-lg bg-data px-4 font-semibold text-white hover:bg-[#115e59] disabled:opacity-60"
              >
                {reportState.busy ? t.reportBusy : t.reportButton}
              </button>
              <div aria-live="polite" className="mt-2 text-sm">
                {reportState.done && (
                  <p className="text-data" data-testid="report-done">
                    {t.reportDone} <span className="font-mono text-xs">{reportState.done}</span>
                  </p>
                )}
                {reportState.error && <p role="alert" className="text-alert">{reportState.error}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MapLegend({ t, category, threshold }: { t: Dict; category: Category; threshold: string }) {
  const L = t.legend;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft" aria-label={t.legendLabel}>
      <li className="flex items-center gap-2"><span className="inline-block h-1 w-6 rounded bg-water" />{L.canal}</li>
      <li className="flex items-center gap-2"><span className="inline-block h-0 w-6 border-t-2 border-dashed border-ink" />{L.study}</li>
      <li className="flex items-center gap-2">
        <span className={`ka-marker ${category === "swimming" ? "ka-marker--swim" : "ka-marker--park"}`} style={category === "swimming" ? { width: 16, height: 16, fontSize: 9 } : { width: 12, height: 12 }}>{category === "swimming" ? "H" : ""}</span>
        {L.active}
      </li>
      <li className="flex items-center gap-2">
        {category === "swimming" ? (
          <span className="ka-marker ka-marker--swim ka-marker--faded" style={{ width: 14, height: 14, fontSize: 8 }}>h</span>
        ) : (
          <span className="ka-marker ka-marker--park ka-marker--faded" style={{ width: 10, height: 10 }} />
        )}
        {L.inactive}
      </li>
      <li className="flex items-center gap-2"><span className="ka-marker ka-marker--excluded" style={{ width: 14, height: 14, fontSize: 9 }}>×</span>{L.excluded}</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border-2 border-data bg-data" />{L.within(threshold)}</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink-soft bg-white" />{L.outside}</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border-2 border-hypo bg-amber-400" />{L.nearestHyp}</li>
      <li className="flex items-center gap-2"><span className="ka-marker ka-marker--hypo" style={{ width: 14, height: 14, fontSize: 9 }}><span>+</span></span>{L.hyp}</li>
    </ul>
  );
}

function Bar({ value, total, tone, label }: { value: number; total: number; tone: "data" | "hypo"; label: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted"><span>{label}</span><span className="tabular">{value} / {total}</span></div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className={`h-full rounded-full ${tone === "data" ? "bg-data" : "bg-hypo"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultsCard({ t, lang, result: r }: { t: Dict; lang: Lang; result: ScenarioResult }) {
  const has = r.hypotheticalCount > 0;
  const fm = (m: number | null) => fmtMeters(m, lang);
  const fd = (m: number | null) => fmtDelta(m, lang);
  const rows: [string, string, string, string][] = [
    [t.meanDist, fm(r.before.meanM), has ? fm(r.after.meanM) : "—", has ? fd(r.change.meanDeltaM) : "—"],
    [t.medianDist, fm(r.before.medianM), has ? fm(r.after.medianM) : "—", has ? fd(r.change.medianDeltaM) : "—"],
    [t.farthest, fm(r.before.maxM), has ? fm(r.after.maxM) : "—", has && r.before.maxM !== null && r.after.maxM !== null ? fd(r.after.maxM - r.before.maxM) : "—"],
  ];
  const beltGain = r.canalBelt.after.withinCount - r.canalBelt.before.withinCount;
  return (
    <section aria-labelledby="sonuc-baslik" className="rounded-xl border border-line bg-white p-4 shadow-sm" data-testid="results">
      <h3 id="sonuc-baslik" className="text-sm font-semibold">{t.step3}</h3>
      <p className="mt-2 text-sm text-ink-soft">{t.withinCard(fm(r.thresholdM))}</p>
      <p className="mt-1 flex items-baseline gap-2 text-3xl font-bold tabular" data-testid="within-headline">
        <span>{r.before.withinCount}</span>
        {has && (
          <>
            <span className="text-lg text-muted" aria-hidden="true">→</span>
            <span className="text-hypo">{r.after.withinCount}</span>
            <span className="text-base font-semibold text-hypo">({r.change.withinGained >= 0 ? "+" : ""}{r.change.withinGained})</span>
          </>
        )}
        <span className="text-base font-normal text-muted">/ {r.before.pointCount}</span>
        <span className="sr-only">{has ? t.srBeforeAfter(r.before.withinCount, r.after.withinCount) : ""}</span>
      </p>
      <div className="mt-3 space-y-2">
        <Bar value={r.before.withinCount} total={r.before.pointCount} tone="data" label={t.barBaseline} />
        {has && <Bar value={r.after.withinCount} total={r.after.pointCount} tone="hypo" label={t.barScenario} />}
      </div>

      <table className="mt-4 w-full text-sm tabular">
        <caption className="sr-only">{t.statsCaption}</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            {t.statsHead.map((hd) => (
              <th key={hd} scope="col" className="pb-1 font-medium">
                {hd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, b, a, d]) => (
            <tr key={l} className="border-t border-line">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-soft">{l}</th>
              <td className="py-1.5">{b}</td>
              <td className="py-1.5">{a}</td>
              <td className="py-1.5">{d}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-soft">{t.beltRow}</th>
            <td className="py-1.5">{r.canalBelt.before.withinCount}/{r.canalBelt.before.pointCount}</td>
            <td className="py-1.5">{has ? `${r.canalBelt.after.withinCount}/${r.canalBelt.after.pointCount}` : "—"}</td>
            <td className="py-1.5">{has ? `${beltGain >= 0 ? "+" : ""}${beltGain}` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted">{t.beltNote(CANAL_BELT_M)}</p>

      <p className="mt-3 rounded-lg bg-paper p-3 text-sm leading-relaxed text-ink" data-testid="interpretation">{interpretResult(r, lang)}</p>
      {r.notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-[#7c2d12]">
          {r.notes.map((n) => <li key={n}>⚠ {n}</li>)}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-snug text-muted">{t.resultsFoot(r.baselineFacilityCount)}</p>
    </section>
  );
}

function TextAlternative({ t, lang, result, thresholdM, category, scope }: { t: Dict; lang: Lang; result: ScenarioResult; thresholdM: number; category: Category; scope: DataScope }) {
  const [sort, setSort] = useState<"id" | "improved" | "far">("id");
  const fm = (m: number | null | undefined) => fmtMeters(m, lang);
  const pointsById = useMemo(() => new Map(evaluationPoints.map((p) => [p.id, p])), []);
  const facilityName = useMemo(() => new Map(dataset.facilities.map((f) => [f.id, f.name])), []);
  const rows = useMemo(() => {
    const rs = [...result.points];
    if (sort === "improved") rs.sort((a, b) => (a.deltaM ?? 0) - (b.deltaM ?? 0));
    if (sort === "far") rs.sort((a, b) => (b.after?.distanceM ?? Infinity) - (a.after?.distanceM ?? Infinity));
    return rs;
  }, [result, sort]);
  const catFacilities = dataset.facilities.filter((f) => f.category === category);
  const activeSet = new Set(activeFacilities(dataset.facilities, category, scope).map((f) => f.id));

  return (
    <div className="mt-8 space-y-3">
      <details className="rounded-xl border border-line bg-paper p-4 open:bg-white">
        <summary className="cursor-pointer text-sm font-semibold">{t.tableSummary(result.points.length)}</summary>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label htmlFor="sort">{t.sortBy}</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="min-h-9 rounded-md border border-line bg-white px-2">
            <option value="id">{t.sortOpts.id}</option>
            <option value="improved">{t.sortOpts.improved}</option>
            <option value="far">{t.sortOpts.far}</option>
          </select>
        </div>
        <div className="relative mt-3 max-h-[420px] overflow-auto" tabIndex={0} role="region" aria-label={t.pointsRegion}>
          <table className="w-full min-w-[720px] text-left text-sm tabular" data-testid="points-table">
            <caption className="sr-only">{t.pointsCaption}</caption>
            <thead className="sticky top-0 bg-white text-xs text-muted">
              <tr>
                {t.pointsHead(fm(thresholdM)).map((hd) => (
                  <th key={hd} scope="col" className="py-1 pr-2">
                    {hd}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = pointsById.get(r.pointId)!;
                return (
                  <tr key={r.pointId} className="border-t border-line">
                    <th scope="row" className="py-1 pr-2 font-mono font-medium">{r.pointId}</th>
                    <td className="py-1 pr-2">{p.nearLabel ?? "—"}</td>
                    <td className="py-1 pr-2">{fm(p.canalDistanceM)}</td>
                    <td className="py-1 pr-2">{fm(r.before?.distanceM)}</td>
                    <td className="py-1 pr-2">{fm(r.after?.distanceM)}</td>
                    <td className="py-1 pr-2">{fmtDelta(r.deltaM, lang)}</td>
                    <td className="py-1 pr-2">{r.withinAfter ? t.yes : t.no}</td>
                    <td className="py-1 pr-2">
                      {r.after ? (r.after.hypothetical ? t.hypFacility : (facilityName.get(r.after.facilityId) ?? t.unnamedRecord)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <details className="rounded-xl border border-line bg-paper p-4 open:bg-white">
        <summary className="cursor-pointer text-sm font-semibold">{t.facSummary(category, catFacilities.length, activeSet.size)}</summary>
        <div className="relative mt-3 max-h-[420px] overflow-auto" tabIndex={0} role="region" aria-label={t.facRegion}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">{t.facCaption}</caption>
            <thead className="sticky top-0 bg-white text-xs text-muted">
              <tr>
                {t.facHead.map((hd) => (
                  <th key={hd} scope="col" className="py-1 pr-2">
                    {hd}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...catFacilities]
                .sort((a, b) => Number(activeSet.has(b.id)) - Number(activeSet.has(a.id)) || Number(!!b.name) - Number(!!a.name))
                .map((f) => (
                  <tr key={f.id} className="border-t border-line align-top">
                    <td className="py-1 pr-2">{f.name ?? <span className="text-muted">{t.unnamed}</span>}</td>
                    <td className="py-1 pr-2" title={t.statusHelp[f.status]}>{t.status[f.status]}</td>
                    <td className="py-1 pr-2">{activeSet.has(f.id) ? t.yes : t.no}</td>
                    <td className="py-1 pr-2 text-xs text-ink-soft">{t.tierReason(f)}</td>
                    <td className="py-1 pr-2 text-xs">
                      {f.sources.map((src) => (
                        <a key={src.osmId} href={osmUrl(src)} target="_blank" rel="noreferrer" className="mr-1 underline">
                          {src.osmType}/{src.osmId}
                        </a>
                      ))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

"use client";

/**
 * Interactive part of KanalAtlas: scenario workbench (map + results),
 * personal priorities and PDF report. Holds all scenario state; every
 * number displayed is computed by src/lib/scenario.ts from that state.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CANDIDATE_SPACING_M, candidateSites, dataset, evaluationPoints, osmUrl } from "@/lib/data";
import { STATUS_HELP, STATUS_LABEL } from "@/lib/evidence";
import { offsetMeters } from "@/lib/geo";
import {
  CATEGORY_LABEL,
  DEFAULT_THRESHOLD,
  SCOPE_LABEL,
  THRESHOLD_OPTIONS,
  explainHypotheticals,
  formatDelta,
  formatMeters,
  interpretResult,
} from "@/lib/insights";
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
import PrioritiesForm from "./PrioritiesForm";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted" role="status">
      Harita yükleniyor…
    </div>
  ),
});

const NUDGE_M = 100;
const SAVE_LABELS = ["A", "B", "C"];

interface SavedScenario {
  label: string;
  category: Category;
  hypotheticals: HypotheticalFacility[];
}

type Message = { kind: "error" | "warning" | "info"; text: string } | null;

export default function KanalAtlasApp() {
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
    () => evaluateScenario({ points: evaluationPoints, facilities, category, scope, hypotheticals: visibleHyps, thresholdM }),
    [facilities, category, scope, visibleHyps, thresholdM],
  );
  const resultsById = useMemo(() => new Map(result.points.map((r) => [r.pointId, r])), [result]);
  const explanations = useMemo(
    () => explainHypotheticals(result, visibleHyps, facilities, evaluationPoints),
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
    const t = setTimeout(() => setAnnounce(interpretResult(result)), 400);
    return () => clearTimeout(t);
  }, [result]);

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
        setMessage({ kind: "error", text: `En fazla ${MAX_HYPOTHETICALS} varsayımsal tesis eklenebilir. Yeni eklemek için birini kaldırın veya taşıyın.` });
        return;
      }
      const v = validateHypothetical({ lat, lon }, studyArea.bbox, active);
      if (!v.ok) {
        setMessage({ kind: "error", text: v.error });
        return;
      }
      const n = nextId.current++;
      setHypotheticals((hs) => [
        ...hs,
        { id: `hyp-${n}`, lat, lon, category, label: `Varsayımsal ${category === "swimming" ? "yüzme tesisi" : "park"} ${n}` },
      ]);
      setPlacing(false);
      setMessage(v.warnings.length ? { kind: "warning", text: v.warnings[0] } : { kind: "info", text: `${source}. Sürükleyerek veya ok düğmeleriyle taşıyabilirsiniz.` });
    },
    [visibleHyps.length, studyArea.bbox, active, category],
  );

  const moveHypothetical = useCallback(
    (id: string, lat: number, lon: number, final: boolean): boolean => {
      dragging.current = !final;
      const v = validateHypothetical({ lat, lon }, studyArea.bbox, active);
      if (!v.ok) {
        if (final) setMessage({ kind: "error", text: v.error + " Tesis son geçerli konumuna geri alındı." });
        return false;
      }
      setHypotheticals((hs) => hs.map((h) => (h.id === id ? { ...h, lat, lon } : h)));
      if (final) setMessage(v.warnings.length ? { kind: "warning", text: v.warnings[0] } : null);
      return true;
    },
    [studyArea.bbox, active],
  );

  const nudge = (h: HypotheticalFacility, dx: number, dy: number) => {
    const p = offsetMeters(h, dx, dy);
    moveHypothetical(h.id, p.lat, p.lon, true);
  };

  const removeHypothetical = (id: string) => {
    if (movingId === id) setMovingId(null);
    setHypotheticals((hs) => hs.filter((h) => h.id !== id));
    setMessage({ kind: "info", text: "Varsayımsal tesis kaldırıldı." });
  };

  const resetScenario = () => {
    setHypotheticals((hs) => hs.filter((h) => h.category !== category));
    setPlacing(false);
    setMessage({ kind: "info", text: "Senaryo sıfırlandı; yalnızca mevcut haritalanmış tesisler gösteriliyor." });
  };

  const onMapClick = useCallback(
    (lat: number, lon: number) => {
      if (movingId) {
        if (moveHypothetical(movingId, lat, lon, true)) {
          setMovingId(null);
          setMessage({ kind: "info", text: "Varsayımsal tesis seçilen yeni konuma taşındı; sonuçlar yeniden hesaplandı." });
        }
        return;
      }
      if (placing) addHypothetical(lat, lon, "Varsayımsal tesis haritada seçilen konuma eklendi");
    },
    [placing, movingId, addHypothetical, moveHypothetical],
  );

  const saveScenario = () => {
    if (visibleHyps.length === 0) return;
    const used = new Set(saved.filter((s) => s.category === category).map((s) => s.label));
    const label = SAVE_LABELS.find((l) => !used.has(l));
    if (!label) {
      setMessage({ kind: "error", text: "En fazla 3 senaryo kaydedilebilir. Karşılaştırma tablosundan birini silin." });
      return;
    }
    setSaved((s) => [...s, { label, category, hypotheticals: visibleHyps.map((h) => ({ ...h })) }]);
    setMessage({ kind: "info", text: `Senaryo ${label} kaydedildi. Tesisi taşıyıp yeni konumu da kaydederek karşılaştırın.` });
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
      });
      const pdfMake = (await import("pdfmake/build/pdfmake")).default;
      const vfs = (await import("pdfmake/build/vfs_fonts")).default;
      pdfMake.addVirtualFileSystem(vfs);
      const name = reportFileName(result, new Date());
      await pdfMake.createPdf(doc).download(name);
      setReportState({ busy: false, done: name });
    } catch (e) {
      console.error(e);
      setReportState({ busy: false, error: "PDF oluşturulamadı. Lütfen sayfayı yenileyip tekrar deneyin." });
    }
  };

  const best = comparisons.length
    ? [...comparisons].sort(
        (a, b) =>
          b.result.after.withinCount - a.result.after.withinCount ||
          (a.result.after.meanM ?? Infinity) - (b.result.after.meanM ?? Infinity),
      )[0]
    : null;

  return (
    <>
      <section id="analiz" aria-labelledby="analiz-baslik" className="border-y border-line bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-data">Senaryo analizi</p>
            <h2 id="analiz-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">
              Haritada bir tesis önerin, etkisini ölçün
            </h2>
            <p className="mt-3 text-ink-soft">
              {studyArea.name}: kesikli çerçevenin içindeki {evaluationPoints.length} örnek nokta için en yakın haritalanmış
              tesise <strong>kuş uçuşu mesafe</strong> hesaplanır. Varsayımsal bir tesis ekleyip sürükleyin; sonuçlar
              her harekette yeniden hesaplanır.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* Map column */}
            <div className="min-w-0">
              <div
                className="relative h-[62vh] min-h-[380px] overflow-hidden rounded-xl border border-line shadow-sm lg:h-[640px]"
                data-testid="map"
              >
                <MapView
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
                  onClick={() => setRecenterToken((t) => t + 1)}
                  className="absolute right-2 top-2 z-[1000] min-h-9 rounded-md border border-line bg-white/95 px-3 text-xs font-semibold shadow hover:border-ink-soft"
                >
                  Alanı ortala
                </button>
                {(placing || movingId) && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3">
                    <p className="rounded-full bg-hypo px-4 py-2 text-center text-sm font-semibold text-white shadow">
                      {movingId ? "Tesisin yeni yerini seçmek için" : "Tesisin yerini seçmek için"} çerçeve içinde haritaya dokunun
                    </p>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute bottom-6 left-2 z-[1000] rounded-lg border border-line bg-white/95 px-3 py-2 shadow-md"
                  aria-hidden="true"
                  data-testid="map-overlay"
                >
                  <p className="text-[11px] font-medium text-muted">{formatMeters(thresholdM)} içindeki örnek nokta</p>
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
                    <p className="text-[11px] text-ink-soft tabular">Ortalama {formatMeters(result.before.meanM)} → {formatMeters(result.after.meanM)}</p>
                  )}
                </div>
              </div>
              <MapLegend category={category} thresholdM={thresholdM} />
            </div>

            {/* Control + results column */}
            <div className="space-y-5">
              <fieldset className="rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-semibold">1. Ne ölçülsün?</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tesis kategorisi">
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
                      {CATEGORY_LABEL[c]}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Kategoriler birbirinin yerine sayılmaz: park, yüzme tesisi eksikliğini kapatmaz.</p>

                <div className="mt-4">
                  <label htmlFor="scope" className="text-sm font-medium">
                    Veri kapsamı
                  </label>
                  <select
                    id="scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value as DataScope)}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm"
                  >
                    {(["core", "all"] as DataScope[]).map((s) => (
                      <option key={s} value={s}>
                        {SCOPE_LABEL[s]} — {activeFacilities(facilities, category, s).length} kayıt
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    {category === "swimming"
                      ? "İsimsiz havuzlar site/otel havuzu olabilir. Kapsamı değiştirerek sonucun veriye ne kadar bağlı olduğunu görün."
                      : "Küçük isimsiz yeşil alanlar site bahçesi olabilir."}
                  </p>
                </div>

                <div className="mt-4">
                  <label htmlFor="threshold" className="text-sm font-medium">
                    Mesafe eşiği (kuş uçuşu)
                  </label>
                  <select
                    id="threshold"
                    value={thresholdM}
                    onChange={(e) => setThresholds((t) => ({ ...t, [category]: Number(e.target.value) }))}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm"
                  >
                    {THRESHOLD_OPTIONS[category].map((t) => (
                      <option key={t} value={t}>
                        {formatMeters(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-hypo/40 bg-hypo-soft/50 p-4">
                <legend className="px-1 text-sm font-semibold">2. Varsayımsal tesis</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPlacing((p) => !p);
                      setMovingId(null);
                      setMessage(null);
                    }}
                    aria-pressed={placing}
                    disabled={visibleHyps.length >= MAX_HYPOTHETICALS}
                    className="min-h-11 rounded-lg bg-hypo px-4 text-sm font-semibold text-white hover:bg-[#92400e] disabled:opacity-50"
                  >
                    {placing ? "Seçimi iptal et" : "Haritada yer seç"}
                  </button>
                  <button
                    type="button"
                    onClick={() => suggestions[0] && addHypothetical(suggestions[0].lat, suggestions[0].lon, `En çok fayda sağlayan aday konuma eklendi (+${suggestions[0].withinGained} nokta)`)}
                    disabled={!suggestions.length || visibleHyps.length >= MAX_HYPOTHETICALS}
                    className="min-h-11 rounded-lg border border-hypo bg-white px-4 text-sm font-semibold text-hypo hover:bg-hypo-soft disabled:opacity-50"
                  >
                    En çok fayda sağlayan konuma ekle
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  “En çok fayda”: {candidateSites.length.toLocaleString("tr-TR")} aday konum ({CANDIDATE_SPACING_M} m aralık) taranır; eşik içine en çok
                  örnek nokta katan konum seçilir (eşitlikte ortalama mesafeyi en çok düşüren). Arazi uygunluğunu bilmez.
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Klavye ile: “En çok fayda sağlayan konuma ekle” düğmesini kullanın, ardından ok düğmeleriyle {NUDGE_M} m adımlarla taşıyın.
                </p>

                {visibleHyps.length > 0 && (
                  <ul className="mt-3 space-y-3" aria-label="Eklenen varsayımsal tesisler">
                    {visibleHyps.map((h) => {
                      const ex = explanations.find((e) => e.id === h.id);
                      return (
                        <li key={h.id} className="rounded-lg border border-hypo/40 bg-white p-3" data-testid="hypothetical">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                <span className="mr-1 rounded bg-hypo px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                                  VARSAYIMSAL
                                </span>
                                {h.label}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-muted" data-testid="hyp-coords">
                                {h.lat.toFixed(5)}, {h.lon.toFixed(5)}
                                {ex?.nearLabel ? ` · ${ex.nearLabel} yakını` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeHypothetical(h.id)}
                              className="min-h-9 rounded-md px-2 text-xs font-medium text-alert underline hover:bg-red-50"
                              aria-label={`${h.label} kaldır`}
                            >
                              Kaldır
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label={`${h.label} taşı`}>
                            {(
                              [
                                ["↑", "Kuzeye", 0, NUDGE_M],
                                ["↓", "Güneye", 0, -NUDGE_M],
                                ["←", "Batıya", -NUDGE_M, 0],
                                ["→", "Doğuya", NUDGE_M, 0],
                              ] as const
                            ).map(([sym, dir, dx, dy]) => (
                              <button
                                key={dir}
                                type="button"
                                onClick={() => nudge(h, dx, dy)}
                                className="h-9 w-9 rounded-md border border-line bg-paper text-base hover:border-ink-soft"
                                aria-label={`${dir} ${NUDGE_M} metre taşı`}
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
                              {movingId === h.id ? "İptal" : "Haritada yeni konum seç"}
                            </button>
                          </div>
                          {ex && (
                            <p className="mt-2 text-xs leading-relaxed text-ink-soft" data-testid="hyp-explanation">
                              <strong>Neden bu sonuç?</strong> {ex.servesPoints.length} örnek noktanın en yakın tesisi olur;{" "}
                              {ex.newlyWithin} tanesi {formatMeters(thresholdM)} eşiğinin içine yeni girer. En yakın mevcut{" "}
                              {category === "swimming" ? "yüzme tesisine" : "parka"} uzaklığı{" "}
                              {ex.nearestExisting ? formatMeters(ex.nearestExisting.distanceM) : "tanımsız (hiç yok)"}
                              {ex.nearestExisting && ex.nearestExisting.distanceM < thresholdM
                                ? " — mevcut bir tesise yakın olduğu için etkisi sınırlı kalır."
                                : ex.nearestExisting
                                  ? " — mevcut tesislerden uzak bir boşluğu dolduruyor."
                                  : "."}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <label className="flex min-h-9 items-center gap-2">
                    <input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} className="h-4 w-4" />
                    En yakın tesis çizgileri
                  </label>
                  <label className="flex min-h-9 items-center gap-2">
                    <input type="checkbox" checked={showSuggestions} onChange={(e) => setShowSuggestions(e.target.checked)} className="h-4 w-4" />
                    Öneri konumlarını göster
                  </label>
                </div>
                {visibleHyps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveScenario}
                      className="min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
                    >
                      Bu senaryoyu kaydet
                    </button>
                    <button type="button" onClick={resetScenario} className="min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:border-ink-soft">
                      Senaryoyu sıfırla
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
                    <span className="font-semibold">{message.kind === "error" ? "Hata: " : message.kind === "warning" ? "Uyarı: " : ""}</span>
                    {message.text}
                  </p>
                )}
              </div>

              <ResultsCard result={result} />
            </div>
          </div>

          {comparisons.length > 0 && (
            <div className="mt-8" data-testid="comparison">
              <h3 className="text-lg font-bold">Kaydedilen senaryoların karşılaştırması</h3>
              <p className="mt-1 text-sm text-muted">
                Her senaryo şu anki ayarlarla ({CATEGORY_LABEL[category]}, {formatMeters(thresholdM)} eşik, {scope === "core" ? "temel veri" : "tüm kayıtlar"}) yeniden hesaplanır; böylece aynı yöntemle karşılaştırılır.
              </p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-left text-sm tabular">
                  <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2">Senaryo</th>
                      <th scope="col" className="px-3 py-2">Konum(lar)</th>
                      <th scope="col" className="px-3 py-2">Eşik içinde</th>
                      <th scope="col" className="px-3 py-2">Ortalama</th>
                      <th scope="col" className="px-3 py-2">Medyan</th>
                      <th scope="col" className="px-3 py-2">Kanal kuşağında eşik içi</th>
                      <th scope="col" className="px-3 py-2"><span className="sr-only">İşlem</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-line">
                      <th scope="row" className="px-3 py-2 font-medium">Başlangıç</th>
                      <td className="px-3 py-2 text-muted">yalnızca mevcut tesisler</td>
                      <td className="px-3 py-2">{result.before.withinCount} / {result.before.pointCount}</td>
                      <td className="px-3 py-2">{formatMeters(result.before.meanM)}</td>
                      <td className="px-3 py-2">{formatMeters(result.before.medianM)}</td>
                      <td className="px-3 py-2">{result.canalBelt.before.withinCount} / {result.canalBelt.before.pointCount}</td>
                      <td />
                    </tr>
                    {comparisons.map((c) => (
                      <tr key={c.label} className={`border-t border-line ${best === c ? "bg-hypo-soft/60" : ""}`}>
                        <th scope="row" className="px-3 py-2 font-medium">
                          Senaryo {c.label} {best === c && comparisons.length > 1 && <span className="ml-1 text-xs font-semibold text-hypo">(bu ölçüte göre en iyi)</span>}
                        </th>
                        <td className="px-3 py-2 font-mono text-xs">{c.hypotheticals.map((h) => `${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}`).join(" · ")}</td>
                        <td className="px-3 py-2">
                          {c.result.after.withinCount} / {c.result.after.pointCount}{" "}
                          <span className="text-muted">({c.result.change.withinGained >= 0 ? "+" : ""}{c.result.change.withinGained})</span>
                        </td>
                        <td className="px-3 py-2">{formatMeters(c.result.after.meanM)}</td>
                        <td className="px-3 py-2">{formatMeters(c.result.after.medianM)}</td>
                        <td className="px-3 py-2">{c.result.canalBelt.after.withinCount} / {c.result.canalBelt.after.pointCount}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSaved((s) => s.filter((x) => !(x.label === c.label && x.category === category)))}
                            className="text-xs text-alert underline"
                            aria-label={`Senaryo ${c.label} sil`}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {best && comparisons.length > 1 && (
                <p className="mt-2 text-sm text-ink-soft">
                  “En iyi”, önce eşik içine giren nokta sayısına, eşitlikte daha düşük ortalama mesafeye göre belirlenir. Bu bir
                  sıralama ölçütüdür; arazi, maliyet veya uygulanabilirlik değerlendirmesi değildir.
                </p>
              )}
            </div>
          )}

          <TextAlternative result={result} thresholdM={thresholdM} category={category} scope={scope} />
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
          <p className="text-sm font-semibold uppercase tracking-wide text-data">Planlama özeti</p>
          <h2 id="rapor-baslik" className="mt-1 text-2xl font-bold sm:text-3xl">
            Bulguları PDF rapor olarak indirin
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="text-ink-soft">
              <p>Rapor, ekrandaki senaryonun o anki durumundan üretilir ve şunları içerir:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>Çalışma alanı, kategori, veri kapsamı ve eşik</li>
                <li>Analize dahil tesisler, kaynakları ve doğrulama durumu</li>
                <li>Varsayımsal tesis konumları ve “neden bu sonuç” açıklaması</li>
                <li>Önce/sonra tablosu, kanal kuşağı alt kümesi ve şematik harita</li>
                <li>Kaydettiğiniz senaryoların aynı yöntemle karşılaştırması</li>
                <li>Kendi öncelikleriniz (kişisel girdi olarak etiketlenir)</li>
                <li>Yöntem, sınırlılıklar, kaynaklar ve planlamacılara sorular</li>
                <li>Tüm {evaluationPoints.length} örnek noktanın tablo hâlinde sonuçları</li>
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-paper p-5">
              <dl className="space-y-1 text-sm tabular">
                <div className="flex justify-between gap-3"><dt className="text-muted">Kategori</dt><dd className="font-medium">{CATEGORY_LABEL[category]}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Varsayımsal tesis</dt><dd className="font-medium">{visibleHyps.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Kaydedilen senaryo</dt><dd className="font-medium">{comparisons.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Öncelikler</dt><dd className="font-medium">{priorities.priority ? "eklenecek" : "girilmedi"}</dd></div>
              </dl>
              {visibleHyps.length === 0 && (
                <p className="mt-3 text-xs text-ink-soft">Varsayımsal tesis eklemediniz; rapor yalnızca başlangıç durumunu içerecek.</p>
              )}
              <button
                type="button"
                onClick={generateReport}
                disabled={reportState.busy}
                className="mt-4 min-h-12 w-full rounded-lg bg-data px-4 font-semibold text-white hover:bg-[#115e59] disabled:opacity-60"
              >
                {reportState.busy ? "PDF hazırlanıyor…" : "PDF raporu oluştur ve indir"}
              </button>
              <div aria-live="polite" className="mt-2 text-sm">
                {reportState.done && <p className="text-data" data-testid="report-done">İndirildi: <span className="font-mono text-xs">{reportState.done}</span></p>}
                {reportState.error && <p role="alert" className="text-alert">{reportState.error}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MapLegend({ category, thresholdM }: { category: Category; thresholdM: number }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft" aria-label="Harita açıklaması">
      <li className="flex items-center gap-2"><span className="inline-block h-1 w-6 rounded bg-water" />Haritalanmış açık kanal (kesikli: menfez)</li>
      <li className="flex items-center gap-2"><span className="inline-block h-0 w-6 border-t-2 border-dashed border-ink" />Çalışma alanı</li>
      <li className="flex items-center gap-2">
        <span className={`ka-marker ${category === "swimming" ? "ka-marker--swim" : "ka-marker--park"}`} style={{ width: 16, height: 16, fontSize: 9 }}>{category === "swimming" ? "H" : "P"}</span>
        Analize dahil mevcut tesis (HARİTALANMIŞ)
      </li>
      <li className="flex items-center gap-2"><span className="ka-marker ka-marker--swim ka-marker--faded" style={{ width: 14, height: 14, fontSize: 8 }}>h</span>Bu kapsamda sayılmayan kayıt</li>
      <li className="flex items-center gap-2"><span className="ka-marker ka-marker--excluded" style={{ width: 14, height: 14, fontSize: 9 }}>×</span>Erişimi kısıtlı (hariç)</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border-2 border-data bg-data" />Örnek nokta: {formatMeters(thresholdM)} içinde</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border-2 border-ink-soft bg-white" />Örnek nokta: eşik dışında</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full border-2 border-hypo bg-amber-400" />Varsayımsal tesise en yakın</li>
      <li className="flex items-center gap-2"><span className="ka-marker ka-marker--hypo" style={{ width: 14, height: 14, fontSize: 9 }}><span>+</span></span>Varsayımsal tesis ve eşik yarıçapı</li>
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

function ResultsCard({ result: r }: { result: ScenarioResult }) {
  const has = r.hypotheticalCount > 0;
  const rows: [string, string, string, string][] = [
    ["Ortalama mesafe", formatMeters(r.before.meanM), has ? formatMeters(r.after.meanM) : "—", has ? formatDelta(r.change.meanDeltaM) : "—"],
    ["Medyan mesafe", formatMeters(r.before.medianM), has ? formatMeters(r.after.medianM) : "—", has ? formatDelta(r.change.medianDeltaM) : "—"],
    ["En uzak nokta", formatMeters(r.before.maxM), has ? formatMeters(r.after.maxM) : "—", has && r.before.maxM !== null && r.after.maxM !== null ? formatDelta(r.after.maxM - r.before.maxM) : "—"],
  ];
  return (
    <section aria-labelledby="sonuc-baslik" className="rounded-xl border border-line bg-white p-4 shadow-sm" data-testid="results">
      <h3 id="sonuc-baslik" className="text-sm font-semibold">3. Sonuç</h3>
      <p className="mt-2 text-sm text-ink-soft">
        {formatMeters(r.thresholdM)} içinde kalan örnek harita noktası
      </p>
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
        <span className="sr-only">{has ? `Başlangıçta ${r.before.withinCount}, senaryoda ${r.after.withinCount}` : ""}</span>
      </p>
      <div className="mt-3 space-y-2">
        <Bar value={r.before.withinCount} total={r.before.pointCount} tone="data" label="Başlangıç" />
        {has && <Bar value={r.after.withinCount} total={r.after.pointCount} tone="hypo" label="Varsayımsal senaryo" />}
      </div>

      <table className="mt-4 w-full text-sm tabular">
        <caption className="sr-only">Önce ve sonra mesafe istatistikleri</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="pb-1 font-medium">Ölçüt</th>
            <th scope="col" className="pb-1 font-medium">Önce</th>
            <th scope="col" className="pb-1 font-medium">Sonra</th>
            <th scope="col" className="pb-1 font-medium">Fark</th>
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
            <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-soft">
              Kanal kuşağı* eşik içi
            </th>
            <td className="py-1.5">{r.canalBelt.before.withinCount}/{r.canalBelt.before.pointCount}</td>
            <td className="py-1.5">{has ? `${r.canalBelt.after.withinCount}/${r.canalBelt.after.pointCount}` : "—"}</td>
            <td className="py-1.5">{has ? `${r.canalBelt.after.withinCount - r.canalBelt.before.withinCount >= 0 ? "+" : ""}${r.canalBelt.after.withinCount - r.canalBelt.before.withinCount}` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted">*Haritalanmış kanala {CANAL_BELT_M} m veya daha yakın örnek noktalar.</p>

      <p className="mt-3 rounded-lg bg-paper p-3 text-sm leading-relaxed text-ink" data-testid="interpretation">{interpretResult(r)}</p>
      {r.notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-[#7c2d12]">
          {r.notes.map((n) => <li key={n}>⚠ {n}</li>)}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-snug text-muted">
        Analizde {r.baselineFacilityCount} haritalanmış tesis var. Kuş uçuşu mesafe yürüme mesafesi değildir; örnek noktalar
        nüfusu temsil etmez; bu araç boğulma riski tahmin etmez.
      </p>
    </section>
  );
}

function TextAlternative({ result, thresholdM, category, scope }: { result: ScenarioResult; thresholdM: number; category: Category; scope: DataScope }) {
  const [sort, setSort] = useState<"id" | "improved" | "far">("id");
  const pointsById = useMemo(() => new Map(evaluationPoints.map((p) => [p.id, p])), []);
  const facilityName = useMemo(() => new Map(dataset.facilities.map((f) => [f.id, f.name ?? "isimsiz kayıt"])), []);
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
        <summary className="cursor-pointer text-sm font-semibold">Harita yerine tablo: {result.points.length} örnek noktanın sonuçları</summary>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label htmlFor="sort">Sırala:</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="min-h-9 rounded-md border border-line bg-white px-2">
            <option value="id">Nokta kodu</option>
            <option value="improved">En çok kısalan mesafe</option>
            <option value="far">En uzak (senaryo sonrası)</option>
          </select>
        </div>
        <div className="mt-3 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm tabular" data-testid="points-table">
            <caption className="sr-only">Örnek noktalar için önce ve sonra en yakın tesis mesafeleri</caption>
            <thead className="sticky top-0 bg-white text-xs text-muted">
              <tr>
                <th scope="col" className="py-1 pr-2">Nokta</th>
                <th scope="col" className="py-1 pr-2">Yakın mahalle (yaklaşık)</th>
                <th scope="col" className="py-1 pr-2">Kanala</th>
                <th scope="col" className="py-1 pr-2">Önce</th>
                <th scope="col" className="py-1 pr-2">Sonra</th>
                <th scope="col" className="py-1 pr-2">Fark</th>
                <th scope="col" className="py-1 pr-2">{formatMeters(thresholdM)} içinde</th>
                <th scope="col" className="py-1 pr-2">En yakın (sonra)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = pointsById.get(r.pointId)!;
                return (
                  <tr key={r.pointId} className="border-t border-line">
                    <th scope="row" className="py-1 pr-2 font-mono font-medium">{r.pointId}</th>
                    <td className="py-1 pr-2">{p.nearLabel ?? "—"}</td>
                    <td className="py-1 pr-2">{formatMeters(p.canalDistanceM)}</td>
                    <td className="py-1 pr-2">{formatMeters(r.before?.distanceM)}</td>
                    <td className="py-1 pr-2">{formatMeters(r.after?.distanceM)}</td>
                    <td className="py-1 pr-2">{formatDelta(r.deltaM)}</td>
                    <td className="py-1 pr-2">{r.withinAfter ? "Evet" : "Hayır"}</td>
                    <td className="py-1 pr-2">{r.after ? (r.after.hypothetical ? "Varsayımsal tesis" : facilityName.get(r.after.facilityId)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <details className="rounded-xl border border-line bg-paper p-4 open:bg-white">
        <summary className="cursor-pointer text-sm font-semibold">
          Haritalanmış {category === "swimming" ? "yüzme tesisleri" : "parklar"} listesi ({catFacilities.length} kayıt, {activeSet.size} tanesi analizde)
        </summary>
        <div className="mt-3 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Haritalanmış tesisler, doğrulama durumları ve kaynakları</caption>
            <thead className="sticky top-0 bg-white text-xs text-muted">
              <tr>
                <th scope="col" className="py-1 pr-2">Ad</th>
                <th scope="col" className="py-1 pr-2">Durum</th>
                <th scope="col" className="py-1 pr-2">Analizde</th>
                <th scope="col" className="py-1 pr-2">Gerekçe</th>
                <th scope="col" className="py-1 pr-2">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {[...catFacilities]
                .sort((a, b) => Number(activeSet.has(b.id)) - Number(activeSet.has(a.id)) || Number(!!b.name) - Number(!!a.name))
                .map((f) => (
                  <tr key={f.id} className="border-t border-line align-top">
                    <td className="py-1 pr-2">{f.name ?? <span className="text-muted">İsimsiz</span>}</td>
                    <td className="py-1 pr-2" title={STATUS_HELP[f.status]}>{STATUS_LABEL[f.status]}</td>
                    <td className="py-1 pr-2">{activeSet.has(f.id) ? "Evet" : "Hayır"}</td>
                    <td className="py-1 pr-2 text-xs text-ink-soft">{f.tierReason}</td>
                    <td className="py-1 pr-2 text-xs">
                      {f.sources.map((s) => (
                        <a key={s.osmId} href={osmUrl(s)} target="_blank" rel="noreferrer" className="mr-1 underline">
                          {s.osmType}/{s.osmId}
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

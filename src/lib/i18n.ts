/**
 * Interface strings in English (default) and Turkish. Components receive the
 * dictionary for the active language; calculations never depend on language.
 */
import type { Category, DataScope, Facility, VerificationStatus } from "./types";

export type Lang = "en" | "tr";
export const LANGS: Lang[] = ["en", "tr"];
export const LANG_STORAGE_KEY = "kanalatlas.lang.v1";

const nf = (lang: Lang, digits: number, min = 0) =>
  new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-GB", { maximumFractionDigits: digits, minimumFractionDigits: min });

export function fmtMeters(m: number | null | undefined, lang: Lang): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return lang === "tr" ? "tanımsız" : "undefined";
  if (Math.abs(m) >= 1000) return `${nf(lang, 2, 2).format(m / 1000)} km`;
  return `${nf(lang, 0).format(Math.round(m))} m`;
}

export function fmtDelta(m: number | null | undefined, lang: Lang): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return "—";
  if (Math.round(m) === 0) return lang === "tr" ? "değişmedi" : "no change";
  return `${m < 0 ? "−" : "+"}${fmtMeters(Math.abs(m), lang)}`;
}

export const fmtInt = (n: number, lang: Lang) => n.toLocaleString(lang === "tr" ? "tr-TR" : "en-GB");

const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;

const en = {
  lang: "en" as Lang,
  // ---- chrome
  skipToMap: "Skip to the map",
  navLabel: "Main navigation",
  nav: { problem: "Problem", map: "Map & scenarios", priorities: "Priorities", report: "Report", method: "Method & sources" },
  openMap: "Open the map",
  langSwitch: "Türkçe",
  langSwitchLabel: "Türkçe'ye geç (switch to Turkish)",
  // ---- hero
  heroKicker: "Adana · Seyhan district · open-source prototype",
  heroTitle: ["Explore your neighbourhood.", "See what it needs.", "Imagine its future together."],
  heroText:
    "Open irrigation canals run through neighbourhoods in Adana, and summers are extremely hot. KanalAtlas measures how far people are from mapped swimming facilities and parks along one canal corridor, tests where a new one would help most, and turns the result into a sourced planning brief.",
  heroQuestion: "Where would a new swimming pool make the biggest difference in Adana?",
  heroAnswer: [
    "Open irrigation canals run through Adana's neighbourhoods, and the city council itself names drowning in them as a reason for its free swimming lessons.",
    "KanalAtlas measures how far each part of a canal corridor is from mapped pools and parks — then lets you drop in a new one, move it, and see the difference instantly.",
  ],
  steps: [
    { title: "Explore", text: "See the real canal corridor, the mapped pools and parks, and today's baseline." },
    { title: "Test a solution", text: "Add a hypothetical pool or park, drag it, and watch the numbers recalculate." },
    { title: "Compare & share", text: "Compare locations side by side and download an evidence-based PDF brief." },
  ],
  heroCta: "Find a promising location",
  heroCta2: "How we calculate",
  illustrationLabel: "Abstract drawing of a canal line, sample points and one hypothetical facility",
  illustrationNote: "Abstract drawing; the real map is in the analysis section below.",
  // ---- problem
  problemTitle: "A documented local problem, scattered information",
  cards: [
    {
      title: "Canals and drowning risk, in an official document",
      text: "Adana Metropolitan Council's decision of 12 June 2026 lists preventing drownings in unsafe places such as irrigation canals among the reasons for its free swimming lessons.",
      link: "Council decisions, June 2026 (pp. 74–75)",
    },
    {
      title: "Swimming programmes exist — but where?",
      text: "In summer 2025 the municipality reported free lessons for about 10,000 children in 26 semi-Olympic pools across 10 districts. The announcement lists no locations, so access at neighbourhood level is hard to see.",
      link: "Adana Metropolitan Municipality, 21.07.2025",
    },
    {
      title: "The future of canal corridors is changing",
      text: "The Ministry of Agriculture announced the switch to closed, pressurised irrigation and that open canals through the city centre will be decommissioned. No timeline per section was given.",
      link: "Ministry of Agriculture and Forestry, 10.09.2025",
    },
  ],
  baselineKicker: "Computed from the data for this study area",
  baselineText: (core: number, all: number, allWithin: number, threshold: string) =>
    `sample map points are within ${threshold} (straight line) of one of the ${core} mapped swimming facilities that have a name or swimming tag. Counting unnamed pools too (${all} records) gives ${allWithin} — how much you trust the data is itself a finding.`,
  baselineNote: (n: number, spacing: number, date: string) =>
    `${n} points on a ${spacing} m grid; they do not represent population. Source: OpenStreetMap, extracted ${date}.`,
  diffTitle: "What can it do that a normal map can't?",
  diffs: [
    ["It measures, not just shows:", "the distance from every sample point to its nearest facility, and how many are within reach."],
    ["It answers “what if?”:", "drag a proposed facility and the results recalculate instantly; compare locations with one method."],
    ["It asks about the canal's future:", "what if the canal line became a park after the canals are closed?"],
    ["It is honest about the data:", "every facility shows its source and verification status; unnamed or private pools are kept apart."],
    ["It produces shareable evidence:", "a PDF planning brief with method and limitations."],
  ] as [string, string][],
  // ---- workbench
  analysisKicker: "Scenario analysis",
  analysisTitle: "Propose a facility on the map and measure its effect",
  analysisText: (area: string, n: number) =>
    `${area}: for each of the ${n} sample points inside the dashed box, KanalAtlas measures the straight-line distance to the nearest mapped facility. Add a hypothetical facility and drag it — the results recalculate on every move.`,
  mapLoading: "Loading map…",
  recenter: "Re-centre",
  tapToPlace: "Tap the map inside the box to place the facility",
  tapToMove: "Tap the map inside the box to move the facility",
  withinLabel: (th: string) => `sample points within ${th}`,
  meanLabel: "Mean",
  step1: "1. Explore the baseline",
  baselineLine: (n: number, total: number, th: string, cat: Category) =>
    `Today, ${n} of ${total} sample locations are within ${th} of a mapped ${cat === "swimming" ? "swimming facility" : "park"}.`,
  categoryGroup: "Facility category",
  categoryNote: "Categories are never mixed: a park does not count as a swimming facility.",
  threshold: "Distance threshold (straight line)",
  advanced: "Advanced settings",
  scope: "Data scope",
  scopeOption: (label: string, n: number) => `${label} — ${n} records`,
  scopeHintSwim: "Unnamed pools may be private apartment-complex or hotel pools. Switch the scope to see how much the result depends on the data.",
  scopeHintPark: "Small unnamed green areas may be private gardens.",
  showLinks: "Lines to the nearest facility",
  showSuggestions: "Show suggested locations",
  bestInfo: (n: string, spacing: number) =>
    `“Best location” screens ${n} candidate sites (${spacing} m apart) and picks the one that brings the most sample points within the threshold (ties: largest drop in mean distance). It knows nothing about land availability.`,
  keyboardInfo: (step: number) => `Keyboard: use “Add at the best location”, then move it in ${step} m steps with the arrow buttons.`,
  step2: "2. Test a solution",
  step2Hint: "Let KanalAtlas find a promising spot, or place one yourself. Then drag it around.",
  pickOnMap: "Pick a spot on the map",
  cancelPick: "Cancel",
  addBest: "Find a promising location",
  corridorTitle: "What if the canal is closed?",
  corridorText: (len: string) =>
    `The ministry announced that open canals through the city centre will be decommissioned. Measure access as if this corridor's ${len} mapped canal line became a linear park. Timing and land status are not verified.`,
  corridorButton: "Turn the canal line into a linear park",
  hypList: "Added hypothetical facilities",
  hypBadge: "HYPOTHETICAL",
  hypLabel: (cat: Category, n: number) => `Hypothetical ${cat === "swimming" ? "swimming facility" : "park"} ${n}`,
  corridorLabel: (len: string) => `Canal-line linear park (${len})`,
  alongCanal: (n: number) => `along the canal line · ${n} sections`,
  near: (name: string) => `near ${name}`,
  remove: "Remove",
  removeLabel: (l: string) => `Remove ${l}`,
  moveGroup: (l: string) => `Move ${l}`,
  dirs: { n: "North", s: "South", w: "West", e: "East" },
  moveBy: (dir: string, m: number) => `Move ${m} metres ${dir.toLowerCase()}`,
  pickNew: "Pick a new spot on the map",
  why: "Why this result?",
  whyCorridor: (serves: number, newly: number, th: string) =>
    `Distance is measured to the nearest point on the canal line. The line becomes the nearest park for ${serves} sample points; ${newly} of them newly fall within ${th}. A linear park is a much larger area than a single park, so it should not be compared one-to-one with one new park.`,
  whyPoint: (serves: number, newly: number, th: string, cat: Category, nearest: string | null, closeToExisting: boolean | null) =>
    `It becomes the nearest facility for ${serves} sample points; ${newly} of them newly fall within ${th}. Distance to the nearest existing ${cat === "swimming" ? "swimming facility" : "park"}: ${nearest ?? "undefined (none)"}${
      closeToExisting === null ? "." : closeToExisting ? " — close to an existing facility, so its effect is limited." : " — it fills a gap far from existing facilities."
    }`,
  save: "Save this scenario",
  step3: "3. Compare & share",
  step3Text: "Save a location, move the facility and save again to compare. Then download the planning brief.",
  goReport: "Go to the PDF report",
  showInactive: "Show records not counted (unnamed or private pools)",
  reset: "Reset scenario",
  errorPrefix: "Error: ",
  warningPrefix: "Warning: ",
  msg: {
    max: (n: number) => `You can add at most ${n} hypothetical facilities. Remove or move one to add another.`,
    maxShort: (n: number) => `You can add at most ${n} hypothetical facilities.`,
    added: (src: string) => `${src}. Drag it or use the arrow buttons to move it.`,
    addedBest: (gain: number) => `Added at the most effective candidate location (+${gain} points)`,
    addedPick: "Hypothetical facility added at the chosen spot",
    corridor: "Hypothetical scenario: a linear park along the mapped canal line. Neither the canal's closure nor land availability is verified.",
    reverted: " The facility was returned to its last valid position.",
    removed: "Hypothetical facility removed.",
    reset: "Scenario reset; only existing mapped facilities are shown.",
    moved: "Hypothetical facility moved to the chosen spot; results recalculated.",
    maxSaved: "At most 3 scenarios can be saved. Delete one in the comparison table.",
    saved: (l: string) => `Scenario ${l} saved. Move the facility and save the new location too to compare.`,
    pdfError: "The PDF could not be created. Please reload the page and try again.",
  },
  compTitle: "Comparison of saved scenarios",
  compText: (cat: string, th: string, scope: DataScope) =>
    `Every scenario is recalculated with the current settings (${cat}, ${th} threshold, ${scope === "core" ? "core data" : "all records"}), so they are compared with the same method.`,
  compRegion: "Scenario comparison table (scrollable)",
  compHead: ["Scenario", "Location(s)", "Within threshold", "Mean", "Median", "Canal belt within threshold"],
  action: "Action",
  baseline: "Baseline",
  onlyExisting: "existing facilities only",
  scenario: (l: string) => `Scenario ${l}`,
  bestRow: "(best by this measure)",
  canalLinePark: "canal line (linear park)",
  del: "Delete",
  delLabel: (l: string) => `Delete scenario ${l}`,
  bestNote:
    "“Best” means more points within the threshold, then a lower mean distance. It is a ranking rule, not an assessment of land, cost or feasibility.",
  // ---- results
  resultTitle: "Result",
  tileBefore: "Before",
  tileAfter: "After",
  tileChange: "Change",
  tileWithin: (th: string) => `within ${th}`,
  changeSentence: (gain: number, th: string, cat: Category) =>
    gain > 0
      ? `${gain} more sample location${gain === 1 ? " is" : "s are"} now within ${th} of a ${cat === "swimming" ? "swimming facility" : "park"}.`
      : gain === 0
        ? `No additional sample locations come within ${th}; try another spot.`
        : `${-gain} fewer sample locations within ${th}.`,
  addToSee: "Add a hypothetical facility to see the before-and-after comparison.",
  detailsStats: "Detailed statistics and explanation",
  withinCard: (th: string) => `sample map points within ${th}`,
  srBeforeAfter: (b: number, a: number) => `Baseline ${b}, scenario ${a}`,
  barBaseline: "Baseline",
  barScenario: "Hypothetical scenario",
  statsCaption: "Before and after distance statistics",
  statsHead: ["Measure", "Before", "After", "Change"],
  meanDist: "Mean distance",
  medianDist: "Median distance",
  farthest: "Farthest point",
  beltRow: "Canal belt* within threshold",
  beltNote: (m: number) => `*Sample points ${m} m or closer to a mapped canal.`,
  resultsFoot: (n: number) =>
    `Sample locations are points on a 500 m grid, not people. Distances are straight-line estimates to ${n} mapped facilities.`,
  // ---- legend
  legendLabel: "Map legend",
  legend: {
    canal: "Mapped open canal (dashed: culvert)",
    study: "Study area",
    active: "Existing facility in analysis (MAPPED)",
    inactive: "Record not counted in this scope",
    excluded: "Access restricted (excluded)",
    within: (th: string) => `Sample point: within ${th}`,
    outside: "Sample point: outside threshold",
    nearestHyp: "Closest to a hypothetical facility",
    hyp: "Hypothetical facility and threshold radius",
  },
  // ---- text alternative
  tableSummary: (n: number) => `Table instead of the map: results for ${n} sample points`,
  sortBy: "Sort:",
  sortOpts: { id: "Point code", improved: "Largest distance reduction", far: "Farthest (after scenario)" },
  pointsRegion: "Sample point results table (scrollable)",
  pointsCaption: "Nearest-facility distances before and after for each sample point",
  pointsHead: (th: string) => ["Point", "Nearby neighbourhood (approx.)", "To canal", "Before", "After", "Change", `Within ${th}`, "Nearest (after)"],
  yes: "Yes",
  no: "No",
  hypFacility: "Hypothetical facility",
  unnamedRecord: "unnamed record",
  facSummary: (cat: Category, n: number, active: number) =>
    `List of mapped ${cat === "swimming" ? "swimming facilities" : "parks"} (${n} records, ${active} in the analysis)`,
  facRegion: "Mapped facilities table (scrollable)",
  facCaption: "Mapped facilities, their verification status and sources",
  facHead: ["Name", "Status", "In analysis", "Reason", "Source"],
  unnamed: "Unnamed",
  // ---- map popups/tooltips
  map: {
    aria: "Interactive map of the Seyhan central canal corridor",
    unnamed: "Unnamed record",
    status: "Status:",
    inAnalysis: "In analysis:",
    inYes: "Yes",
    inExcluded: "No (excluded)",
    inScope: "No (not in this data scope)",
    area: (m: string) => `Approx. area: ${m} m²`,
    source: "Source:",
    canal: "Irrigation canal",
    covered: " (mapped as culvert/tunnel)",
    open: " (mapped as open canal)",
    point: (id: string) => `Point ${id}`,
    nearSuffix: (n: string) => ` · near ${n}`,
    beforeAfter: (b: string, a: string) => `Before: ${b} · After: ${a}`,
    inside: (th: string) => `within ${th}`,
    outsideTh: (th: string) => `outside ${th}`,
    nearestHyp: " · closest to the hypothetical facility",
    suggestion: (i: number, near: string | null, gain: number) => `Suggestion ${i}${near ? ` (near ${near})` : ""}: +${gain} sample points within the threshold`,
    hypTooltip: (l: string) => `${l} (HYPOTHETICAL) — drag to move`,
    hypTitle: (l: string) => `${l} — drag to move`,
    corridorTooltip: (l: string) => `${l} — HYPOTHETICAL`,
  },
  prio: {
    kicker: "Personal input",
    title: "What matters in your neighbourhood?",
    intro: "Choose your own priorities; they are added to your report under “Priorities chosen by the user”.",
    notSurvey: "This is not a survey or a vote.",
    notSurveyItems: [
      "Your answers are never sent to a server; they stay only in this browser (localStorage).",
      "You cannot see other people's answers; there is no participation count.",
      "We do not ask for names, addresses, phone numbers or ages. Please do not write them in the note either.",
      "You can delete them at any time or download them as a JSON file.",
    ],
    nbLabel: "Which neighbourhood are you thinking of?",
    optional: "(optional)",
    nbNone: "Prefer not to say",
    nbOutside: "Somewhere outside the study area",
    priorityLegend: "Which improvement would you prioritise?",
    barriersLegend: "What makes existing options hard to use?",
    multi: "(choose any)",
    noteLabel: "Anything else planners should consider?",
    noteHelp: (n: number, max: number) => `${n}/${max} characters. Do not include personal information.`,
    save: "Save my priorities",
    download: "Download as JSON",
    clear: "Delete",
    saved: "Saved. These choices stay only in this browser and are added to the PDF report.",
    savedSession: "Saved for this session. Browser storage is unavailable, so they will be cleared on reload.",
    cleared: "Your choices were deleted from this browser.",
    jsonType: "KanalAtlas personal priorities (not a survey result)",
  },
  // ---- report section
  reportKicker: "Planning brief",
  reportTitle: "Download the findings as a PDF report",
  reportIntro: "The report is generated from the current on-screen scenario and contains:",
  reportItems: (n: number) => [
    "Study area, category, data scope and threshold",
    "Facilities in the analysis, their sources and verification status",
    "Hypothetical facility locations and the “why this result” explanation",
    "Before/after table, canal-belt subset and a schematic map",
    "A same-method comparison of your saved scenarios",
    "Your own priorities (labelled as personal input)",
    "Method, limitations, sources and questions for planners",
    `Results for all ${n} sample points as a table`,
  ],
  reportDl: { category: "Category", hyps: "Hypothetical facilities", saved: "Saved scenarios", priorities: "Priorities", added: "included", none: "not entered" },
  reportNoHyp: "You have not added a hypothetical facility; the report will contain the baseline only.",
  reportBusy: "Preparing PDF…",
  reportButton: "Create and download the PDF report",
  reportDone: "Downloaded:",
  // ---- method section
  methodKicker: "Transparency",
  methodTitle: "Method, sources and limitations",
  howTitle: "How we calculate",
  formulaNote: "R = 6,371,008.8 m · φ latitude, λ longitude (radians)",
  codeNote: "Calculation code: src/lib/scenario.ts and src/lib/geo.ts, with unit tests using hand-calculated expected values. Details: docs/SCENARIO_METHOD.md.",
  notTitle: "What this tool does not tell you",
  statusTitle: "Status labels",
  ledgerTitle: "Source ledger",
  scopeWord: "Scope:",
  osmLedger: "OpenStreetMap contributors — canal, park and pool geometries",
  osmLedgerDate: (d: string) => `extracted ${d}`,
  osmLedgerText: (c: number, f: number, m: number, nb: number, swim: number, parks: number) =>
    `${c} canal segments, ${f} facility records (${m} overlapping records merged), ${nb} neighbourhood labels. The default analysis uses ${swim} swimming facilities and ${parks} parks.`,
  footer1: "KanalAtlas — open-source prototype built for Neighborhood Hacks 2026. Not affiliated with any official body.",
  footer2: "Map data © OpenStreetMap contributors (ODbL). Basemap tiles: OpenStreetMap Foundation tile server. Built with an AI coding assistant; see submission/AI_DISCLOSURE.md in the repository.",
  // ---- labels shared with lib
  category: { swimming: "Swimming facility", park: "Park / green space" } as Record<Category, string>,
  scopeLabel: { core: "Core data (named/tagged records)", all: "All mapped records (incl. unnamed)" } as Record<DataScope, string>,
  status: { VERIFIED: "VERIFIED", MAPPED: "MAPPED", REQUIRES_CONFIRMATION: "REQUIRES CONFIRMATION", HYPOTHETICAL: "HYPOTHETICAL" } as Record<VerificationStatus, string>,
  statusHelp: {
    VERIFIED: "Documented by a relevant official/original source.",
    MAPPED: "Present in OpenStreetMap; operating status and public access not verified.",
    REQUIRES_CONFIRMATION: "Uncertain, conflicting or possibly outdated.",
    HYPOTHETICAL: "A user-added scenario; not a real facility.",
  } as Record<VerificationStatus, string>,
  studyAreaName: "Seyhan Central Canal Corridor",
  tierReason(f: Facility): string {
    const merged = f.sources.length > 1 ? ` (${f.sources.length} overlapping OSM records merged.)` : "";
    if (f.tier === "excluded")
      return f.sources.length > 1
        ? `${f.sources.length} OSM records point to the same place and at least one marks access as restricted; excluded from the analysis.`
        : `Marked as access-restricted in OSM (access=${f.tags.access ?? "private"}); excluded from the analysis.`;
    if (f.category === "swimming")
      return f.tier === "core"
        ? `Mapped facility with a name or swimming tag. Public access and operating status not verified.${merged}`
        : `Unnamed pool; may be a private apartment-complex or hotel pool. Counted only in the "all mapped" scope.${merged}`;
    return f.tier === "core"
      ? `Mapped park that is named or larger than 5,000 m². Shade, upkeep and usability not verified.${merged}`
      : `Small unnamed green area; may be a private garden. Counted only in the "all mapped" scope.${merged}`;
  },
};

export type Dict = typeof en;

const tr: Dict = {
  lang: "tr",
  skipToMap: "Doğrudan haritaya geç",
  navLabel: "Ana gezinme",
  nav: { problem: "Sorun", map: "Harita ve senaryo", priorities: "Öncelikler", report: "Rapor", method: "Yöntem ve kaynaklar" },
  openMap: "Haritayı aç",
  langSwitch: "English",
  langSwitchLabel: "Switch to English (İngilizceye geç)",
  heroKicker: "Adana · Seyhan ilçesi · açık kaynak prototip",
  heroTitle: ["Mahalleni keşfet.", "İhtiyaçları gör.", "Geleceği birlikte düşün."],
  heroText:
    "Adana'da açık sulama kanalları mahallelerin içinden geçiyor ve yazlar çok sıcak. KanalAtlas, bir kanal koridorunda haritalanmış yüzme tesislerine ve parklara ne kadar uzak olunduğunu ölçer, yeni bir tesisin en çok nerede fayda sağlayacağını hesaplar ve sonucu kaynaklarıyla birlikte bir planlama raporuna dönüştürür.",
  heroQuestion: "Adana'da yeni bir yüzme havuzu en çok nerede fark yaratır?",
  heroAnswer: [
    "Adana'da açık sulama kanalları mahallelerin içinden geçiyor ve belediye meclisi, ücretsiz yüzme eğitiminin gerekçeleri arasında bu kanallardaki boğulmaları sayıyor.",
    "KanalAtlas, bir kanal koridorunun her bölümünün haritalanmış havuz ve parklara ne kadar uzak olduğunu ölçer; yeni bir tesis ekleyip taşıdığınızda farkı anında gösterir.",
  ],
  steps: [
    { title: "İncele", text: "Gerçek kanal koridorunu, haritalanmış havuz ve parkları ve bugünkü durumu görün." },
    { title: "Bir çözüm dene", text: "Varsayımsal bir havuz veya park ekleyin, sürükleyin ve sonuçların yeniden hesaplanışını izleyin." },
    { title: "Karşılaştır ve paylaş", text: "Konumları yan yana karşılaştırın ve kanıta dayalı PDF raporu indirin." },
  ],
  heroCta: "Umut vadeden bir konum bul",
  heroCta2: "Nasıl hesaplıyoruz?",
  illustrationLabel: "Kanal hattı, örnek noktalar ve varsayımsal bir tesisi gösteren soyut çizim",
  illustrationNote: "Soyut çizim; gerçek harita aşağıdaki analiz bölümündedir.",
  problemTitle: "Belgelenmiş bir yerel sorun, dağınık bir bilgi",
  cards: [
    {
      title: "Kanallar ve boğulma kaygısı resmi belgede",
      text: "Büyükşehir Belediye Meclisi'nin 12 Haziran 2026 kararı, ücretsiz yüzme eğitiminin amaçları arasında yaz sıcaklarında sulama kanalları gibi güvensiz alanlarda yaşanabilecek boğulmaları önlemeyi açıkça sayıyor.",
      link: "Meclis kararları, Haziran 2026 (s. 74–75)",
    },
    {
      title: "Yüzme olanakları var, ama nerede?",
      text: "Belediye 2025 yazında 10 ilçede 26 yarı olimpik havuzda yaklaşık 10.000 çocuğa ücretsiz yüzme eğitimi verdiğini duyurdu. Bu havuzların konum listesi duyuruda yer almıyor; mahalle düzeyinde erişimi görmek zor.",
      link: "Adana Büyükşehir Belediyesi, 21.07.2025",
    },
    {
      title: "Kanal koridorlarının geleceği değişiyor",
      text: "Tarım ve Orman Bakanlığı Adana birimi, kapalı basınçlı sulamaya geçişin başladığını ve şehir merkezinden geçen açık kanalların devre dışı bırakılacağını duyurdu. Hangi kesitin ne zaman kapanacağı açıklanmadı.",
      link: "T.C. Tarım ve Orman Bakanlığı, 10.09.2025",
    },
  ],
  baselineKicker: "Bu çalışma alanında, veriden hesaplanan başlangıç",
  baselineText: (core, all, allWithin, threshold) =>
    `örnek harita noktası, adı veya yüzme etiketi olan ${core} haritalanmış yüzme tesisinden birine ${threshold} kuş uçuşu mesafede. İsimsiz havuzlar da sayılırsa (${all} kayıt) bu sayı ${allWithin} oluyor — sonucun hangi veriye güvendiğinize ne kadar bağlı olduğu da bir bulgu.`,
  baselineNote: (n, spacing, date) => `${n} nokta, ${spacing} m ızgarayla örneklenmiştir; nüfusu temsil etmez. Kaynak: OpenStreetMap, çekim ${date}.`,
  diffTitle: "Normal bir haritadan farkı ne?",
  diffs: [
    ["Ölçer, sadece göstermez:", "Her örnek nokta için en yakın tesise mesafeyi hesaplar ve eşik içinde kalanları sayar."],
    ["“Ya şöyle olsaydı?” sorusunu yanıtlar:", "Önerilen bir tesisi sürükledikçe sonuçları anında yeniden hesaplar ve konumları aynı yöntemle karşılaştırır."],
    ["Kanalın geleceğini sorgular:", "Kanal kapatılırsa, hattın doğrusal bir parka dönüştüğü varsayımıyla erişimin nasıl değişeceğini hesaplar."],
    ["Veriye ne kadar güvenildiğini açıkça söyler:", "Her tesisin kaynağı ve doğrulama durumu görünür; isimsiz veya özel havuzlar ayrı tutulur."],
    ["Paylaşılabilir kanıt üretir:", "Sonuçları, yöntem ve sınırlılıklarla birlikte PDF rapora çevirir."],
  ],
  analysisKicker: "Senaryo analizi",
  analysisTitle: "Haritada bir tesis önerin, etkisini ölçün",
  analysisText: (area, n) =>
    `${area}: kesikli çerçevenin içindeki ${n} örnek nokta için en yakın haritalanmış tesise kuş uçuşu mesafe hesaplanır. Varsayımsal bir tesis ekleyip sürükleyin; sonuçlar her harekette yeniden hesaplanır.`,
  mapLoading: "Harita yükleniyor…",
  recenter: "Alanı ortala",
  tapToPlace: "Tesisin yerini seçmek için çerçeve içinde haritaya dokunun",
  tapToMove: "Tesisin yeni yerini seçmek için çerçeve içinde haritaya dokunun",
  withinLabel: (th) => `${th} içindeki örnek nokta`,
  meanLabel: "Ortalama",
  step1: "1. Mevcut durumu incele",
  baselineLine: (n, total, th, cat) =>
    `Bugün ${total} örnek konumdan ${n} tanesi, haritalanmış bir ${cat === "swimming" ? "yüzme tesisine" : "parka"} ${th} veya daha yakın.`,
  categoryGroup: "Tesis kategorisi",
  categoryNote: "Kategoriler birbirinin yerine sayılmaz: park, yüzme tesisi eksikliğini kapatmaz.",
  threshold: "Mesafe eşiği (kuş uçuşu)",
  advanced: "Gelişmiş ayarlar",
  scope: "Veri kapsamı",
  scopeOption: (label, n) => `${label} — ${n} kayıt`,
  scopeHintSwim: "İsimsiz havuzlar site/otel havuzu olabilir. Kapsamı değiştirerek sonucun veriye ne kadar bağlı olduğunu görün.",
  scopeHintPark: "Küçük isimsiz yeşil alanlar site bahçesi olabilir.",
  showLinks: "En yakın tesis çizgileri",
  showSuggestions: "Öneri konumlarını göster",
  bestInfo: (n, spacing) =>
    `“En çok fayda”: ${n} aday konum (${spacing} m aralık) taranır; eşik içine en çok örnek nokta katan konum seçilir (eşitlikte ortalama mesafeyi en çok düşüren). Arazi uygunluğunu bilmez.`,
  keyboardInfo: (step) => `Klavye ile: “En çok fayda sağlayan konuma ekle” düğmesini kullanın, ardından ok düğmeleriyle ${step} m adımlarla taşıyın.`,
  step2: "2. Bir çözüm dene",
  step2Hint: "KanalAtlas'ın umut vadeden bir yer bulmasına izin verin veya kendiniz yerleştirin. Sonra sürükleyin.",
  pickOnMap: "Haritada yer seç",
  cancelPick: "Seçimi iptal et",
  addBest: "Umut vadeden bir konum bul",
  corridorTitle: "Kanal kapatılırsa ne olur?",
  corridorText: (len) =>
    `Bakanlık, şehir merkezinden geçen açık kanalların devre dışı bırakılacağını duyurdu. Bu koridordaki ${len}'lik haritalanmış kanal hattının doğrusal bir parka dönüştüğünü varsayarak erişimi ölçün. Takvim ve arazi durumu doğrulanmamıştır.`,
  corridorButton: "Kanal hattını doğrusal parka dönüştür",
  hypList: "Eklenen varsayımsal tesisler",
  hypBadge: "VARSAYIMSAL",
  hypLabel: (cat, n) => `Varsayımsal ${cat === "swimming" ? "yüzme tesisi" : "park"} ${n}`,
  corridorLabel: (len) => `Kanal hattı doğrusal parkı (${len})`,
  alongCanal: (n) => `kanal hattı boyunca · ${n} kesit`,
  near: (name) => `${name} yakını`,
  remove: "Kaldır",
  removeLabel: (l) => `${l} kaldır`,
  moveGroup: (l) => `${l} taşı`,
  dirs: { n: "Kuzeye", s: "Güneye", w: "Batıya", e: "Doğuya" },
  moveBy: (dir, m) => `${dir} ${m} metre taşı`,
  pickNew: "Haritada yeni konum seç",
  why: "Neden bu sonuç?",
  whyCorridor: (serves, newly, th) =>
    `Uzaklık, kanal hattı üzerindeki en yakın noktaya ölçülür. Hat ${serves} örnek noktanın en yakın parkı olur; ${newly} tanesi ${th} eşiğinin içine yeni girer. Doğrusal park tek bir noktadan çok daha büyük bir alandır; tek bir yeni parkla birebir karşılaştırılmamalıdır.`,
  whyPoint: (serves, newly, th, cat, nearest, closeToExisting) =>
    `${serves} örnek noktanın en yakın tesisi olur; ${newly} tanesi ${th} eşiğinin içine yeni girer. En yakın mevcut ${cat === "swimming" ? "yüzme tesisine" : "parka"} uzaklığı ${nearest ?? "tanımsız (hiç yok)"}${
      closeToExisting === null ? "." : closeToExisting ? " — mevcut bir tesise yakın olduğu için etkisi sınırlı kalır." : " — mevcut tesislerden uzak bir boşluğu dolduruyor."
    }`,
  save: "Bu senaryoyu kaydet",
  step3: "3. Karşılaştır ve paylaş",
  step3Text: "Bir konumu kaydedin, tesisi taşıyıp tekrar kaydederek karşılaştırın. Sonra planlama raporunu indirin.",
  goReport: "PDF rapora git",
  showInactive: "Sayılmayan kayıtları göster (isimsiz veya özel havuzlar)",
  reset: "Senaryoyu sıfırla",
  errorPrefix: "Hata: ",
  warningPrefix: "Uyarı: ",
  msg: {
    max: (n) => `En fazla ${n} varsayımsal tesis eklenebilir. Yeni eklemek için birini kaldırın veya taşıyın.`,
    maxShort: (n) => `En fazla ${n} varsayımsal tesis eklenebilir.`,
    added: (src) => `${src}. Sürükleyerek veya ok düğmeleriyle taşıyabilirsiniz.`,
    addedBest: (gain) => `En çok fayda sağlayan aday konuma eklendi (+${gain} nokta)`,
    addedPick: "Varsayımsal tesis haritada seçilen konuma eklendi",
    corridor: "Varsayımsal senaryo: haritalanmış kanal hattı boyunca doğrusal park. Kanalın kapatılacağı veya arazinin kullanılabileceği doğrulanmamıştır.",
    reverted: " Tesis son geçerli konumuna geri alındı.",
    removed: "Varsayımsal tesis kaldırıldı.",
    reset: "Senaryo sıfırlandı; yalnızca mevcut haritalanmış tesisler gösteriliyor.",
    moved: "Varsayımsal tesis seçilen yeni konuma taşındı; sonuçlar yeniden hesaplandı.",
    maxSaved: "En fazla 3 senaryo kaydedilebilir. Karşılaştırma tablosundan birini silin.",
    saved: (l) => `Senaryo ${l} kaydedildi. Tesisi taşıyıp yeni konumu da kaydederek karşılaştırın.`,
    pdfError: "PDF oluşturulamadı. Lütfen sayfayı yenileyip tekrar deneyin.",
  },
  compTitle: "Kaydedilen senaryoların karşılaştırması",
  compText: (cat, th, scope) =>
    `Her senaryo şu anki ayarlarla (${cat}, ${th} eşik, ${scope === "core" ? "temel veri" : "tüm kayıtlar"}) yeniden hesaplanır; böylece aynı yöntemle karşılaştırılır.`,
  compRegion: "Senaryo karşılaştırma tablosu (kaydırılabilir)",
  compHead: ["Senaryo", "Konum(lar)", "Eşik içinde", "Ortalama", "Medyan", "Kanal kuşağında eşik içi"],
  action: "İşlem",
  baseline: "Başlangıç",
  onlyExisting: "yalnızca mevcut tesisler",
  scenario: (l) => `Senaryo ${l}`,
  bestRow: "(bu ölçüte göre en iyi)",
  canalLinePark: "kanal hattı (doğrusal park)",
  del: "Sil",
  delLabel: (l) => `Senaryo ${l} sil`,
  bestNote:
    "“En iyi”, önce eşik içine giren nokta sayısına, eşitlikte daha düşük ortalama mesafeye göre belirlenir. Bu bir sıralama ölçütüdür; arazi, maliyet veya uygulanabilirlik değerlendirmesi değildir.",
  resultTitle: "Sonuç",
  tileBefore: "Önce",
  tileAfter: "Sonra",
  tileChange: "Fark",
  tileWithin: (th) => `${th} içinde`,
  changeSentence: (gain, th, cat) =>
    gain > 0
      ? `${gain} örnek konum daha artık bir ${cat === "swimming" ? "yüzme tesisine" : "parka"} ${th} veya daha yakın.`
      : gain === 0
        ? `${th} içine yeni örnek konum girmedi; başka bir yer deneyin.`
        : `${th} içinde ${-gain} örnek konum daha az.`,
  addToSee: "Önce/sonra karşılaştırmasını görmek için varsayımsal bir tesis ekleyin.",
  detailsStats: "Ayrıntılı istatistikler ve açıklama",
  withinCard: (th) => `${th} içinde kalan örnek harita noktası`,
  srBeforeAfter: (b, a) => `Başlangıçta ${b}, senaryoda ${a}`,
  barBaseline: "Başlangıç",
  barScenario: "Varsayımsal senaryo",
  statsCaption: "Önce ve sonra mesafe istatistikleri",
  statsHead: ["Ölçüt", "Önce", "Sonra", "Fark"],
  meanDist: "Ortalama mesafe",
  medianDist: "Medyan mesafe",
  farthest: "En uzak nokta",
  beltRow: "Kanal kuşağı* eşik içi",
  beltNote: (m) => `*Haritalanmış kanala ${m} m veya daha yakın örnek noktalar.`,
  resultsFoot: (n) =>
    `Örnek konumlar 500 m ızgaradaki noktalardır, kişiler değil. Mesafeler ${n} haritalanmış tesise kuş uçuşu tahminlerdir.`,
  legendLabel: "Harita açıklaması",
  legend: {
    canal: "Haritalanmış açık kanal (kesikli: menfez)",
    study: "Çalışma alanı",
    active: "Analize dahil mevcut tesis (HARİTALANMIŞ)",
    inactive: "Bu kapsamda sayılmayan kayıt",
    excluded: "Erişimi kısıtlı (hariç)",
    within: (th) => `Örnek nokta: ${th} içinde`,
    outside: "Örnek nokta: eşik dışında",
    nearestHyp: "Varsayımsal tesise en yakın",
    hyp: "Varsayımsal tesis ve eşik yarıçapı",
  },
  tableSummary: (n) => `Harita yerine tablo: ${n} örnek noktanın sonuçları`,
  sortBy: "Sırala:",
  sortOpts: { id: "Nokta kodu", improved: "En çok kısalan mesafe", far: "En uzak (senaryo sonrası)" },
  pointsRegion: "Örnek nokta sonuç tablosu (kaydırılabilir)",
  pointsCaption: "Örnek noktalar için önce ve sonra en yakın tesis mesafeleri",
  pointsHead: (th) => ["Nokta", "Yakın mahalle (yaklaşık)", "Kanala", "Önce", "Sonra", "Fark", `${th} içinde`, "En yakın (sonra)"],
  yes: "Evet",
  no: "Hayır",
  hypFacility: "Varsayımsal tesis",
  unnamedRecord: "isimsiz kayıt",
  facSummary: (cat, n, active) => `Haritalanmış ${cat === "swimming" ? "yüzme tesisleri" : "parklar"} listesi (${n} kayıt, ${active} tanesi analizde)`,
  facRegion: "Haritalanmış tesis tablosu (kaydırılabilir)",
  facCaption: "Haritalanmış tesisler, doğrulama durumları ve kaynakları",
  facHead: ["Ad", "Durum", "Analizde", "Gerekçe", "Kaynak"],
  unnamed: "İsimsiz",
  map: {
    aria: "Seyhan merkez kanal koridoru etkileşimli haritası",
    unnamed: "İsimsiz kayıt",
    status: "Durum:",
    inAnalysis: "Analizde:",
    inYes: "Evet",
    inExcluded: "Hayır (hariç)",
    inScope: "Hayır (bu veri kapsamında değil)",
    area: (m) => `Yaklaşık alan: ${m} m²`,
    source: "Kaynak:",
    canal: "Sulama kanalı",
    covered: " (menfez/tünel olarak haritalanmış)",
    open: " (açık kanal olarak haritalanmış)",
    point: (id) => `Nokta ${id}`,
    nearSuffix: (n) => ` · ${n} yakını`,
    beforeAfter: (b, a) => `Önce: ${b} · Sonra: ${a}`,
    inside: (th) => `${th} içinde`,
    outsideTh: (th) => `${th} dışında`,
    nearestHyp: " · varsayımsal tesise en yakın",
    suggestion: (i, near, gain) => `Öneri ${i}${near ? ` (${near} yakını)` : ""}: +${gain} örnek nokta eşik içine girer`,
    hypTooltip: (l) => `${l} (VARSAYIMSAL) — sürükleyin`,
    hypTitle: (l) => `${l} — sürükleyerek taşıyın`,
    corridorTooltip: (l) => `${l} — VARSAYIMSAL`,
  },
  prio: {
    kicker: "Kişisel girdi",
    title: "Mahallen İçin Ne Önemli?",
    intro: "Kendi önceliklerinizi seçin; bunlar raporunuza “Kullanıcının seçtiği öncelikler” başlığıyla eklenir.",
    notSurvey: "Bu bir anket veya oylama değildir.",
    notSurveyItems: [
      "Yanıtlarınız hiçbir sunucuya gönderilmez; yalnızca bu tarayıcıda (localStorage) saklanır.",
      "Başkalarının yanıtlarını göremezsiniz; toplam katılım sayısı yoktur.",
      "Ad, adres, telefon, yaş gibi kişisel bilgi istemiyoruz. Lütfen nota da yazmayın.",
      "İstediğiniz zaman silebilir veya JSON dosyası olarak indirebilirsiniz.",
    ],
    nbLabel: "Hangi mahalleyi düşünüyorsunuz?",
    optional: "(isteğe bağlı)",
    nbNone: "Belirtmek istemiyorum",
    nbOutside: "Çalışma alanı dışında bir yer",
    priorityLegend: "Hangi iyileştirmeye öncelik verirdiniz?",
    barriersLegend: "Mevcut olanakları kullanmayı ne zorlaştırıyor?",
    multi: "(birden fazla seçilebilir)",
    noteLabel: "Planlamacıların dikkate almasını istediğiniz başka bir şey var mı?",
    noteHelp: (n, max) => `${n}/${max} karakter. Kişisel bilgi yazmayın.`,
    save: "Önceliklerimi kaydet",
    download: "JSON olarak indir",
    clear: "Sil",
    saved: "Kaydedildi. Bu tercihler yalnızca bu tarayıcıda saklanır ve PDF raporuna eklenir.",
    savedSession: "Kaydedildi (bu oturum için). Tarayıcı depolaması kullanılamadığından sayfa yenilenince silinecek.",
    cleared: "Tercihleriniz bu tarayıcıdan silindi.",
    jsonType: "KanalAtlas kişisel öncelikler (anket sonucu değildir)",
  },
  reportKicker: "Planlama özeti",
  reportTitle: "Bulguları PDF rapor olarak indirin",
  reportIntro: "Rapor, ekrandaki senaryonun o anki durumundan üretilir ve şunları içerir:",
  reportItems: (n) => [
    "Çalışma alanı, kategori, veri kapsamı ve eşik",
    "Analize dahil tesisler, kaynakları ve doğrulama durumu",
    "Varsayımsal tesis konumları ve “neden bu sonuç” açıklaması",
    "Önce/sonra tablosu, kanal kuşağı alt kümesi ve şematik harita",
    "Kaydettiğiniz senaryoların aynı yöntemle karşılaştırması",
    "Kendi öncelikleriniz (kişisel girdi olarak etiketlenir)",
    "Yöntem, sınırlılıklar, kaynaklar ve planlamacılara sorular",
    `Tüm ${n} örnek noktanın tablo hâlinde sonuçları`,
  ],
  reportDl: { category: "Kategori", hyps: "Varsayımsal tesis", saved: "Kaydedilen senaryo", priorities: "Öncelikler", added: "eklenecek", none: "girilmedi" },
  reportNoHyp: "Varsayımsal tesis eklemediniz; rapor yalnızca başlangıç durumunu içerecek.",
  reportBusy: "PDF hazırlanıyor…",
  reportButton: "PDF raporu oluştur ve indir",
  reportDone: "İndirildi:",
  methodKicker: "Şeffaflık",
  methodTitle: "Yöntem, kaynaklar ve sınırlılıklar",
  howTitle: "Nasıl hesaplıyoruz?",
  formulaNote: "R = 6.371.008,8 m · φ enlem, λ boylam (radyan)",
  codeNote: "Hesaplama kodu: src/lib/scenario.ts ve src/lib/geo.ts — elle hesaplanmış beklenen değerlerle birim testleri vardır. Ayrıntı: docs/SCENARIO_METHOD.md.",
  notTitle: "Bu araç neyi söylemez?",
  statusTitle: "Durum etiketleri",
  ledgerTitle: "Kaynak defteri",
  scopeWord: "Kapsam:",
  osmLedger: "OpenStreetMap katkıcıları — kanal, park ve havuz geometrileri",
  osmLedgerDate: (d) => `çekim ${d}`,
  osmLedgerText: (c, f, m, nb, swim, parks) =>
    `${c} kanal segmenti, ${f} tesis kaydı (${m} çakışan kayıt birleştirildi), ${nb} mahalle etiketi. Analizde varsayılan olarak ${swim} yüzme tesisi ve ${parks} park kullanılır.`,
  footer1: "KanalAtlas — Neighborhood Hacks 2026 için geliştirilmiş açık kaynak prototip. Resmi bir kurumla bağlantısı yoktur.",
  footer2: "Harita verisi © OpenStreetMap katkıcıları (ODbL). Altlık harita karoları: OpenStreetMap Vakfı tile sunucusu. Yapay zekâ destekli bir kodlama aracıyla geliştirilmiştir; ayrıntılar depodaki submission/AI_DISCLOSURE.md dosyasındadır.",
  category: { swimming: "Yüzme tesisi", park: "Park / yeşil alan" },
  scopeLabel: { core: "Temel veri (adı/etiketi olan kayıtlar)", all: "Tüm haritalanmış kayıtlar (isimsiz olanlar dahil)" },
  status: { VERIFIED: "DOĞRULANMIŞ", MAPPED: "HARİTALANMIŞ", REQUIRES_CONFIRMATION: "DOĞRULAMA GEREKİYOR", HYPOTHETICAL: "VARSAYIMSAL" },
  statusHelp: {
    VERIFIED: "İlgili resmi/özgün bir kaynakta belgelenmiş.",
    MAPPED: "OpenStreetMap'te var; çalışma durumu ve halka açıklığı doğrulanmadı.",
    REQUIRES_CONFIRMATION: "Belirsiz, çelişkili veya güncelliği şüpheli.",
    HYPOTHETICAL: "Kullanıcının eklediği senaryo; gerçek bir tesis değil.",
  },
  studyAreaName: "Seyhan Merkez Kanal Koridoru",
  tierReason: (f) => f.tierReason,
};

export const DICTS: Record<Lang, Dict> = { en, tr };
export const signed = sign;

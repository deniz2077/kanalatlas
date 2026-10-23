/**
 * Planning-brief PDF. buildReportDoc() is a pure function from the current
 * scenario state to a pdfmake document definition, so its contents can be
 * unit-tested without a browser. The browser only calls pdfmake to render it.
 */
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { toLocalXY } from "./geo";
import { EVIDENCE, STATUS_LABEL } from "./evidence";
import {
  CATEGORY_LABEL,
  SCOPE_LABEL,
  formatDelta,
  formatMeters,
  interpretResult,
  type HypotheticalExplanation,
} from "./insights";
import { barrierLabel, priorityLabel, type Priorities } from "./priorities";
import { activeFacilities, CANAL_BELT_M, type ScenarioResult, type Summary } from "./scenario";
import { DICTS, type Lang } from "./i18n";
import type { Dataset, EvaluationPoint, HypotheticalFacility } from "./types";

export interface SavedComparison {
  label: string;
  result: ScenarioResult;
  hypotheticals: HypotheticalFacility[];
}

export interface ReportInput {
  generatedAt: Date;
  dataset: Dataset;
  points: EvaluationPoint[];
  result: ScenarioResult;
  hypotheticals: HypotheticalFacility[];
  explanations: HypotheticalExplanation[];
  saved: SavedComparison[];
  priorities: Priorities | null;
  /** Report language (default Turkish). */
  lang?: Lang;
}

export const REPORT_TITLE = "KanalAtlas — Mahalle Erişilebilirlik ve Senaryo Değerlendirme Raporu";
export const REPORT_TITLE_EN = "KanalAtlas — Neighbourhood Accessibility and Scenario Assessment Report";

const fmtDate = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(d);

const coord = (p: { lat: number; lon: number }) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

function summaryRows(before: Summary, after: Summary, thresholdM: number, hasScenario: boolean, lang: Lang) {
  const row = (label: string, b: string, a: string) => [label, b, hasScenario ? a : "—"];
  const L = RS[lang];
  const f = (m: number | null) => formatMeters(m, lang);
  return [
    row(L.rowWithin(f(thresholdM)), `${before.withinCount} / ${before.pointCount}`, `${after.withinCount} / ${after.pointCount}`),
    row(L.rowMean, f(before.meanM), f(after.meanM)),
    row(L.rowMedian, f(before.medianM), f(after.medianM)),
    row(L.rowMax, f(before.maxM), f(after.maxM)),
    row(L.rowDefined, String(before.definedCount), String(after.definedCount)),
  ];
}

/**
 * Schematic SVG map drawn from the same coordinates the app uses
 * (equirectangular projection of the study box). Not a basemap screenshot.
 */
export function buildScenarioSvg(input: ReportInput, width = 515): string {
  const { dataset, points, result, hypotheticals } = input;
  const b = dataset.studyArea.bbox;
  const pad = 250; // metres of margin around the study box
  const nw = { lat: b.north, lon: b.west };
  const se = toLocalXY({ lat: b.south, lon: b.east }, nw);
  const wM = se.x + 2 * pad;
  const hM = -se.y + 2 * pad;
  const s = width / wM;
  const height = Math.round(hM * s);
  const P = (p: { lat: number; lon: number }) => {
    const xy = toLocalXY(p, nw);
    return [((xy.x + pad) * s).toFixed(1), ((-xy.y + pad) * s).toFixed(1)] as const;
  };
  const inView = (p: { lat: number; lon: number }) => {
    const [x, y] = P(p).map(Number);
    return x >= 0 && x <= width && y >= 0 && y <= height;
  };
  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#f4f2ec"/>`);
  const [bx, by] = P(nw);
  parts.push(
    `<rect x="${bx}" y="${by}" width="${(se.x * s).toFixed(1)}" height="${(-se.y * s).toFixed(1)}" fill="none" stroke="#0f2340" stroke-width="1" stroke-dasharray="4,3"/>`,
  );
  for (const c of dataset.canals) {
    const d = c.coords.map((p) => P(p).join(",")).join(" ");
    parts.push(`<polyline points="${d}" fill="none" stroke="#1d6fa5" stroke-width="${c.covered ? 1.5 : 3}"/>`);
  }
  const resById = new Map(result.points.map((r) => [r.pointId, r]));
  for (const p of points) {
    const r = resById.get(p.id);
    const [x, y] = P(p);
    const within = r?.withinAfter;
    const hyp = r?.after?.hypothetical;
    parts.push(
      `<circle cx="${x}" cy="${y}" r="2.6" fill="${within ? (hyp ? "#f59e0b" : "#0f766e") : "#ffffff"}" stroke="${hyp ? "#b45309" : within ? "#0f766e" : "#3d4f6b"}" stroke-width="0.9"/>`,
    );
  }
  for (const f of activeFacilities(dataset.facilities, result.category, result.scope)) {
    if (!inView(f)) continue;
    const [x, y] = P(f).map(Number);
    parts.push(`<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#0f766e" stroke="#ffffff" stroke-width="0.8"/>`);
  }
  for (const h of hypotheticals.filter((q) => q.path)) {
    for (const line of h.path!) {
      const d = line.map((q) => P(q).join(",")).join(" ");
      parts.push(`<polyline points="${d}" fill="none" stroke="#b45309" stroke-width="5" stroke-opacity="0.55" stroke-linecap="round"/>`);
    }
  }
  for (const h of hypotheticals.filter((q) => !q.path)) {
    const [x, y] = P(h).map(Number);
    parts.push(
      `<circle cx="${x}" cy="${y}" r="${(result.thresholdM * s).toFixed(1)}" fill="none" stroke="#b45309" stroke-width="0.8" stroke-dasharray="3,3"/>`,
    );
    parts.push(`<polygon points="${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}" fill="#b45309" stroke="#ffffff" stroke-width="1"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
}

export const PLANNER_QUESTIONS = [
  "Bu bölgedeki halka açık yüzme tesislerinin (belediye, il müdürlüğü, kulüp protokolleri) güncel listesi ve konumları nedir?",
  "Haritada isimsiz görünen havuzlardan hangileri halka açık, hangileri site veya otel havuzudur?",
  "Kapalı basınçlı sisteme geçişte bu koridordaki açık kanal kesitleri için bir takvim ve kentsel kullanım planı var mı?",
  "Kanal hattı devre dışı kalırsa, hat boyunca gölgeli kamusal alan veya su oyun alanı düşünülebilir mi? Mülkiyet ve teknik kısıtlar nelerdir?",
  "Yaz yüzme eğitimi kontenjanları bu mahallelerdeki çocuklara ne ölçüde ulaşıyor?",
];

export const METHOD_TEXT = [
  "Çalışma alanı, OpenStreetMap'te açık sulama kanalı olarak haritalanmış Seyhan merkez koridorunu çevreleyen yaklaşık 5,5 km × 2,6 km'lik bir dikdörtgendir.",
  "Alan içine 500 m aralıklı düzenli bir ızgara yerleştirilmiş ve her ızgara noktası bir 'örnek harita noktası' olarak kullanılmıştır. Bu noktalar ev, kişi veya nüfus değildir.",
  "Her nokta için seçilen kategorideki en yakın tesis, Haversine formülüyle (Dünya yarıçapı 6.371.008,8 m) hesaplanan düz çizgi (kuş uçuşu) mesafeye göre bulunur.",
  "Varsayımsal tesis eklendiğinde aynı hesap tekrarlanır; varsayımsal tesis yalnızca mevcut en yakın tesisten kesinlikle daha yakınsa en yakın tesis olarak kabul edilir.",
  "Kategoriler (yüzme tesisi, park) asla birbirinin yerine sayılmaz. Tesisler, çıkarma kutusunun içindeyse çalışma alanının dışında olsalar bile en yakın tesis olabilir.",
  `‘Kanal kuşağı’, haritalanmış bir kanal segmentine ${CANAL_BELT_M} m veya daha yakın örnek noktalardır.`,
];

export const LIMITATIONS = [
  "Mesafeler yürüme mesafesi veya süresi değildir; yollar, köprüler, kanal ve trafik engelleri dikkate alınmaz.",
  "OpenStreetMap eksik olabilir: haritada olmayan tesisler sonuçlara yansımaz; haritadaki tesislerin çalışma durumu, ücreti ve halka açıklığı doğrulanmamıştır.",
  "Örnek noktalar nüfusu temsil etmez; sonuçlar 'kaç kişi' sorusuna cevap vermez.",
  "Bu araç boğulma riskini veya önlenecek vaka sayısını tahmin etmez.",
  "Varsayımsal tesisler için arazi uygunluğu, mülkiyet, maliyet, izin ve teknik fizibilite değerlendirilmemiştir.",
  "Belirli bir kanal kesitinin kapatılacağı doğrulanmamıştır.",
];

export const PLANNER_QUESTIONS_EN = [
  "What is the current list and location of public swimming facilities in this area (municipality, provincial directorate, club protocols)?",
  "Which of the unnamed pools on the map are public, and which are apartment-complex or hotel pools?",
  "Is there a timeline and an urban-use plan for the open canal sections in this corridor during the switch to closed pressurised irrigation?",
  "If the canal line is decommissioned, could shaded public space or water-play areas be considered along it? What are the ownership and technical constraints?",
  "How far do summer swimming-lesson places reach children in these neighbourhoods?",
];

export const METHOD_TEXT_EN = [
  "The study area is a rectangle of about 5.5 km × 2.6 km around the Seyhan central corridor mapped as an open irrigation canal in OpenStreetMap.",
  "A regular grid with 500 m spacing is placed inside it, and each grid point is used as a 'sample map point'. These points are not homes, people or population.",
  "For each point, the nearest facility in the selected category is found by straight-line distance computed with the Haversine formula (Earth radius 6,371,008.8 m).",
  "When a hypothetical facility is added, the same calculation is repeated; it counts as the nearest facility only if strictly closer than the existing nearest one.",
  "Categories (swimming facility, park) are never substituted for each other. Facilities outside the study area can be the nearest one if they lie inside the extraction box.",
  `The 'canal belt' is the set of sample points ${CANAL_BELT_M} m or closer to a mapped canal segment.`,
];

export const LIMITATIONS_EN = [
  "Distances are not walking distances or times; roads, bridges, the canal and traffic barriers are not considered.",
  "OpenStreetMap may be incomplete: unmapped facilities are not reflected; operating status, fees and public access of mapped facilities are not verified.",
  "Sample points do not represent population; the results do not answer 'how many people'.",
  "This tool does not predict drowning risk or the number of cases prevented.",
  "Land availability, ownership, cost, permits and technical feasibility of hypothetical facilities are not assessed.",
  "Closure of any specific canal section is not verified.",
];

export const METHOD_BY: Record<Lang, string[]> = { tr: METHOD_TEXT, en: METHOD_TEXT_EN };
export const LIMITATIONS_BY: Record<Lang, string[]> = { tr: LIMITATIONS, en: LIMITATIONS_EN };
export const QUESTIONS_BY: Record<Lang, string[]> = { tr: PLANNER_QUESTIONS, en: PLANNER_QUESTIONS_EN };

/** Report wording per language. */
const RS = {
  tr: {
    title: REPORT_TITLE,
    meta: (d: string) => `Oluşturulma: ${d} · Dil: Türkçe`,
    intro: "Bu rapor KanalAtlas prototipinin o anki ekran durumundan otomatik üretilmiştir. Bir planlama kararı değil, tartışma için kanıt özetidir.",
    h1: "1. Çalışma alanı",
    area: (name: string, district: string, desc: string, b: { south: number; west: number; north: number; east: number }) =>
      `${name} (${district}). ${desc} Sınır kutusu: G ${b.south}, B ${b.west}, K ${b.north}, D ${b.east}.`,
    h2: "2. Konu",
    topic:
      "Adana'da açık sulama kanalları yerleşim alanlarının içinden geçer. Belediye meclisi Haziran 2026 tarihli “Yüzme Bilmeyen Çocuk Kalmasın” kararında, yaz sıcaklarında sulama kanalları gibi güvensiz alanlarda yaşanabilecek boğulmaları önlemeyi ücretsiz yüzme eğitiminin gerekçeleri arasında saymıştır. Tarım ve Orman Bakanlığı ise Eylül 2025'te kapalı basınçlı sisteme geçişin başladığını ve şehir merkezinden geçen açık kanalların devre dışı bırakılacağını duyurmuştur. KanalAtlas, bu koridorda haritalanmış kamusal rekreasyon olanaklarına düz çizgi erişimi ölçer ve varsayımsal iyileştirmeleri karşılaştırır.",
    h3: "3. Analiz ayarları ve mevcut tesisler",
    settings: (cat: string, scope: string, th: string, n: number, pts: number) => [
      `Kategori: ${cat}`,
      `Veri kapsamı: ${scope}`,
      `Mesafe eşiği: ${th} (düz çizgi)`,
      `Analize dahil haritalanmış tesis sayısı: ${n}`,
      `Örnek harita noktası: ${pts} (500 m ızgara)`,
    ],
    facHead: ["Tesis (en çok noktaya en yakın olanlar)", "Durum", "En yakın olduğu nokta", "OSM kaynağı"],
    unnamedRecord: "İsimsiz kayıt",
    noFac: "Bu kategori ve veri kapsamında analize dahil haritalanmış tesis yok.",
    h4: "4. Kaynak ve doğrulama durumu",
    sourceText: (prov: string, lic: string, date: string) =>
      `Coğrafi veri: ${prov}. Lisans: ${lic}. Çekim tarihi: ${date}. Haritalanmış tesislerin hiçbiri 'DOĞRULANMIŞ' olarak işaretlenmemiştir: OSM'de bulunmaları çalıştıkları veya halka açık oldukları anlamına gelmez. Erişimi kısıtlı (access=private/customers) kayıtlar analiz dışıdır.`,
    h5: "5. Varsayımsal müdahale",
    hypCorridor: (label: string, sections: number, serves: number, newly: number) =>
      `${label} (VARSAYIMSAL) — haritalanmış kanal hattının (${sections} kesit) doğrusal parka dönüştüğü varsayımı; uzaklık hattın en yakın noktasına ölçülür. ${serves} örnek noktanın en yakın parkı olur; ${newly} tanesi eşik içine yeni girer. Kanalın kapatılacağı ve arazinin kullanılabileceği doğrulanmamıştır; doğrusal park tek bir parkla birebir karşılaştırılmamalıdır.`,
    hypPoint: (label: string, c: string, near: string | null, serves: number, newly: number, nearest: string) =>
      `${label} (VARSAYIMSAL) — konum ${c}${near ? `, ${near} yakını` : ""}. ${serves} örnek noktanın en yakın tesisi olur; bunlardan ${newly} tanesi eşik içine yeni girer. Aynı kategorideki en yakın mevcut tesise uzaklığı: ${nearest}.`,
    unnamed: "isimsiz",
    undef: "tanımsız",
    noHyp: "Bu raporda varsayımsal tesis yok. Aşağıdaki değerler yalnızca mevcut haritalanmış tesislere göre başlangıç durumunu gösterir.",
    h6: "6. Önce / sonra karşılaştırması",
    sumHead: ["Ölçüt (tüm örnek noktalar)", "Başlangıç", "Senaryo"],
    beltHead: (m: number) => [`Kanal kuşağı (kanala ≤ ${m} m noktalar)`, "Başlangıç", "Senaryo"],
    rowWithin: (th: string) => `${th} içindeki örnek nokta`,
    rowMean: "Ortalama en yakın mesafe",
    rowMedian: "Medyan en yakın mesafe",
    rowMax: "En uzak örnek nokta",
    rowDefined: "Mesafesi tanımlı nokta",
    mapTitle: "Şematik harita (uygulamadaki koordinatlardan çizildi)",
    mapCaption:
      "Kesikli çerçeve: çalışma alanı · mavi çizgi: haritalanmış kanal (ince: menfez/tünel) · yeşil kare: analize dahil mevcut tesis · daire: örnek nokta (dolu = eşik içinde, boş = eşik dışında, turuncu = varsayımsal tesise en yakın) · turuncu karo ve kesikli daire: varsayımsal tesis ve eşik yarıçapı; kalın turuncu çizgi: varsayımsal kanal hattı parkı.",
    h7: "7. Kaydedilen senaryoların karşılaştırması",
    savedNote: "Tüm senaryolar rapor anındaki aynı kategori, veri kapsamı ve eşikle yeniden hesaplanmıştır.",
    savedHead: ["Senaryo", "Konum(lar)", "Eşik içinde", "Ortalama", "İyileşen nokta"],
    baseline: "Başlangıç",
    canalLinePark: "kanal hattı (doğrusal park)",
    hPriorities: (n: number) => `${n}. Kullanıcının seçtiği öncelikler`,
    prioNote: "Bu bölüm tek bir kullanıcının kendi tarayıcısında girdiği kişisel tercihleri gösterir; bir anket veya topluluk oylaması sonucu değildir.",
    prio: (nb: string, pr: string, bars: string, note: string) => [
      `Düşünülen mahalle: ${nb || "belirtilmedi"}`,
      `Öncelik: ${pr}`,
      `Zorluklar: ${bars || "belirtilmedi"}`,
      `Not: ${note || "—"}`,
    ],
    noPrio: "Kullanıcı öncelik girmedi.",
    hMethod: (n: number) => `${n}. Yöntem`,
    hLimits: (n: number) => `${n}. Sınırlılıklar ve belirsizlikler`,
    hSources: (n: number) => `${n}. Kaynaklar`,
    osmData: (lic: string) => `OpenStreetMap verisi: ${lic}. `,
    hQuestions: (n: number) => `${n}. Yerel planlamacılara sorulabilecek sorular`,
    pointsTitle: "\nÖrnek nokta ayrıntıları",
    pointsHead: ["Nokta", "Yakın mahalle (yaklaşık)", "Kanala", "Önce", "Sonra", "Fark", "Eşik içinde"],
    yes: "Evet",
    no: "Hayır",
    author: "KanalAtlas prototipi",
    footer: (name: string, c: number, t: number) => `KanalAtlas · ${name} · düz çizgi mesafe, nüfus verisi içermez · ${c}/${t}`,
    file: "rapor",
  },
  en: {
    title: REPORT_TITLE_EN,
    meta: (d: string) => `Generated: ${d} · Language: English`,
    intro: "This report was generated automatically from the current on-screen state of the KanalAtlas prototype. It is an evidence summary for discussion, not a planning decision.",
    h1: "1. Study area",
    area: (name: string, district: string, _desc: string, b: { south: number; west: number; north: number; east: number }) =>
      `${name} (${district}). The east–west corridor in Seyhan district mapped as an open irrigation canal in OpenStreetMap, and the surrounding residential area. Bounding box: S ${b.south}, W ${b.west}, N ${b.north}, E ${b.east}.`,
    h2: "2. Background",
    topic:
      "Open irrigation canals run through residential areas of Adana. In its June 2026 decision on the “Yüzme Bilmeyen Çocuk Kalmasın” programme, Adana Metropolitan Council listed preventing drownings in unsafe places such as irrigation canals during the summer heat among the reasons for free swimming lessons. In September 2025 the Ministry of Agriculture and Forestry announced that the switch to closed, pressurised irrigation had begun and that open canals through the city centre will be decommissioned. KanalAtlas measures straight-line access to mapped public recreation facilities in this corridor and compares hypothetical improvements.",
    h3: "3. Analysis settings and existing facilities",
    settings: (cat: string, scope: string, th: string, n: number, pts: number) => [
      `Category: ${cat}`,
      `Data scope: ${scope}`,
      `Distance threshold: ${th} (straight line)`,
      `Mapped facilities in the analysis: ${n}`,
      `Sample map points: ${pts} (500 m grid)`,
    ],
    facHead: ["Facility (nearest to the most points)", "Status", "Nearest for points", "OSM source"],
    unnamedRecord: "Unnamed record",
    noFac: "No mapped facility in this category and data scope is included in the analysis.",
    h4: "4. Sources and verification status",
    sourceText: (_prov: string, lic: string, date: string) =>
      `Geographic data: OpenStreetMap contributors (one-time Overpass API extract). Licence: ${lic}. Extracted: ${date}. None of the mapped facilities is marked 'VERIFIED': being in OSM does not mean they operate or are open to the public. Access-restricted records (access=private/customers) are excluded.`,
    h5: "5. Hypothetical intervention",
    hypCorridor: (label: string, sections: number, serves: number, newly: number) =>
      `${label} (HYPOTHETICAL) — assumes the mapped canal line (${sections} sections) becomes a linear park; distance is measured to the nearest point on the line. It becomes the nearest park for ${serves} sample points; ${newly} of them newly fall within the threshold. Neither the canal's closure nor land availability is verified; a linear park should not be compared one-to-one with a single park.`,
    hypPoint: (label: string, c: string, near: string | null, serves: number, newly: number, nearest: string) =>
      `${label} (HYPOTHETICAL) — location ${c}${near ? `, near ${near}` : ""}. It becomes the nearest facility for ${serves} sample points; ${newly} of them newly fall within the threshold. Distance to the nearest existing facility of the same category: ${nearest}.`,
    unnamed: "unnamed",
    undef: "undefined",
    noHyp: "This report contains no hypothetical facility. The values below show the baseline with existing mapped facilities only.",
    h6: "6. Before / after comparison",
    sumHead: ["Measure (all sample points)", "Baseline", "Scenario"],
    beltHead: (m: number) => [`Canal belt (points ≤ ${m} m from a canal)`, "Baseline", "Scenario"],
    rowWithin: (th: string) => `Sample points within ${th}`,
    rowMean: "Mean nearest distance",
    rowMedian: "Median nearest distance",
    rowMax: "Farthest sample point",
    rowDefined: "Points with a defined distance",
    mapTitle: "Schematic map (drawn from the app's coordinates)",
    mapCaption:
      "Dashed frame: study area · blue line: mapped canal (thin: culvert/tunnel) · green square: existing facility in the analysis · circle: sample point (filled = within threshold, hollow = outside, amber = closest to a hypothetical facility) · amber diamond and dashed circle: hypothetical facility and threshold radius; thick amber line: hypothetical canal-line park.",
    h7: "7. Comparison of saved scenarios",
    savedNote: "All scenarios were recalculated with the same category, data scope and threshold at the time of the report.",
    savedHead: ["Scenario", "Location(s)", "Within threshold", "Mean", "Points improved"],
    baseline: "Baseline",
    canalLinePark: "canal line (linear park)",
    hPriorities: (n: number) => `${n}. Priorities chosen by the user`,
    prioNote: "This section shows the personal preferences one user entered in their own browser; it is not a survey or community vote.",
    prio: (nb: string, pr: string, bars: string, note: string) => [
      `Neighbourhood considered: ${nb || "not specified"}`,
      `Priority: ${pr}`,
      `Barriers: ${bars || "not specified"}`,
      `Note: ${note || "—"}`,
    ],
    noPrio: "The user did not enter priorities.",
    hMethod: (n: number) => `${n}. Method`,
    hLimits: (n: number) => `${n}. Limitations and uncertainties`,
    hSources: (n: number) => `${n}. Sources`,
    osmData: (lic: string) => `OpenStreetMap data: ${lic}. `,
    hQuestions: (n: number) => `${n}. Questions to ask local planners`,
    pointsTitle: "\nSample point details",
    pointsHead: ["Point", "Nearby neighbourhood (approx.)", "To canal", "Before", "After", "Change", "Within threshold"],
    yes: "Yes",
    no: "No",
    author: "KanalAtlas prototype",
    footer: (name: string, c: number, t: number) => `KanalAtlas · ${name} · straight-line distance, no population data · ${c}/${t}`,
    file: "report",
  },
};

/**
 * Note: pdfmake mutates the arrays it receives (strings become layout objects),
 * so every shared constant array is copied before it goes into the document.
 */
export function buildReportDoc(input: ReportInput): TDocumentDefinitions {
  const { dataset, result, hypotheticals, explanations, saved, priorities } = input;
  const lang: Lang = input.lang ?? "tr";
  const L = RS[lang];
  const D = DICTS[lang];
  const fm = (m: number | null | undefined) => formatMeters(m, lang);
  const areaName = D.studyAreaName;
  const hasScenario = result.hypotheticalCount > 0;
  const active = activeFacilities(dataset.facilities, result.category, result.scope);
  const servedCount = new Map<string, number>();
  for (const r of result.points) if (r.before) servedCount.set(r.before.facilityId, (servedCount.get(r.before.facilityId) ?? 0) + 1);
  const topFacilities = active
    .filter((f) => servedCount.has(f.id))
    .sort((a, b) => (servedCount.get(b.id) ?? 0) - (servedCount.get(a.id) ?? 0) || a.id.localeCompare(b.id))
    .slice(0, 10);

  const h2 = (text: string): Content => ({ text, style: "h2" });
  const content: Content[] = [
    { text: L.title, style: "title" },
    { text: L.meta(fmtDate(input.generatedAt, lang)), style: "meta" },
    { text: L.intro, style: "note" },

    h2(L.h1),
    { text: L.area(areaName, dataset.studyArea.district, dataset.studyArea.description, dataset.studyArea.bbox) },

    h2(L.h2),
    { text: L.topic },

    h2(L.h3),
    {
      ul: L.settings(
        lang === "tr" ? CATEGORY_LABEL[result.category] : D.category[result.category],
        lang === "tr" ? SCOPE_LABEL[result.scope] : D.scopeLabel[result.scope],
        fm(result.thresholdM),
        result.baselineFacilityCount,
        result.before.pointCount,
      ),
    },
    topFacilities.length
      ? {
          style: "table",
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: [
              [...L.facHead],
              ...topFacilities.map((f) => [
                f.name ?? L.unnamedRecord,
                lang === "tr" ? STATUS_LABEL[f.status] : D.status[f.status],
                String(servedCount.get(f.id) ?? 0),
                f.sources.map((s) => `${s.osmType}/${s.osmId}`).join(", "),
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        }
      : { text: L.noFac, style: "note" },

    h2(L.h4),
    { text: L.sourceText(dataset.source.provider, dataset.source.license, dataset.extractedAt) },

    h2(L.h5),
    hasScenario
      ? {
          ul: explanations.map((e) => {
            const h = hypotheticals.find((x) => x.id === e.id)!;
            if (h.path) return L.hypCorridor(e.label, h.path.length, e.servesPoints.length, e.newlyWithin);
            const nearest = e.nearestExisting ? `${fm(e.nearestExisting.distanceM)} (${e.nearestExisting.name ?? L.unnamed})` : L.undef;
            return L.hypPoint(e.label, coord(h), e.nearLabel, e.servesPoints.length, e.newlyWithin, nearest);
          }),
        }
      : { text: L.noHyp, style: "note" },

    h2(L.h6),
    {
      unbreakable: true,
      stack: [
        {
          style: "table",
          table: {
            headerRows: 1,
            widths: ["*", 110, 110],
            body: [[...L.sumHead], ...summaryRows(result.before, result.after, result.thresholdM, hasScenario, lang)],
          },
          layout: "lightHorizontalLines",
        },
        {
          style: "table",
          table: {
            headerRows: 1,
            widths: ["*", 110, 110],
            body: [
              L.beltHead(CANAL_BELT_M),
              ...summaryRows(result.canalBelt.before, result.canalBelt.after, result.thresholdM, hasScenario, lang).slice(0, 3),
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
    },
    { text: interpretResult(result, lang), margin: [0, 4, 0, 0] },
    ...(result.notes.length ? [{ ul: [...result.notes], style: "note" } as Content] : []),

    { text: L.mapTitle, style: "h3" },
    { svg: buildScenarioSvg(input), width: 515 },
    { text: L.mapCaption, style: "caption" },
  ];

  if (saved.length > 0) {
    content.push(h2(L.h7));
    content.push({ text: L.savedNote, style: "note" });
    content.push({
      style: "table",
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto", "auto", "auto"],
        body: [
          [...L.savedHead],
          [L.baseline, "—", `${result.before.withinCount} / ${result.before.pointCount}`, fm(result.before.meanM), "—"],
          ...saved.map((s) => [
            s.label,
            s.hypotheticals.map((h) => (h.path ? L.canalLinePark : coord(h))).join("; ") || "—",
            `${s.result.after.withinCount} / ${s.result.after.pointCount} (${s.result.change.withinGained >= 0 ? "+" : ""}${s.result.change.withinGained})`,
            fm(s.result.after.meanM),
            String(s.result.change.pointsImproved),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
    });
  }

  content.push(h2(L.hPriorities(saved.length > 0 ? 8 : 7)));
  if (priorities && priorities.priority) {
    content.push({ text: L.prioNote, style: "note" });
    content.push({
      ul: L.prio(
        priorities.neighbourhood,
        priorityLabel(priorities.priority, lang),
        priorities.barriers.map((b) => barrierLabel(b, lang)).join(", "),
        priorities.note.trim(),
      ),
    });
  } else {
    content.push({ text: L.noPrio, style: "note" });
  }

  const n = saved.length > 0 ? 9 : 8;
  content.push(h2(L.hMethod(n)), { ol: [...METHOD_BY[lang]] });
  content.push(h2(L.hLimits(n + 1)), { ul: [...LIMITATIONS_BY[lang]] });
  content.push(h2(L.hSources(n + 2)), {
    ul: [
      ...EVIDENCE.map((e) => ({
        text: [
          { text: `[${lang === "tr" ? STATUS_LABEL[e.status] : D.status[e.status]}] `, bold: true },
          `${e.publisher}, ${e.date}. `,
          { text: e.url, link: e.url, color: "#1d6fa5" },
        ],
      })),
      { text: [L.osmData(dataset.source.license), { text: dataset.source.url, link: dataset.source.url, color: "#1d6fa5" }] },
    ],
    style: "small",
  });
  content.push(h2(L.hQuestions(n + 3)), { ol: [...QUESTIONS_BY[lang]] });

  content.push({ text: L.pointsTitle, style: "h3", pageBreak: "before" });
  const resById = new Map(result.points.map((r) => [r.pointId, r]));
  content.push({
    style: "tiny",
    table: {
      headerRows: 1,
      widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
      body: [
        [...L.pointsHead],
        ...input.points.map((p) => {
          const r = resById.get(p.id)!;
          return [
            p.id,
            p.nearLabel ?? "—",
            fm(p.canalDistanceM),
            fm(r.before?.distanceM),
            fm(r.after?.distanceM),
            formatDelta(r.deltaM, lang),
            r.withinAfter ? L.yes : L.no,
          ];
        }),
      ],
    },
    layout: "lightHorizontalLines",
  });

  return {
    info: { title: L.title, author: L.author, subject: areaName },
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.25, color: "#0f2340" },
    footer: (current: number, total: number) => ({
      text: L.footer(areaName, current, total),
      alignment: "center",
      fontSize: 7.5,
      color: "#5b6577",
      margin: [0, 16, 0, 0],
    }),
    content,
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      meta: { fontSize: 8.5, color: "#5b6577" },
      h2: { fontSize: 12, bold: true, margin: [0, 12, 0, 4] },
      h3: { fontSize: 10, bold: true, margin: [0, 10, 0, 4] },
      note: { fontSize: 8.5, italics: true, color: "#3d4f6b", margin: [0, 2, 0, 4] },
      caption: { fontSize: 7.5, color: "#5b6577", margin: [0, 2, 0, 0] },
      table: { margin: [0, 4, 0, 6] },
      small: { fontSize: 8 },
      tiny: { fontSize: 7.5 },
    },
  };
}

export function reportFileName(r: ScenarioResult, d: Date, lang: Lang = "tr"): string {
  const stamp = d.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `kanalatlas-${RS[lang].file}-${r.category}-${stamp}.pdf`;
}

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
}

export const REPORT_TITLE = "KanalAtlas — Mahalle Erişilebilirlik ve Senaryo Değerlendirme Raporu";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(d);

const coord = (p: { lat: number; lon: number }) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

function summaryRows(before: Summary, after: Summary, thresholdM: number, hasScenario: boolean) {
  const row = (label: string, b: string, a: string) => [label, b, hasScenario ? a : "—"];
  return [
    row(`${formatMeters(thresholdM)} içindeki örnek nokta`, `${before.withinCount} / ${before.pointCount}`, `${after.withinCount} / ${after.pointCount}`),
    row("Ortalama en yakın mesafe", formatMeters(before.meanM), formatMeters(after.meanM)),
    row("Medyan en yakın mesafe", formatMeters(before.medianM), formatMeters(after.medianM)),
    row("En uzak örnek nokta", formatMeters(before.maxM), formatMeters(after.maxM)),
    row("Mesafesi tanımlı nokta", String(before.definedCount), String(after.definedCount)),
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
  for (const h of hypotheticals) {
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

export function buildReportDoc(input: ReportInput): TDocumentDefinitions {
  const { dataset, result, hypotheticals, explanations, saved, priorities } = input;
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
    { text: REPORT_TITLE, style: "title" },
    { text: `Oluşturulma: ${fmtDate(input.generatedAt)} · Varsayılan dil: Türkçe`, style: "meta" },
    {
      text: "Bu rapor KanalAtlas prototipinin o anki ekran durumundan otomatik üretilmiştir. Bir planlama kararı değil, tartışma için kanıt özetidir.",
      style: "note",
    },

    h2("1. Çalışma alanı"),
    {
      text: `${dataset.studyArea.name} (${dataset.studyArea.district}). ${dataset.studyArea.description} Sınır kutusu: G ${dataset.studyArea.bbox.south}, B ${dataset.studyArea.bbox.west}, K ${dataset.studyArea.bbox.north}, D ${dataset.studyArea.bbox.east}.`,
    },

    h2("2. Konu"),
    {
      text:
        "Adana'da açık sulama kanalları yerleşim alanlarının içinden geçer. Belediye meclisi Haziran 2026 tarihli “Yüzme Bilmeyen Çocuk Kalmasın” kararında, yaz sıcaklarında sulama kanalları gibi güvensiz alanlarda yaşanabilecek boğulmaları önlemeyi ücretsiz yüzme eğitiminin gerekçeleri arasında saymıştır. Tarım ve Orman Bakanlığı ise Eylül 2025'te kapalı basınçlı sisteme geçişin başladığını ve şehir merkezinden geçen açık kanalların devre dışı bırakılacağını duyurmuştur. KanalAtlas, bu koridorda haritalanmış kamusal rekreasyon olanaklarına düz çizgi erişimi ölçer ve varsayımsal iyileştirmeleri karşılaştırır.",
    },

    h2("3. Analiz ayarları ve mevcut tesisler"),
    {
      ul: [
        `Kategori: ${CATEGORY_LABEL[result.category]}`,
        `Veri kapsamı: ${SCOPE_LABEL[result.scope]}`,
        `Mesafe eşiği: ${formatMeters(result.thresholdM)} (düz çizgi)`,
        `Analize dahil haritalanmış tesis sayısı: ${result.baselineFacilityCount}`,
        `Örnek harita noktası: ${result.before.pointCount} (500 m ızgara)`,
      ],
    },
    topFacilities.length
      ? {
          style: "table",
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: [
              ["Tesis (en çok noktaya en yakın olanlar)", "Durum", "En yakın olduğu nokta", "OSM kaynağı"],
              ...topFacilities.map((f) => [
                f.name ?? "İsimsiz kayıt",
                STATUS_LABEL[f.status],
                String(servedCount.get(f.id) ?? 0),
                f.sources.map((s) => `${s.osmType}/${s.osmId}`).join(", "),
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        }
      : { text: "Bu kategori ve veri kapsamında analize dahil haritalanmış tesis yok.", style: "note" },

    h2("4. Kaynak ve doğrulama durumu"),
    {
      text: `Coğrafi veri: ${dataset.source.provider}. Lisans: ${dataset.source.license}. Çekim tarihi: ${dataset.extractedAt}. Haritalanmış tesislerin hiçbiri 'DOĞRULANMIŞ' olarak işaretlenmemiştir: OSM'de bulunmaları çalıştıkları veya halka açık oldukları anlamına gelmez. Erişimi kısıtlı (access=private/customers) kayıtlar analiz dışıdır.`,
    },

    h2("5. Varsayımsal müdahale"),
    hasScenario
      ? {
          ul: explanations.map((e) => {
            const h = hypotheticals.find((x) => x.id === e.id)!;
            return `${e.label} (VARSAYIMSAL) — konum ${coord(h)}${e.nearLabel ? `, ${e.nearLabel} yakını` : ""}. ${e.servesPoints.length} örnek noktanın en yakın tesisi olur; bunlardan ${e.newlyWithin} tanesi eşik içine yeni girer. Aynı kategorideki en yakın mevcut tesise uzaklığı: ${e.nearestExisting ? `${formatMeters(e.nearestExisting.distanceM)} (${e.nearestExisting.name ?? "isimsiz"})` : "tanımsız"}.`;
          }),
        }
      : {
          text: "Bu raporda varsayımsal tesis yok. Aşağıdaki değerler yalnızca mevcut haritalanmış tesislere göre başlangıç durumunu gösterir.",
          style: "note",
        },

    h2("6. Önce / sonra karşılaştırması"),
    {
      unbreakable: true,
      stack: [
        {
          style: "table",
          table: {
            headerRows: 1,
            widths: ["*", 110, 110],
            body: [["Ölçüt (tüm örnek noktalar)", "Başlangıç", "Senaryo"], ...summaryRows(result.before, result.after, result.thresholdM, hasScenario)],
          },
          layout: "lightHorizontalLines",
        },
        {
          style: "table",
          table: {
            headerRows: 1,
            widths: ["*", 110, 110],
            body: [
              [`Kanal kuşağı (kanala ≤ ${CANAL_BELT_M} m noktalar)`, "Başlangıç", "Senaryo"],
              ...summaryRows(result.canalBelt.before, result.canalBelt.after, result.thresholdM, hasScenario).slice(0, 3),
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
    },
    { text: interpretResult(result), margin: [0, 4, 0, 0] },
    ...(result.notes.length ? [{ ul: result.notes, style: "note" } as Content] : []),

    { text: "Şematik harita (uygulamadaki koordinatlardan çizildi)", style: "h3" },
    { svg: buildScenarioSvg(input), width: 515 },
    {
      text: "Kesikli çerçeve: çalışma alanı · mavi çizgi: haritalanmış kanal (ince: menfez/tünel) · yeşil kare: analize dahil mevcut tesis · daire: örnek nokta (dolu = eşik içinde, boş = eşik dışında, turuncu = varsayımsal tesise en yakın) · turuncu karo ve kesikli daire: varsayımsal tesis ve eşik yarıçapı.",
      style: "caption",
    },
  ];

  if (saved.length > 0) {
    content.push(h2("7. Kaydedilen senaryoların karşılaştırması"));
    content.push({
      text: "Tüm senaryolar rapor anındaki aynı kategori, veri kapsamı ve eşikle yeniden hesaplanmıştır.",
      style: "note",
    });
    content.push({
      style: "table",
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto", "auto", "auto"],
        body: [
          ["Senaryo", "Konum(lar)", "Eşik içinde", "Ortalama", "İyileşen nokta"],
          ["Başlangıç", "—", `${result.before.withinCount} / ${result.before.pointCount}`, formatMeters(result.before.meanM), "—"],
          ...saved.map((s) => [
            s.label,
            s.hypotheticals.map(coord).join("; ") || "—",
            `${s.result.after.withinCount} / ${s.result.after.pointCount} (${s.result.change.withinGained >= 0 ? "+" : ""}${s.result.change.withinGained})`,
            formatMeters(s.result.after.meanM),
            String(s.result.change.pointsImproved),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
    });
  }

  content.push(h2(`${saved.length > 0 ? 8 : 7}. Kullanıcının seçtiği öncelikler`));
  if (priorities && priorities.priority) {
    content.push({
      text: "Bu bölüm tek bir kullanıcının kendi tarayıcısında girdiği kişisel tercihleri gösterir; bir anket veya topluluk oylaması sonucu değildir.",
      style: "note",
    });
    content.push({
      ul: [
        `Düşünülen mahalle: ${priorities.neighbourhood || "belirtilmedi"}`,
        `Öncelik: ${priorityLabel(priorities.priority)}`,
        `Zorluklar: ${priorities.barriers.length ? priorities.barriers.map(barrierLabel).join(", ") : "belirtilmedi"}`,
        `Not: ${priorities.note.trim() || "—"}`,
      ],
    });
  } else {
    content.push({ text: "Kullanıcı öncelik girmedi.", style: "note" });
  }

  const n = saved.length > 0 ? 9 : 8;
  content.push(h2(`${n}. Yöntem`), { ol: METHOD_TEXT });
  content.push(h2(`${n + 1}. Sınırlılıklar ve belirsizlikler`), { ul: LIMITATIONS });
  content.push(h2(`${n + 2}. Kaynaklar`), {
    ul: [
      ...EVIDENCE.map((e) => ({
        text: [{ text: `[${STATUS_LABEL[e.status]}] `, bold: true }, `${e.publisher}, ${e.date}. `, { text: e.url, link: e.url, color: "#1d6fa5" }],
      })),
      { text: [`OpenStreetMap verisi: ${dataset.source.license}. `, { text: dataset.source.url, link: dataset.source.url, color: "#1d6fa5" }] },
    ],
    style: "small",
  });
  content.push(h2(`${n + 3}. Yerel planlamacılara sorulabilecek sorular`), { ol: PLANNER_QUESTIONS });

  content.push({ text: "\nÖrnek nokta ayrıntıları", style: "h3", pageBreak: "before" });
  const resById = new Map(result.points.map((r) => [r.pointId, r]));
  content.push({
    style: "tiny",
    table: {
      headerRows: 1,
      widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
      body: [
        ["Nokta", "Yakın mahalle (yaklaşık)", "Kanala", "Önce", "Sonra", "Fark", "Eşik içinde"],
        ...input.points.map((p) => {
          const r = resById.get(p.id)!;
          return [
            p.id,
            p.nearLabel ?? "—",
            formatMeters(p.canalDistanceM),
            formatMeters(r.before?.distanceM),
            formatMeters(r.after?.distanceM),
            formatDelta(r.deltaM),
            r.withinAfter ? "Evet" : "Hayır",
          ];
        }),
      ],
    },
    layout: "lightHorizontalLines",
  });

  return {
    info: { title: REPORT_TITLE, author: "KanalAtlas prototipi", subject: dataset.studyArea.name },
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.25, color: "#0f2340" },
    footer: (current: number, total: number) => ({
      text: `KanalAtlas · ${dataset.studyArea.name} · düz çizgi mesafe, nüfus verisi içermez · ${current}/${total}`,
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

export function reportFileName(r: ScenarioResult, d: Date): string {
  const stamp = d.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `kanalatlas-rapor-${r.category}-${stamp}.pdf`;
}

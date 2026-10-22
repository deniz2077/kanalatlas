/**
 * PDF correctness: render real PDFs (pdfmake, Node build) for two different
 * scenarios, extract their text with pdf.js, and check the calculated values
 * appear and differ. This proves the PDF is built from scenario state.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canalCorridor, dataset, evaluationPoints } from "../data";
import { explainHypotheticals, formatMeters } from "../insights";
import { buildReportDoc, buildScenarioSvg, type ReportInput } from "../report";
import { evaluateScenario } from "../scenario";
import type { HypotheticalFacility } from "../types";
import { EMPTY_PRIORITIES } from "../priorities";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require("pdfmake");
const fontDir = path.resolve(__dirname, "../../../node_modules/pdfmake/build/fonts/Roboto");
pdfmake.setFonts({
  Roboto: {
    normal: path.join(fontDir, "Roboto-Regular.ttf"),
    bold: path.join(fontDir, "Roboto-Medium.ttf"),
    italics: path.join(fontDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
  },
});
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((p: string) => p.startsWith(fontDir));

async function pdfText(input: ReportInput): Promise<string> {
  const buf: Buffer = await pdfmake.createPdf(buildReportDoc(input)).getBuffer();
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: false }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    text += c.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  }
  return text.replace(/\s+/g, " ");
}

const hyp = (lat: number, lon: number): HypotheticalFacility => ({
  id: "hyp-1",
  lat,
  lon,
  category: "swimming",
  label: "Varsayımsal tesis 1",
});

function inputFor(h: HypotheticalFacility[], priorities = EMPTY_PRIORITIES): ReportInput {
  const result = evaluateScenario({
    points: evaluationPoints,
    facilities: dataset.facilities,
    category: "swimming",
    scope: "core",
    hypotheticals: h,
    thresholdM: 1000,
  });
  return {
    generatedAt: new Date("2026-10-23T09:00:00Z"),
    dataset,
    points: evaluationPoints,
    result,
    hypotheticals: h,
    explanations: explainHypotheticals(result, h, dataset.facilities, evaluationPoints, dataset.neighbourhoods),
    saved: [],
    priorities,
  };
}

describe("PDF report", () => {
  // Location A in the east (Gazipaşa area), Location B in the west (İsmetpaşa area)
  const A = inputFor([hyp(37.0105, 35.3205)]);
  const B = inputFor([hyp(37.008, 35.285)]);

  it("the two locations produce different calculated results", () => {
    expect(A.result.after.withinCount).not.toBe(B.result.after.withinCount);
  });

  it("contains the scenario's own numbers, Turkish characters and caveats", async () => {
    const text = await pdfText(A);
    expect(text).toContain("Mahalle Erişilebilirlik ve Senaryo Değerlendirme Raporu");
    expect(text).toContain(`${A.result.before.withinCount} / ${A.result.before.pointCount}`);
    expect(text).toContain(`${A.result.after.withinCount} / ${A.result.after.pointCount}`);
    expect(text).toContain(formatMeters(A.result.after.meanM));
    expect(text).toContain("37.01050, 35.32050");
    expect(text).toContain("VARSAYIMSAL");
    expect(text).toMatch(/düz çizgi/);
    expect(text).toContain("Kullanıcı öncelik girmedi");
    expect(text).toContain("Yüzme Bilmeyen Çocuk Kalmasın");
  }, 30_000);

  it("a different location produces a PDF with different numbers", async () => {
    const text = await pdfText(B);
    expect(text).toContain(`${B.result.after.withinCount} / ${B.result.after.pointCount}`);
    expect(text).toContain("37.00800, 35.28500");
    expect(text).not.toContain("37.01050, 35.32050");
  }, 30_000);

  it("baseline-only report explains that no intervention was added", async () => {
    const text = await pdfText(inputFor([]));
    expect(text).toContain("Bu raporda varsayımsal tesis yok");
  }, 30_000);

  it("labels user priorities as personal input, not a survey", async () => {
    const text = await pdfText(
      inputFor([hyp(37.0105, 35.3205)], {
        neighbourhood: "Gazipaşa",
        priority: "public-pool",
        barriers: ["cost", "distance"],
        note: "Test notu",
        savedAt: null,
      }),
    );
    expect(text).toContain("kişisel tercihleri");
    expect(text).toContain("Gazipaşa");
    expect(text).toContain("Ücret");
    expect(text).not.toMatch(/anket sonuçları/i);
  }, 30_000);

  it("canal-corridor park scenario: PDF explains the assumption and its numbers", async () => {
    const corridor: HypotheticalFacility = { id: "hyp-9", lat: 37.011, lon: 35.3, category: "park", label: "Kanal hattı doğrusal parkı", path: canalCorridor };
    const result = evaluateScenario({ points: evaluationPoints, facilities: dataset.facilities, category: "park", scope: "core", hypotheticals: [corridor], thresholdM: 300 });
    expect(result.after.withinCount).toBeGreaterThan(result.before.withinCount);
    const input: ReportInput = {
      generatedAt: new Date("2026-10-23T09:00:00Z"),
      dataset,
      points: evaluationPoints,
      result,
      hypotheticals: [corridor],
      explanations: explainHypotheticals(result, [corridor], dataset.facilities, evaluationPoints, dataset.neighbourhoods),
      saved: [],
      priorities: null,
    };
    const text = await pdfText(input);
    expect(text).toContain("Kanal hattı doğrusal parkı");
    expect(text).toContain("doğrulanmamıştır");
    expect(text).toContain(`${result.after.withinCount} / 72`);
    expect(buildScenarioSvg(input)).toContain('stroke="#b45309" stroke-width="5"');
  }, 30_000);

  it("schematic SVG is drawn from coordinates and includes the hypothetical", () => {
    const svg = buildScenarioSvg(A);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<polygon"); // hypothetical diamond
    expect((svg.match(/<circle/g) ?? []).length).toBe(evaluationPoints.length + 1); // points + threshold ring
    expect(buildScenarioSvg(B)).not.toEqual(svg);
  });
});

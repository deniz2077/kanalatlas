/**
 * Records a captioned, automated walkthrough of the REAL running app
 * (production build) with Playwright's built-in screen recorder.
 *
 *   npm run build && npm run demo:record
 *
 * Output: submission/video/kanalatlas-demo-draft.webm (1280×720).
 * Every interaction below is performed on the live app; captions only
 * describe what is happening on screen. Nothing is composited or faked.
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "submission/video");
const tmpDir = path.join(root, "test-results/demo-tmp");
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

const PORT = 3150;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { cwd: root, stdio: "ignore" });
const waitFor = async (url) => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
};

// Tiny static server for viewing the downloaded PDF with pdf.js.
const VIEW_PORT = 3151;
const viewer = http
  .createServer((req, res) => {
    const files = {
      "/": ["text/html", path.join(tmpDir, "viewer.html")],
      "/pdf.mjs": ["text/javascript", path.join(root, "node_modules/pdfjs-dist/build/pdf.mjs")],
      "/pdf.worker.mjs": ["text/javascript", path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.mjs")],
      "/report.pdf": ["application/pdf", path.join(tmpDir, "report.pdf")],
    };
    const f = files[req.url];
    if (!f) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": f[0] });
    fs.createReadStream(f[1]).pipe(res);
  })
  .listen(VIEW_PORT);
fs.writeFileSync(
  path.join(tmpDir, "viewer.html"),
  `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#525659;font-family:sans-serif">
<div id="c" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px"></div>
<script type="module">
import * as pdfjs from "./pdf.mjs"; pdfjs.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";
const doc = await pdfjs.getDocument({ url: "./report.pdf" }).promise;
for (let i = 1; i <= doc.numPages; i++) { const p = await doc.getPage(i); const v = p.getViewport({ scale: 1.5 });
  const cv = document.createElement("canvas"); cv.width = v.width; cv.height = v.height; cv.style.boxShadow = "0 2px 8px #0006";
  document.getElementById("c").appendChild(cv); await p.render({ canvasContext: cv.getContext("2d"), viewport: v, canvas: cv }).promise; }
document.title = "ready";
</script>`,
);

const CAPTION_JS = `
(() => {
  if (document.getElementById("__demo_caption")) return;
  const c = document.createElement("div");
  c.id = "__demo_caption";
  c.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:1080px;width:calc(100% - 80px);z-index:99999;background:rgba(15,35,64,.94);color:#fff;font:500 19px/1.4 Inter,system-ui,sans-serif;padding:12px 20px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.3);pointer-events:none;display:none";
  document.body.appendChild(c);
  const dot = document.createElement("div");
  dot.style.cssText = "position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(245,158,11,.55);border:2px solid #b45309;z-index:99998;pointer-events:none;left:-50px;top:-50px;transition:left .05s,top .05s";
  document.body.appendChild(dot);
  window.addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; }, true);
})();`;

await waitFor(`http://localhost:${PORT}/`);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: tmpDir, size: { width: 1280, height: 720 } },
  acceptDownloads: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text()); });
await page.addInitScript({ content: `window.addEventListener("DOMContentLoaded", () => { ${CAPTION_JS} });` });

const wait = (s) => page.waitForTimeout(s * 1000);
async function caption(tr, en, seconds = 0) {
  await page.evaluate(CAPTION_JS);
  await page.evaluate(
    ([tr, en]) => {
      const c = document.getElementById("__demo_caption");
      c.style.display = tr ? "block" : "none";
      c.innerHTML = tr ? `${tr}${en ? `<div style="font-size:15px;opacity:.8;margin-top:4px">${en}</div>` : ""}` : "";
    },
    [tr, en],
  );
  if (seconds) await wait(seconds);
}
async function scrollTo(selector, offset = 70) {
  await page.evaluate(
    ([s, o]) => {
      const el = document.querySelector(s);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - o, behavior: "smooth" });
    },
    [selector, offset],
  );
  await wait(1.2);
}
/** Current "before → after (+gain)" numbers read from the live results card. */
async function liveNumbers() {
  const t = (await page.getByTestId("within-headline").innerText()).replace(/\s+/g, " ");
  const m = t.match(/(\d+) → (\d+) \(([+-]?\d+)\)/);
  return m ? { before: m[1], after: m[2], gain: m[3] } : null;
}
async function moveMouseTo(locator) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
}

process.on("uncaughtException", (e) => { console.error(e); server.kill(); viewer.close(); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error(e); server.kill(); viewer.close(); process.exit(1); });
const t0 = Date.now();
// ---------------------------------------------------------------- 1. problem
await page.goto(`http://localhost:${PORT}/`);
await wait(1.5);
await caption(
  "KanalAtlas — Adana'daki açık sulama kanalı koridorları için çalışan bir erişilebilirlik ve senaryo prototipi.",
  "KanalAtlas — a working accessibility & scenario prototype for Adana's open irrigation canal corridors.",
  7,
);
await scrollTo("#sorun");
await caption(
  "Belediye meclisi Haziran 2026'da, ücretsiz yüzme eğitiminin gerekçesi olarak sulama kanallarındaki boğulma riskini yazdı.",
  "Sourced facts: the council cites drowning in irrigation canals; 26 pools offered free lessons in 2025; open city canals are to be closed.",
  9,
);
await page.mouse.wheel(0, 420);
await wait(1);
await caption(
  "Bu sayılar sabit yazılmadı: çalışma alanındaki 72 örnek noktadan 13'ü, adı olan bir yüzme tesisine 1 km kuş uçuşu mesafede.",
  "Computed from OpenStreetMap data: 13 of 72 sampled map points are within 1 km (straight line) of a named swimming facility.",
  9,
);

// ---------------------------------------------------------------- 2. map
await scrollTo('[data-testid="map"]', 62);
await caption(
  "Gerçek harita: mavi çizgi OSM'deki açık kanal, kesikli çerçeve çalışma alanı, daireler 500 m aralıklı örnek noktalar.",
  "Real map: blue = mapped canal, dashed box = study area, circles = 500 m sample grid (not people or homes).",
  8,
);
await caption("Yeşil çizgiler: her noktanın en yakın haritalanmış yüzme tesisine bağlantısı.", "Green lines link each point to its nearest mapped swimming facility.", 6);
// Click an analysed facility marker that is inside the visible map area.
const pos = await page.evaluate(() => {
  const m = document.querySelector(".leaflet-container").getBoundingClientRect();
  const els = [...document.querySelectorAll(".ka-marker--swim:not(.ka-marker--faded)")].map((e) => e.getBoundingClientRect());
  // Prefer a marker near the middle so the popup does not auto-pan the map much.
  const r = els
    .filter((b) => b.left > m.left + 60 && b.right < m.right - 20 && b.top > m.top + 120 && b.bottom < m.bottom - 120)
    .sort((a, b) => Math.abs(a.top - (m.top + m.height / 2)) - Math.abs(b.top - (m.top + m.height / 2)))[0];
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
});
if (pos) {
  await page.mouse.move(pos.x, pos.y, { steps: 15 });
  await page.mouse.click(pos.x, pos.y);
}
await caption(
  "Her tesisin kaynağı ve durumu görünür: HARİTALANMIŞ = OSM'de var, çalışma durumu doğrulanmadı.",
  "Every facility shows its OSM source and status. MAPPED means operating status is not verified.",
  8,
);
await page.locator(".leaflet-popup-close-button").click().catch(() => {});
await page.getByRole("button", { name: "Alanı ortala" }).click();
await wait(1);
const scope = page.getByLabel("Veri kapsamı");
await moveMouseTo(scope);
await scope.selectOption("all");
{
  const all = (await page.getByTestId("within-headline").innerText()).match(/\d+/)[0];
  await caption(
    `Veri kapsamını 'tüm kayıtlar'a alınca isimsiz (muhtemelen site) havuzlar da sayılır: eşik içindeki nokta sayısı 13'ten ${all} noktaya çıkıyor. Veriye ne kadar güvendiğimiz de bir bulgu.`,
    `Including unnamed (likely private complex) pools changes 13 → ${all}. How much you trust the data is itself a finding.`,
    9,
  );
}
await scope.selectOption("core");
await wait(1.5);

// ---------------------------------------------------------------- 3. scenario
const best = page.getByRole("button", { name: "En çok fayda sağlayan konuma ekle" });
await moveMouseTo(best);
await caption("Şimdi varsayımsal bir yüzme tesisi ekleyelim. Uygulama 1.456 aday konumu tarayıp en çok noktayı eşik içine alanı seçiyor.", "Add a hypothetical facility: the app screens 1,456 candidate sites for the one that brings the most points within 1 km.", 5);
await best.click();
await scrollTo('[data-testid="map"]', 62);
const nA = await liveNumbers();
await caption(
  `Turuncu çizgiler: en yakın tesisi artık varsayımsal tesis olan noktalar. Sonuç: ${nA.before} → ${nA.after} nokta (${nA.gain}). Kesikli halka 1 km yarıçapı.`,
  `Amber lines = points now closest to the hypothetical site. Result: ${nA.before} → ${nA.after} points (${nA.gain}). Dashed ring = 1 km radius.`,
  9,
);
await page.getByRole("button", { name: "Bu senaryoyu kaydet" }).click();
await caption("Bu konumu Senaryo A olarak kaydettik. Şimdi tesisi haritada sürükleyerek başka bir yere taşıyalım.", "Saved as Scenario A. Now drag the facility somewhere else on the map.", 4);

await scrollTo('[data-testid="map"]', 62);
const coordsBefore = await page.getByTestId("hyp-coords").first().innerText();
const marker = page.locator(".ka-marker--hypo").first();
const mb = await marker.boundingBox();
await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2, { steps: 10 });
await page.mouse.down();
await caption("Sürüklerken her hareket gerçek koordinatlardan yeniden hesaplanır — sayılar ve çizgiler canlı değişiyor.", "Every movement is recalculated from real coordinates — numbers and lines update live while dragging.");
for (let i = 1; i <= 60; i++) {
  await page.mouse.move(mb.x + mb.width / 2 - i * 6.5, mb.y + mb.height / 2 + Math.sin(i / 10) * 25, { steps: 2 });
  await wait(0.09);
}
await page.mouse.up();
await wait(1.5);
if ((await page.getByTestId("hyp-coords").first().innerText()) === coordsBefore) throw new Error("drag did not move the marker");
await scrollTo('[data-testid="map"]', 62);
const nB = await liveNumbers();
await caption(
  `Yeni konumda sonuç ${nB.before} → ${nB.after} (${nB.gain}); önceki konumda ${nA.gain} idi. Aynı hesap, farklı yer, farklı sonuç.`,
  `At the new location: ${nB.before} → ${nB.after} (${nB.gain}), versus ${nA.gain} before. Same method, different place, different result.`,
  8,
);
await page.mouse.wheel(0, 360);
await wait(1);
await caption(
  "'Neden bu sonuç?' kutusu: tesisin kaç noktaya en yakın olduğu, kaçının eşiğe yeni girdiği ve en yakın mevcut tesise uzaklığı.",
  "'Why this result?' shows how many points it serves, how many newly enter the threshold, and the distance to the nearest existing facility.",
  8,
);
await page.getByRole("button", { name: "Bu senaryoyu kaydet" }).click();
await scrollTo('[data-testid="comparison"]', 120);
await caption(
  "Kaydedilen senaryolar aynı ayarlarla yeniden hesaplanıp yan yana karşılaştırılıyor; en iyi satır işaretleniyor.",
  "Saved scenarios are re-evaluated with identical settings and compared side by side.",
  9,
);
await page.getByText(/Harita yerine tablo/).click();
await wait(1);
await caption("Haritayı kullanamayanlar için aynı sonuçlar tablo olarak da var (erişilebilirlik).", "The same results are available as a sortable table for people who cannot use the map.", 6);

// ---------------------------------------------------------------- 3b. canal corridor
await scrollTo('[data-testid="map"]', 62);
const parkTab = page.getByText("Park / yeşil alan", { exact: true });
await moveMouseTo(parkTab);
await parkTab.click();
await wait(1.5);
await caption(
  "Uzun vadeli soru: Bakanlık şehir merkezindeki açık kanalların kapatılacağını duyurdu. Kanal hattı bir parka dönüşse ne değişir?",
  "The long-term question: open city canals are to be closed. What if this canal line became a park?",
  7,
);
const corrBtn = page.getByRole("button", { name: "Kanal hattını doğrusal parka dönüştür" });
await corrBtn.scrollIntoViewIfNeeded();
await moveMouseTo(corrBtn);
await corrBtn.click();
await scrollTo('[data-testid="map"]', 62);
const nC = await liveNumbers();
await caption(
  `Varsayımsal doğrusal park: 300 m içindeki nokta ${nC.before} → ${nC.after} (${nC.gain}). Uzaklık hattın en yakın noktasına ölçülüyor. Kapanma ve arazi durumu doğrulanmadı.`,
  `Hypothetical linear park along the canal: points within 300 m ${nC.before} → ${nC.after} (${nC.gain}). Distance to the nearest point on the line. Closure and land are not verified.`,
  10,
);
await page.getByText("Yüzme tesisi", { exact: true }).click();
await wait(1);

// ---------------------------------------------------------------- 4. priorities
await scrollTo("#oncelikler", 70);
await caption("Kendi önceliklerinizi ekleyebilirsiniz. Bu bir anket değildir: veriler yalnızca bu tarayıcıda kalır.", "Personal priorities — not a survey. Stored only in this browser, never sent to a server.", 6);
await page.getByLabel("Hangi mahalleyi düşünüyorsunuz?").selectOption("Gazipaşa");
await wait(0.8);
const pool = page.getByLabel("Halka açık, ücretsiz veya düşük ücretli yüzme imkânı");
await moveMouseTo(pool);
await pool.check();
await wait(0.6);
await page.getByLabel("Ücret", { exact: true }).check();
await page.getByLabel("Uzaklık / ulaşım zorluğu").check();
await wait(0.6);
await page.getByRole("button", { name: "Önceliklerimi kaydet" }).click();
await wait(3);

// ---------------------------------------------------------------- 5. PDF
await scrollTo("#rapor", 70);
const pdfBtn = page.getByRole("button", { name: "PDF raporu oluştur ve indir" });
await moveMouseTo(pdfBtn);
await caption("Son olarak, ekrandaki durumdan bir planlama raporu (PDF) üretelim.", "Finally, generate a planning brief (PDF) from the current state.", 3);
const [download] = await Promise.all([page.waitForEvent("download"), pdfBtn.click()]);
await download.saveAs(path.join(tmpDir, "report.pdf"));
await wait(2);
await page.goto(`http://localhost:${VIEW_PORT}/`);
await page.waitForFunction(() => document.title === "ready", null, { timeout: 30000 });
await caption("İndirilen gerçek PDF: senaryonun kendi sayıları, kaynak durumları, yöntem ve sınırlılıklar.", "The actual downloaded PDF: this scenario's numbers, source statuses, method and limitations.", 6);
for (let i = 0; i < 10; i++) {
  await page.mouse.wheel(0, 320);
  await wait(0.9);
}
await caption("Şematik harita uygulamadaki koordinatlardan çiziliyor; A/B karşılaştırması ve kişisel öncelikler de raporda.", "The schematic map is drawn from the app's coordinates; the A/B comparison and personal priorities are included.", 7);
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, 320);
  await wait(0.9);
}

// ---------------------------------------------------------------- 6. limits & close
await page.goto(`http://localhost:${PORT}/#yontem`);
await wait(1.5);
await caption(
  "Sınırlılıklar açıkça yazılı: kuş uçuşu mesafe yürüme mesafesi değildir, noktalar nüfusu temsil etmez, boğulma riski tahmin edilmez.",
  "Limits are explicit: straight-line ≠ walking distance, points ≠ population, no drowning-risk prediction.",
  9,
);
await caption(
  "Sonraki adımlar: yürüme ağı mesafesi, doğrulanmış belediye havuz listesi, gerçek topluluk görüşmeleri ve yeni mahalleler.",
  "Next: walking-network distance, a verified municipal pool list, real community input and more neighbourhoods.",
  8,
);
await caption("KanalAtlas · açık kaynak · Neighborhood Hacks 2026", "", 4);

const seconds = Math.round((Date.now() - t0) / 1000);
const video = page.video();
await context.close();
const src = await video.path();
const dest = path.join(outDir, "kanalatlas-demo-draft.webm");
fs.copyFileSync(src, dest);
await browser.close();
viewer.close();
server.kill();
console.log(`recorded ~${seconds}s → ${path.relative(root, dest)} (${(fs.statSync(dest).size / 1e6).toFixed(1)} MB)`);

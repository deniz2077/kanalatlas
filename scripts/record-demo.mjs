/**
 * Records a narrated, captioned walkthrough of the REAL running app
 * (production build, English UI) in two passes:
 *   1. a silent rehearsal performs every interaction and collects the
 *      narration text, with numbers read from the screen;
 *   2. the lines are synthesised with Kokoro (tools/tts/narrate.mjs, voice
 *      am_michael, Turkish place names pronounced correctly), then the same
 *      walkthrough is recorded while each clip plays and is shown as a subtitle.
 *      If any on-screen number differs from the rehearsal, recording aborts.
 * Chrome streams screencast frames; scripts/encode-mp4.mjs encodes H.264 + AAC.
 *
 *   (cd tools/tts && npm install) && npm run build && npm run demo:record
 *
 * Output: submission/video/kanalatlas-demo.mp4 (1280×720, 30 fps, AAC audio).
 * Every interaction is performed on the live app. Numbers in the narration are
 * read from the screen at recording time, never typed in.
 */
import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { encodeMp4 } from "./encode-mp4.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "submission/video");
const tmpDir = path.join(root, "test-results/demo-tmp");
const clipsDir = path.join(tmpDir, "clips");
fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(clipsDir, { recursive: true });

// ---------------------------------------------------------------- voice
// Narration: Kokoro (open-source neural TTS) via tools/tts/narrate.mjs, voice
// am_michael, with hand-set Turkish pronunciations. Install once:
//   cd tools/tts && npm install
const TTS_DIR = path.join(root, "tools/tts");
const VOICE = process.env.DEMO_VOICE ?? "am_michael";
const SPEED = process.env.DEMO_SPEED ?? "0.95";

/** Read a WAV (16-bit PCM or 32-bit float, mono) and return Int16 samples at 48 kHz. */
function readWavAs48k(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  let fmt = null;
  let data = null;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { format: b.readUInt16LE(p + 8), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === "data") data = b.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`bad wav ${file}`);
  const n = data.length / (fmt.bits / 8);
  const src = new Float32Array(n);
  for (let i = 0; i < n; i++) src[i] = fmt.bits === 32 && fmt.format === 3 ? data.readFloatLE(i * 4) : data.readInt16LE(i * 2) / 32768;
  const ratio = 48000 / fmt.rate;
  const out = new Int16Array(Math.floor(n * ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i / ratio;
    const i0 = Math.floor(x);
    const v = (src[i0] ?? 0) + ((src[i0 + 1] ?? src[i0] ?? 0) - (src[i0] ?? 0)) * (x - i0);
    out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767 * 0.95)));
  }
  return out;
}

// ---------------------------------------------------------------- servers
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

const VIEW_PORT = 3151;
const viewer = http
  .createServer((req, res) => {
    const files = {
      "/": ["text/html", path.join(tmpDir, "viewer.html")],
      "/pdf.mjs": ["text/javascript", path.join(root, "node_modules/pdfjs-dist/build/pdf.mjs")],
      "/pdf.worker.mjs": ["text/javascript", path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.mjs")],
      "/report.pdf": ["application/pdf", path.join(tmpDir, "report.pdf")],
      "/card-start": ["text/html; charset=utf-8", path.join(tmpDir, "card-start.html")],
      "/card-end": ["text/html; charset=utf-8", path.join(tmpDir, "card-end.html")],
    };
    const f = files[req.url];
    if (!f) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": f[0] });
    fs.createReadStream(f[1]).pipe(res);
  })
  .listen(VIEW_PORT);
fs.writeFileSync(
  path.join(tmpDir, "viewer.html"),
  `<!doctype html><meta charset="utf-8"><title>KanalAtlas report</title><body style="margin:0;background:#525659;font-family:sans-serif">
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

const card = (inner) => `<!doctype html><meta charset="utf-8"><title>KanalAtlas</title>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#faf8f3;color:#0f2340;font-family:Inter,system-ui,sans-serif">
<div style="max-width:980px;padding:40px">${inner}</div></body>`;
const logo = `<svg width="64" height="64" viewBox="0 0 26 26" style="vertical-align:middle;margin-right:14px"><rect width="26" height="26" rx="6" fill="#0f2340"/><path d="M3 16 C 8 12, 12 18, 17 14 S 23 11, 23 11" stroke="#5fb3e6" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="15" y="5" width="6" height="6" rx="1" transform="rotate(45 18 8)" fill="#f59e0b"/></svg>`;
fs.writeFileSync(
  path.join(tmpDir, "card-start.html"),
  card(`<div style="font-size:64px;font-weight:800;letter-spacing:-1px">${logo}KanalAtlas</div>
  <div style="font-size:30px;margin-top:22px;font-weight:600">Explore your neighbourhood. See what it needs. <span style="color:#b45309">Imagine its future together.</span></div>
  <div style="font-size:22px;margin-top:10px;color:#3d4f6b">An accessibility &amp; scenario map for Adana's open irrigation canal corridor</div>
  <div style="font-size:18px;margin-top:36px;color:#5b6577;border-top:1px solid #e4e0d6;padding-top:18px">Neighborhood Hacks 2026 · Seyhan, Adana, Türkiye<br>Real footage of the working app · narration: computer-generated voice</div>`),
);
fs.writeFileSync(
  path.join(tmpDir, "card-end.html"),
  card(`<div style="font-size:48px;font-weight:800">${logo}KanalAtlas</div>
  <div style="font-size:24px;margin-top:24px;line-height:1.6">Live demo: <b>deniz2077.github.io/kanalatlas</b><br>Code: <b>github.com/deniz2077/kanalatlas</b></div>
  <div style="font-size:18px;margin-top:28px;color:#3d4f6b;line-height:1.6">Straight-line distances on OpenStreetMap data · sampled points, not population · no drowning-risk prediction.<br>Sources: Adana Metropolitan Council (12.06.2026), Adana Municipality (21.07.2025), Ministry of Agriculture (10.09.2025).<br>Narration: computer-generated voice reading the project's script.</div>`),
);

const OVERLAY_JS = `
(() => {
  if (document.getElementById("__demo_caption")) return;
  const c = document.createElement("div");
  c.id = "__demo_caption";
  c.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);max-width:1060px;width:calc(100% - 80px);z-index:99999;background:rgba(15,35,64,.92);color:#fff;font:500 20px/1.4 Inter,system-ui,sans-serif;padding:12px 20px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.3);pointer-events:none;display:none;text-align:center";
  document.body.appendChild(c);
  const dot = document.createElement("div");
  dot.style.cssText = "position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(245,158,11,.55);border:2px solid #b45309;z-index:99998;pointer-events:none;left:-50px;top:-50px;transition:left .05s,top .05s";
  document.body.appendChild(dot);
  window.addEventListener("mousemove", (e) => { dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; }, true);
})();`;

// ---------------------------------------------------------------- browser + screencast
await waitFor(`http://localhost:${PORT}/`);
const browser = await chromium.launch();
let context;
let page;
async function freshPage() {
  if (context) await context.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, acceptDownloads: true });
  page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.addInitScript({ content: `window.addEventListener("DOMContentLoaded", () => { ${OVERLAY_JS} });` });
}

const framesDir = path.join(tmpDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });
const frames = [];

const wait = (s) => page.waitForTimeout(s * 1000);
const cues = []; // { samples, t (epoch seconds) }

async function subtitle(text) {
  await page.evaluate(OVERLAY_JS);
  await page.evaluate((txt) => {
    const c = document.getElementById("__demo_caption");
    c.style.display = txt ? "block" : "none";
    c.textContent = txt;
  }, text);
}
/**
 * Narration line. Rehearsal mode records the text (with live numbers) and only
 * waits briefly; record mode plays the pre-synthesised clip for the same text
 * (aborting if the text differs, i.e. a number on screen changed), shows it as
 * a subtitle, and waits until it has been spoken. `during` runs while it plays.
 */
let MODE = "rehearse";
const lines = []; // texts in order (rehearsal)
const clips = []; // { samples, seconds } in order (record)
let lineIdx = 0;
async function say(text, { pause = 0.6, during } = {}) {
  const i = lineIdx++;
  if (MODE === "rehearse") {
    lines.push(text);
    if (during) await during();
    else await wait(0.3);
    return;
  }
  if (lines[i] !== text) throw new Error(`narration mismatch at line ${i}:\n rehearsal: ${lines[i]}\n now:       ${text}`);
  await subtitle(text);
  cues.push({ samples: clips[i].samples, t: Date.now() / 1000 });
  const speaking = wait(clips[i].seconds + pause);
  if (during) await Promise.all([speaking, during()]);
  else await speaking;
}
async function scrollTo(selector, offset = 70) {
  await page.evaluate(
    ([s, o]) => {
      const el = document.querySelector(s);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - o, behavior: "smooth" });
    },
    [selector, offset],
  );
  await wait(1.1);
}
async function liveNumbers() {
  const t = (await page.getByTestId("within-headline").innerText()).replace(/\s+/g, " ");
  const m = t.match(/(\d+) → (\d+) \(([+-]?\d+)\)/);
  return m ? { before: m[1], after: m[2], gain: m[3] } : null;
}
async function moveMouseTo(locator) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
}

const cleanup = () => {
  server.kill();
  viewer.close();
};
process.on("uncaughtException", (e) => { console.error(e); cleanup(); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error(e); cleanup(); process.exit(1); });

async function demo() {
// ---------------------------------------------------------------- 0. title
await page.goto(`http://localhost:${VIEW_PORT}/card-start`);
await wait(1);
await say("KanalAtlas: an accessibility and scenario map for Adana's open irrigation canals.", { pause: 1.2 });

// ---------------------------------------------------------------- 1. problem
await page.goto(`http://localhost:${PORT}/`);
await wait(1.2);
await say("In Adana, open irrigation canals run through neighbourhoods, and summers are extremely hot. Some people cool off in the canals.");
await scrollTo("#sorun");
await say("The city council's own decision names drowning in irrigation canals as a reason for its free swimming lessons. But the pool locations are not published, and the government plans to close the open canals in the city centre.");
await page.mouse.wheel(0, 420);
await wait(0.8);
const baseline = (await page.locator("#sorun .text-4xl").first().innerText()).match(/\d+/g);
await say(`So where are pools and parks today, and where would a new one help most? In this study area, only ${baseline[0]} of ${baseline[1]} sample points are within one kilometre, in a straight line, of a mapped swimming facility.`);

// ---------------------------------------------------------------- 2. map
await scrollTo('[data-testid="map"]', 62);
await say("This is the real map of a canal corridor in Seyhan. The blue line is the canal from OpenStreetMap, the dashed box is the study area, and each circle is a sample point on a five-hundred-metre grid. These are map points, not people.");
const pos = await page.evaluate(() => {
  const m = document.querySelector(".leaflet-container").getBoundingClientRect();
  const els = [...document.querySelectorAll(".ka-marker--swim:not(.ka-marker--faded)")].map((e) => e.getBoundingClientRect());
  const r = els
    .filter((b) => b.left > m.left + 60 && b.right < m.right - 20 && b.top > m.top + 120 && b.bottom < m.bottom - 120)
    .sort((a, b) => Math.abs(a.top - (m.top + m.height / 2)) - Math.abs(b.top - (m.top + m.height / 2)))[0];
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
});
if (pos) {
  await page.mouse.move(pos.x, pos.y, { steps: 15 });
  await page.mouse.click(pos.x, pos.y);
}
await say("Every facility shows its source and its status. Mapped means it exists in OpenStreetMap, but its operating status has not been verified.");
await page.locator(".leaflet-popup-close-button").click().catch(() => {});
await page.getByRole("button", { name: "Re-centre" }).click();
await page.getByText("Advanced settings").click();
const scope = page.getByLabel("Data scope");
await scope.scrollIntoViewIfNeeded();
await moveMouseTo(scope);
await scope.selectOption("all");
await wait(0.6);
const allWithin = (await page.getByTestId("within-headline").innerText()).match(/\d+/)[0];
await say(`If we also count unnamed pools, which are mostly private, the number jumps to ${allWithin}. How much you trust the data is itself a finding.`);
await scope.selectOption("core");
await page.getByText("Advanced settings").click();
await wait(0.5);

// ---------------------------------------------------------------- 3. scenario
await scrollTo('[data-testid="map"]', 62);
const best = page.getByRole("button", { name: "Find a promising location" });
await moveMouseTo(best);
await say("Now let's add a hypothetical pool. This button tests one thousand, four hundred and fifty-six candidate sites, and picks the one that brings the most points within range.", { pause: 0.3 });
await best.click();
await wait(0.6);
const nA = await liveNumbers();
await say(`The result: ${nA.before} becomes ${nA.after}. The amber lines show which points now have this pool as their nearest facility, and the dashed ring is the one-kilometre radius.`, { pause: 1.2 });
await page.getByRole("button", { name: "Save this scenario" }).click();
await scrollTo('[data-testid="map"]', 62);
const coordsBefore = await page.getByTestId("hyp-coords").first().innerText();
const marker = page.locator(".ka-marker--hypo").first();
const mb = await marker.boundingBox();
await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2, { steps: 10 });
await page.mouse.down();
await say("Let's save that as scenario A, and drag the pool to the west. Every movement is recalculated live, from real coordinates.", {
  during: async () => {
    for (let i = 1; i <= 60; i++) {
      await page.mouse.move(mb.x + mb.width / 2 - i * 6.5, mb.y + mb.height / 2 + Math.sin(i / 10) * 25, { steps: 2 });
      await wait(0.08);
    }
    await page.mouse.up();
  },
});
if ((await page.getByTestId("hyp-coords").first().innerText()) === coordsBefore) throw new Error("drag did not move the marker");
const nB = await liveNumbers();
await say(`Here, it only reaches ${nB.after}, compared with ${nA.after} before. Same method, different place, different result.`, { pause: 1.0 });
await page.mouse.wheel(0, 360);
await wait(0.8);
await say("The 'why this result' box explains it: how many points the pool serves, how many newly come within range, and how far it is from existing pools.");
await page.getByRole("button", { name: "Save this scenario" }).click();
await scrollTo('[data-testid="comparison"]', 120);
await say("Saved scenarios are recalculated with identical settings, so the comparison is fair. The best row is highlighted, but it is a ranking, not a decision about land or cost.");
await page.getByText(/Table instead of the map/).click();
await wait(0.6);
await say("The same results are also available as a table, for anyone who cannot use the map.");

// ---------------------------------------------------------------- 3b. canal corridor
await scrollTo('[data-testid="map"]', 62);
const parkTab = page.getByText("Park / green space", { exact: true });
await moveMouseTo(parkTab);
await parkTab.click();
await wait(0.8);
const corrBtn = page.getByRole("button", { name: "Turn the canal line into a linear park" });
await corrBtn.scrollIntoViewIfNeeded();
await moveMouseTo(corrBtn);
await say("Now the long-term question. If the canal is closed, what if this line became a linear park?", { pause: 0.2 });
await corrBtn.click();
await scrollTo('[data-testid="map"]', 62);
const nC = await liveNumbers();
await say(`Park access within three hundred metres goes from ${nC.before} to ${nC.after} sample points. This is a what-if: the closure and the land are not verified.`, { pause: 1.0 });
await page.getByText("Swimming facility", { exact: true }).click();
await wait(0.6);

// ---------------------------------------------------------------- 4. priorities
await scrollTo("#oncelikler", 70);
await page.getByLabel("Which neighbourhood are you thinking of?").selectOption("Gazipaşa");
const pool = page.getByLabel("Public, free or low-cost swimming");
await moveMouseTo(pool);
await pool.check();
await page.getByLabel("Cost", { exact: true }).check();
await say("Residents can record their own priorities. This is not a survey: answers stay in the browser, with no personal data.", {
  during: async () => {
    await wait(1.5);
    await page.getByLabel("Distance / hard to get there").check();
    await wait(0.8);
    await page.getByRole("button", { name: "Save my priorities" }).click();
  },
});

// ---------------------------------------------------------------- 5. PDF
await scrollTo("#rapor", 70);
const pdfBtn = page.getByRole("button", { name: "Create and download the PDF report" });
await moveMouseTo(pdfBtn);
await say("Finally, a planning brief is generated from exactly what is on screen.", { pause: 0.2 });
const [download] = await Promise.all([page.waitForEvent("download"), pdfBtn.click()]);
await download.saveAs(path.join(tmpDir, "report.pdf"));
await wait(1);
await page.goto(`http://localhost:${VIEW_PORT}/`);
await page.waitForFunction(() => document.title === "ready", null, { timeout: 30000 });
await say("It includes the settings, the sources and their status, before-and-after tables, a map drawn from the same coordinates, the comparison, the method, and the limitations.", {
  during: async () => {
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 300);
      await wait(0.75);
    }
  },
});

// ---------------------------------------------------------------- 6. Turkish + limits
await page.goto(`http://localhost:${PORT}/`);
await wait(1);
await say("And the whole interface, including the report, switches to Turkish for residents of Adana.", {
  during: async () => {
    await wait(1.2);
    await page.getByTestId("lang-toggle").click();
    await wait(2.2);
  },
});
await page.getByTestId("lang-toggle").click();
await scrollTo("#yontem", 70);
await say("KanalAtlas is honest about its limits: straight-line distance is not walking distance, sample points are not population, and it does not predict drowning risk.");
await say("Next steps: walking routes, a verified list of municipal pools, and real input from neighbours.");
await subtitle("");

// ---------------------------------------------------------------- 7. end card
await page.goto(`http://localhost:${VIEW_PORT}/card-end`);
await wait(0.8);
await say("KanalAtlas. Open source, and built for Neighborhood Hacks 2026.", { pause: 2.5 });
}

// ---------------------------------------------------------------- pass 1: silent rehearsal
await freshPage();
MODE = "rehearse";
await demo();
console.log(`rehearsal done: ${lines.length} narration lines`);

// ---------------------------------------------------------------- narration synthesis (Kokoro)
const jobs = lines.map((text, i) => ({ text, out: path.join(clipsDir, `${String(i).padStart(3, "0")}.wav`) }));
const jobsFile = path.join(tmpDir, "narration-jobs.json");
fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 1));
execFileSync(process.execPath, ["narrate.mjs", jobsFile], { cwd: TTS_DIR, env: { ...process.env, VOICE, SPEED }, stdio: ["ignore", "ignore", "inherit"] });
for (const j of jobs) {
  const samples = readWavAs48k(j.out);
  clips.push({ samples, seconds: samples.length / 48000 });
}
console.log(`narration: ${clips.reduce((a, c) => a + c.seconds, 0).toFixed(1)} s of speech (${VOICE})`);

// ---------------------------------------------------------------- pass 2: recording
await freshPage();
const cdp = await context.newCDPSession(page);
cdp.on("Page.screencastFrame", (f) => {
  const file = `${String(frames.length).padStart(6, "0")}.jpg`;
  fs.writeFileSync(path.join(framesDir, file), Buffer.from(f.data, "base64"));
  frames.push({ file, ts: f.metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
MODE = "record";
lineIdx = 0;
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const t0 = Date.now();
await demo();
const seconds = Math.round((Date.now() - t0) / 1000);
const stopWall = Date.now() / 1000;
await cdp.send("Page.stopScreencast");
await context.close();
await browser.close();
cleanup();

// ---------------------------------------------------------------- audio mix + encode
const t0f = frames[0].ts;
const endTime = stopWall - t0f;
const SR = 48000;
const mix = new Int16Array(Math.ceil(endTime * SR) + SR);
for (const { samples, t } of cues) {
  const start = Math.max(0, Math.round((t - t0f + 0.15) * SR));
  for (let i = 0; i < samples.length && start + i < mix.length; i++) mix[start + i] = samples[i];
}
const audioPath = path.join(tmpDir, "narration.raw");
fs.writeFileSync(audioPath, Buffer.from(mix.buffer));
const dest = path.join(outDir, "kanalatlas-demo.mp4");
console.log(`recorded ~${seconds}s, ${frames.length} frames, ${cues.length} narration lines; encoding…`);
const info = await encodeMp4({ framesDir, frames: frames.map((f) => ({ file: f.file, t: f.ts - t0f })), outPath: dest, endTime, audioPath });
console.log(`→ ${path.relative(root, dest)} ${info.width}×${info.height}, ${info.seconds.toFixed(1)} s, ${(info.bytes / 1e6).toFixed(1)} MB`);

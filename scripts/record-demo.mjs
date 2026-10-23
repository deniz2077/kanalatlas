/**
 * Records a narrated, captioned walkthrough of the REAL running app
 * (production build, English UI): Chrome streams screencast frames while
 * Playwright drives the app; each narration line is synthesised with the
 * macOS `say` command, shown as a subtitle, and placed in the audio track at
 * the moment it is spoken. scripts/encode-mp4.mjs then encodes H.264 + AAC.
 *
 *   npm run build && npm run demo:record            # voice: "Ava (Premium)" if installed
 *   DEMO_VOICE="Zoe (Premium)" npm run demo:record
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
const installed = execFileSync("say", ["-v", "?"])
  .toString()
  .split("\n")
  .map((l) => l.replace(/\s{2,}\S+\s+#.*$/, "").trim());
const wanted = [process.env.DEMO_VOICE, "Ava (Premium)", "Zoe (Premium)", "Evan (Enhanced)", "Ava (Enhanced)", "Samantha"].filter(Boolean);
const VOICE = wanted.find((v) => installed.includes(v));
if (!VOICE) throw new Error("No usable English voice found");
console.log(`voice: ${VOICE}`);
const RATE = process.env.DEMO_RATE ?? "172";

let clipN = 0;
/** Synthesise one line to a 48 kHz mono WAV; returns where its samples are. */
function synth(text) {
  const file = path.join(clipsDir, `${String(clipN++).padStart(3, "0")}.wav`);
  execFileSync("say", ["-v", VOICE, "-r", RATE, "--file-format=WAVE", "--data-format=LEI16@48000", "-o", file, text]);
  const buf = fs.readFileSync(file);
  const dataIdx = buf.indexOf("data");
  const bytes = buf.readUInt32LE(dataIdx + 4);
  return { file, seconds: bytes / 2 / 48000, dataOffset: dataIdx + 8, bytes };
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
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, acceptDownloads: true });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.addInitScript({ content: `window.addEventListener("DOMContentLoaded", () => { ${OVERLAY_JS} });` });

const framesDir = path.join(tmpDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });
const frames = [];
const cdp = await context.newCDPSession(page);
cdp.on("Page.screencastFrame", (f) => {
  const file = `${String(frames.length).padStart(6, "0")}.jpg`;
  fs.writeFileSync(path.join(framesDir, file), Buffer.from(f.data, "base64"));
  frames.push({ file, ts: f.metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});

const wait = (s) => page.waitForTimeout(s * 1000);
const cues = []; // { clip, t (epoch seconds) }

async function subtitle(text) {
  await page.evaluate(OVERLAY_JS);
  await page.evaluate((txt) => {
    const c = document.getElementById("__demo_caption");
    c.style.display = txt ? "block" : "none";
    c.textContent = txt;
  }, text);
}
/**
 * Speak a line: synthesise it, show it as a subtitle, mark its start time and
 * wait until it has been spoken (plus a short pause). `during` runs while the
 * line plays (e.g. a drag); the call waits for both.
 */
async function say(text, { pause = 0.5, during } = {}) {
  const clip = synth(text);
  await subtitle(text);
  cues.push({ clip, t: Date.now() / 1000 });
  const speaking = wait(clip.seconds + pause);
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

await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const t0 = Date.now();

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
await say("This is the real map. The blue line is the canal from OpenStreetMap, the dashed box is the study area, and each circle is a sample point on a five-hundred-metre grid. These are map points, not people.");
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
const best = page.getByRole("button", { name: "Add at the best location" });
await moveMouseTo(best);
await say("Now let's add a hypothetical pool. This button tests one thousand, four hundred and fifty-six candidate sites, and picks the one that brings the most points within range.", { pause: 0.2 });
await best.click();
await wait(0.6);
const nA = await liveNumbers();
await say(`The result: ${nA.before} becomes ${nA.after}. The amber lines show which points now have this pool as their nearest facility, and the dashed ring is the one-kilometre radius.`);
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
await say(`Here, it only reaches ${nB.after}, compared with ${nA.after} before. Same method, different place, different result.`);
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
await say(`Park access within three hundred metres goes from ${nC.before} to ${nC.after} sample points. This is a what-if: the closure and the land are not verified.`);
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
for (const { clip, t } of cues) {
  const start = Math.max(0, Math.round((t - t0f + 0.15) * SR));
  const buf = fs.readFileSync(clip.file);
  const n = clip.bytes / 2;
  for (let i = 0; i < n && start + i < mix.length; i++) mix[start + i] = buf.readInt16LE(clip.dataOffset + i * 2);
}
const audioPath = path.join(tmpDir, "narration.raw");
fs.writeFileSync(audioPath, Buffer.from(mix.buffer));
const dest = path.join(outDir, "kanalatlas-demo.mp4");
console.log(`recorded ~${seconds}s, ${frames.length} frames, ${cues.length} narration lines; encoding…`);
const info = await encodeMp4({ framesDir, frames: frames.map((f) => ({ file: f.file, t: f.ts - t0f })), outPath: dest, endTime, audioPath });
console.log(`→ ${path.relative(root, dest)} ${info.width}×${info.height}, ${info.seconds.toFixed(1)} s, ${(info.bytes / 1e6).toFixed(1)} MB`);

// English 3:2 gallery images and an English sample PDF for the Devpost page, captured from the live site.
// Usage: node scripts/gallery-shots.mjs [baseUrl]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] ?? "https://deniz2077.github.io/kanalatlas/";
const out = path.join(root, "submission/gallery");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const shot = async (page, name) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, name) });
  console.log("→", name);
};
const scrollTo = async (page, locator, offset = 80) => {
  const box = await locator.boundingBox();
  await page.evaluate(([y, o]) => window.scrollTo(0, window.scrollY + y - o), [box.y, offset]);
  await page.waitForTimeout(600);
};

// Desktop, 3:2
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.goto(base);
await shot(page, "01-question-and-steps.png");

const map = page.locator("#analiz");
await scrollTo(page, map, 70);
await shot(page, "02-baseline-map.png");

await page.getByRole("button", { name: "Find a promising location" }).click();
await scrollTo(page, map, 70);
await shot(page, "03-promising-location-before-after.png");

await page.getByRole("button", { name: "Save this scenario" }).click();
for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Move 100 metres west" }).click();
await page.getByRole("button", { name: "Save this scenario" }).click();
await scrollTo(page, page.getByTestId("comparison"), 120);
await shot(page, "04-compare-a-b.png");

const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Create and download the PDF report" }).click(),
]);
await download.saveAs(path.join(out, "kanalatlas-sample-report-en.pdf"));
console.log("→ kanalatlas-sample-report-en.pdf");

const p2 = await ctx.newPage();
await p2.goto(base);
await p2.getByText("Park / green space", { exact: true }).click();
await p2.getByRole("button", { name: "Turn the canal line into a linear park" }).click();
await scrollTo(p2, p2.locator("#analiz"), 70);
await shot(p2, "05-canal-as-linear-park.png");

// Two phone screens side by side on a 3:2 canvas
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const m = await phone.newPage();
await m.goto(base);
await m.waitForLoadState("networkidle");
const a = await m.screenshot();
await m.getByRole("button", { name: "Find a promising location" }).click();
await scrollTo(m, m.locator("#analiz"), 0);
await m.waitForTimeout(800);
const b = await m.screenshot();
const canvas = await ctx.newPage();
await canvas.setViewportSize({ width: 1500, height: 1000 });
const img = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
await canvas.setContent(`<body style="margin:0;height:1000px;display:flex;gap:80px;align-items:center;justify-content:center;background:#f4f1ea;font-family:system-ui">
  <img src="${img(a)}" style="height:880px;border-radius:28px;box-shadow:0 10px 40px #0003">
  <img src="${img(b)}" style="height:880px;border-radius:28px;box-shadow:0 10px 40px #0003"></body>`);
await shot(canvas, "06-mobile.png");

await browser.close();

/**
 * Full user journey in a real browser against the production build.
 * Screenshots are written to docs/screenshots/ and the downloaded PDF is
 * parsed to check it contains what the screen showed.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const shotDir = path.resolve(__dirname, "../docs/screenshots");
fs.mkdirSync(shotDir, { recursive: true });

async function pdfText(file: string): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    text += c.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  }
  return text.replace(/\s+/g, " ");
}

const headline = (page: Page) => page.getByTestId("within-headline");
const coords = (page: Page) => page.getByTestId("hyp-coords").first();

test("complete journey: map → scenario → move → compare → priorities → PDF", async ({ page }, testInfo) => {
  const p = testInfo.project.name;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // Basemap tile failures (offline CI) are not application errors.
    if (m.type() === "error" && !/tile\.openstreetmap|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text());
  });

  // 1. Homepage
  await page.goto("./?lang=tr");
  await expect(page).toHaveTitle(/KanalAtlas/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mahalleni keşfet");
  await page.screenshot({ path: `${shotDir}/${p}-01-landing.png` });

  // 2–3. Map, study area, canals, evaluation points
  await page.locator("#analiz").scrollIntoViewIfNeeded();
  const map = page.locator(".leaflet-container");
  await expect(map).toBeVisible();
  await expect(page.locator(".leaflet-overlay-pane path").first()).toBeVisible();
  // Basemap tiles actually load (requires network access to tile.openstreetmap.org).
  await expect
    .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>(".leaflet-tile")].filter((t) => t.complete && t.naturalWidth > 0).length))
    .toBeGreaterThan(4);
  const pathCount = await page.locator(".leaflet-overlay-pane path").count();
  expect(pathCount).toBeGreaterThan(72); // rectangle + 13 canals + 72 points + links
  const baseline = (await headline(page).innerText()).trim();
  expect(baseline).toMatch(/^13\s*\/\s*72$/); // value computed from the shipped dataset (see unit tests)

  // 4. Facility information (text alternative)
  await page.getByText(/Haritalanmış yüzme tesisleri listesi/).click();
  await expect(page.getByRole("cell", { name: "Pınar Yüzme Havuzu" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Adana Büyükşehir Belediyesi Kapalı Yüzme Havuzu/ })).toBeVisible();

  // Invalid placement: outside the study area is rejected with a clear message
  await page.getByRole("button", { name: "Haritada yer seç" }).click();
  const box = (await map.boundingBox())!;
  // Top edge of the map is north of the study box. Click empty map (not a marker).
  await map.click({ position: { x: box.width * 0.62, y: 40 } });
  await expect(page.getByRole("alert").filter({ hasText: "çalışma alanının dışında" })).toBeVisible();
  await page.getByRole("button", { name: "Seçimi iptal et" }).click();

  // 5. Add a hypothetical facility (keyboard-accessible path)
  await page.getByRole("button", { name: "En çok fayda sağlayan konuma ekle" }).click();
  await expect(page.getByTestId("hypothetical")).toHaveCount(1);
  await expect(headline(page)).toContainText("→");
  const afterA = (await headline(page).innerText()).replace(/\s+/g, " ");
  const coordsA = await coords(page).innerText();
  const interpA = await page.getByTestId("interpretation").innerText();
  expect(interpA).toMatch(/Varsayımsal senaryoda/);
  await page.locator("#analiz").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shotDir}/${p}-02-scenario-A.png`, fullPage: false });
  await page.getByRole("button", { name: "Bu senaryoyu kaydet" }).click();

  // 6. Move it: drag the marker on the map, then nudge with the buttons
  const marker = page.locator(".ka-marker--hypo").first();
  await marker.scrollIntoViewIfNeeded();
  const mb = (await marker.boundingBox())!;
  const sx = mb.x + mb.width / 2;
  const sy = mb.y + mb.height / 2;
  if (testInfo.project.use.hasTouch) {
    // Touch path: "pick new location" then tap the map. (Leaflet touch-drag could not be
    // driven reliably in emulation; see docs/PROOF_OF_FUNCTIONALITY.md.)
    await page.getByRole("button", { name: "Haritada yeni konum seç" }).click();
    await marker.scrollIntoViewIfNeeded();
    const m2 = (await marker.boundingBox())!;
    const mapBox = (await map.boundingBox())!;
    await map.click({ position: { x: m2.x - mapBox.x - 110, y: m2.y - mapBox.y + 30 } });
  } else {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx - 60, sy + 10, { steps: 8 });
    await page.mouse.move(sx - 140, sy + 20, { steps: 8 });
    await page.mouse.up();
  }
  await expect(coords(page)).not.toHaveText(coordsA);
  for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Batıya 100 metre taşı" }).click();
  const coordsB = await coords(page).innerText();
  expect(coordsB).not.toBe(coordsA);
  await expect(page.getByTestId("interpretation")).not.toHaveText(interpA);
  const afterB = (await headline(page).innerText()).replace(/\s+/g, " ");
  testInfo.annotations.push({ type: "scenario", description: `baseline=${baseline} | A ${coordsA} → ${afterA} | B ${coordsB} → ${afterB}` });
  await page.getByRole("button", { name: "Bu senaryoyu kaydet" }).click();
  const comparison = page.getByTestId("comparison");
  await expect(comparison.getByRole("rowheader", { name: /Senaryo A/ })).toBeVisible();
  await expect(comparison.getByRole("rowheader", { name: /Senaryo B/ })).toBeVisible();
  await comparison.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shotDir}/${p}-03-scenario-B-and-comparison.png` });

  // 7. Priorities (local-only)
  await page.locator("#oncelikler").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Önceliklerimi kaydet" }).click();
  await expect(page.getByText("Lütfen bir öncelik seçin.")).toBeVisible();
  await page.getByLabel("Hangi mahalleyi düşünüyorsunuz?").selectOption("Gazipaşa");
  await page.getByLabel("Halka açık, ücretsiz veya düşük ücretli yüzme imkânı").check();
  await page.getByLabel("Ücret", { exact: true }).check();
  await page.getByRole("button", { name: "Önceliklerimi kaydet" }).click();
  await expect(page.getByTestId("priorities-status")).toContainText("Kaydedildi");
  await page.screenshot({ path: `${shotDir}/${p}-04-priorities.png` });

  // 8. PDF download and content check
  await page.locator("#rapor").scrollIntoViewIfNeeded();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PDF raporu oluştur ve indir" }).click(),
  ]);
  const pdfPath = testInfo.outputPath("report.pdf");
  await download.saveAs(pdfPath);
  await expect(page.getByTestId("report-done")).toBeVisible();
  const text = await pdfText(pdfPath);
  expect(text).toContain("Mahalle Erişilebilirlik ve Senaryo Değerlendirme Raporu");
  expect(text).toContain(coordsB.split(" · ")[0].trim()); // current hypothetical position as shown on screen
  const [bWithin] = afterB.match(/→ (\d+)/)!.slice(1);
  expect(text).toContain(`${bWithin} / 72`);
  expect(text).toContain("Kaydedilen senaryoların karşılaştırması");
  expect(text).toContain("Gazipaşa");
  expect(text).toContain("kişisel tercihleri");
  if (p === "desktop") fs.copyFileSync(pdfPath, path.resolve(__dirname, "../docs/sample-report.pdf"));
  await page.screenshot({ path: `${shotDir}/${p}-05-report.png` });

  // 9. No application errors
  expect(errors, errors.join("\n")).toEqual([]);

  // 10. No horizontal page scroll (mobile usability)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("category switch and data scope change the numbers (not hard-coded)", async ({ page }) => {
  await page.goto("./?lang=tr");
  const core = (await headline(page).innerText()).trim();
  await page.getByText("Gelişmiş ayarlar").click();
  await page.getByLabel("Veri kapsamı").selectOption("all");
  await expect(headline(page)).not.toHaveText(core);
  await page.getByText("Park / yeşil alan", { exact: true }).click();
  await expect(page.getByText(/Haritalanmış parklar listesi/)).toBeVisible();
  const park = (await headline(page).innerText()).trim();
  await page.getByLabel("Mesafe eşiği (kuş uçuşu)").selectOption("800");
  await expect(headline(page)).not.toHaveText(park);
});

test("canal corridor → linear park scenario (parks)", async ({ page }) => {
  await page.goto("./?lang=tr");
  await page.getByText("Park / yeşil alan", { exact: true }).click();
  const before = (await headline(page).innerText()).trim();
  await page.getByRole("button", { name: "Kanal hattını doğrusal parka dönüştür" }).click();
  await expect(page.getByTestId("hypothetical")).toHaveCount(1);
  await expect(page.getByTestId("hyp-coords").first()).toContainText("kanal hattı boyunca");
  await expect(headline(page)).toContainText("→");
  expect((await headline(page).innerText()).trim()).not.toBe(before);
  await expect(page.getByRole("button", { name: "Kanal hattını doğrusal parka dönüştür" })).toBeDisabled();
  await expect(page.getByTestId("hyp-explanation")).toContainText("kanal hattı üzerindeki en yakın noktaya");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PDF raporu oluştur ve indir" }).click(),
  ]);
  const file = test.info().outputPath("corridor.pdf");
  await download.saveAs(file);
  expect(await pdfText(file)).toContain("Kanal hattı doğrusal parkı");
  await page.locator('[data-testid="map"]').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0); // close hover tooltips
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shotDir}/${test.info().project.name}-06-canal-corridor-park.png` });
});

test("touch drag moves the hypothetical facility (native TouchEvents)", async ({ page }, testInfo) => {
  // Leaflet uses native touch events on touch devices (iOS Safari, Android Chrome).
  // Playwright cannot perform a touch drag, so real TouchEvents are dispatched on the
  // marker element; WebKit on macOS cannot construct Touch objects, so Chromium only.
  test.skip(testInfo.project.name !== "mobile", "needs a touch-enabled Chromium profile");
  await page.goto("./?lang=tr");
  const add = page.getByRole("button", { name: "En çok fayda sağlayan konuma ekle" });
  await add.focus();
  await page.keyboard.press("Enter");
  const marker = page.locator(".ka-marker--hypo").first();
  await marker.scrollIntoViewIfNeeded();
  const before = await headline(page).innerText();
  const c0 = await coords(page).innerText();
  await page.evaluate(async () => {
    const icon = document.querySelector(".ka-marker--hypo")!.closest(".leaflet-marker-icon") as HTMLElement;
    const r = icon.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const touch = (cx: number, cy: number) =>
      new Touch({ identifier: 1, target: icon, clientX: cx, clientY: cy, pageX: cx + scrollX, pageY: cy + scrollY, radiusX: 2, radiusY: 2, force: 0.5 });
    const fire = (type: string, t: Touch, active: boolean) =>
      icon.dispatchEvent(
        new TouchEvent(type, { bubbles: true, cancelable: true, touches: active ? [t] : [], targetTouches: active ? [t] : [], changedTouches: [t] }),
      );
    fire("touchstart", touch(x, y), true);
    for (let i = 1; i <= 15; i++) {
      fire("touchmove", touch(x - i * 8, y + i * 2), true);
      await new Promise((res) => setTimeout(res, 16));
    }
    fire("touchend", touch(x - 120, y + 30), false);
  });
  await expect(coords(page)).not.toHaveText(c0);
  await expect(headline(page)).not.toHaveText(before);
});

test("English (default): journey, language toggle and English PDF", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Explore your neighbourhood.");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(headline(page)).toHaveText(/13\s*\/\s*72/);
  await page.getByRole("button", { name: "Add at the best location" }).click();
  await expect(page.getByTestId("hyp-explanation")).toContainText("It becomes the nearest facility for");
  await expect(page.getByTestId("interpretation")).toContainText("In the hypothetical scenario this becomes");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Create and download the PDF report" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^kanalatlas-report-swimming-/);
  const file = test.info().outputPath("report-en.pdf");
  await download.saveAs(file);
  const text = await pdfText(file);
  expect(text).toContain("Neighbourhood Accessibility and Scenario Assessment Report");
  expect(text).toContain("HYPOTHETICAL");
  expect(text).toContain("straight line");
  expect(text).not.toContain("Varsayımsal");
  // Toggle to Turkish and back; the scenario state is kept.
  await page.getByTestId("lang-toggle").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mahalleni keşfet.");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByTestId("hypothetical")).toHaveCount(1);
  await page.getByTestId("lang-toggle").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Explore your neighbourhood.");
  if (test.info().project.name === "desktop") {
    await page.locator('[data-testid="map"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shotDir}/desktop-07-english.png` });
  }
});

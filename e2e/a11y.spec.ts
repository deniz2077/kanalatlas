/**
 * Automated accessibility audit (axe-core, WCAG 2.0/2.1 A + AA rules) of the
 * page in its initial state and with an active scenario.
 */
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const outDir = path.resolve(__dirname, "../docs/test-output");

test("no WCAG A/AA violations (initial and with scenario)", async ({ page }, testInfo) => {
  await page.goto("./");
  await page.locator(".leaflet-container").waitFor();
  const scan = () =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Leaflet's third-party tile images and attribution are outside our control.
      .exclude(".leaflet-tile-pane")
      .analyze();
  const initial = await scan();
  await page.getByRole("button", { name: "Add at the best location" }).click();
  await page.getByRole("button", { name: "Save this scenario" }).click();
  await page.getByText(/Table instead of the map/).click();
  const withScenario = await scan();
  const summarize = (r: typeof initial) =>
    r.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  const report = [
    `axe-core ${initial.testEngine.version} · project ${testInfo.project.name} · ${new Date().toISOString()}`,
    `initial: ${initial.violations.length} violations, ${initial.passes.length} rules passed`,
    ...summarize(initial),
    `with scenario: ${withScenario.violations.length} violations, ${withScenario.passes.length} rules passed`,
    ...summarize(withScenario),
  ].join("\n");
  fs.writeFileSync(path.join(outDir, `a11y-${testInfo.project.name}.txt`), report + "\n");
  console.log(report);
  expect(initial.violations, report).toEqual([]);
  expect(withScenario.violations, report).toEqual([]);
});

test("keyboard only: add, move, save and export without a mouse", async ({ page }, testInfo) => {
  test.skip(!!testInfo.project.use.hasTouch, "keyboard journey is a desktop concern");
  await page.goto("./");
  // Skip link is the first tab stop.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to the map" })).toBeFocused();
  const press = async (name: string | RegExp) => {
    const b = page.getByRole("button", { name }).first();
    await b.focus();
    await expect(b).toBeFocused();
    await page.keyboard.press("Enter");
  };
  const headline = page.getByTestId("within-headline");
  await press("Add at the best location");
  await expect(headline).toContainText("→");
  const coords = page.getByTestId("hyp-coords").first();
  const c0 = await coords.innerText();
  await press("Move 100 metres west");
  await press("Move 100 metres west");
  await expect(coords).not.toHaveText(c0);
  await press("Save this scenario");
  await expect(page.getByTestId("comparison")).toBeVisible();
  // Category radio with keyboard: focus and press ArrowRight to switch to parks.
  await page.getByRole("radio", { name: "Swimming facility" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Park / green space" })).toBeChecked();
  await page.getByRole("radio", { name: "Park / green space" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "Swimming facility" })).toBeChecked();
  const [download] = await Promise.all([page.waitForEvent("download"), press("Create and download the PDF report")]);
  expect(download.suggestedFilename()).toMatch(/^kanalatlas-report-swimming-.*\.pdf$/);
});

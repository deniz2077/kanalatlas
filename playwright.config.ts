import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the production build (`next build` must run first).
// With E2E_STATIC=1 they run against the static export (out/) served under /kanalatlas,
// exactly as GitHub Pages would serve it (`npm run build:static` must run first).
const isStatic = process.env.E2E_STATIC === "1";
const baseURL = isStatic ? "http://localhost:3400/kanalatlas/" : "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: {
    baseURL,
    acceptDownloads: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: isStatic ? "node scripts/serve-static.mjs 3400 /kanalatlas" : "node node_modules/next/dist/bin/next start -p 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Safari's engine (WebKit) on an iPhone profile.
    { name: "mobile-safari", use: { ...devices["iPhone 15 Pro"] } },
  ],
});

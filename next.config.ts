import type { NextConfig } from "next";

// STATIC_EXPORT=1 produces a fully static site in out/ (e.g. for GitHub Pages).
// PAGES_BASE_PATH is the sub-path it is served from, e.g. "/kanalatlas".
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = isStatic
  ? { output: "export", basePath, images: { unoptimized: true }, trailingSlash: true }
  : {};

export default nextConfig;

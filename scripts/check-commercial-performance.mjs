import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const assetRoot = path.join(process.cwd(), "dist", "client", "assets");
const entries = await readdir(assetRoot, { withFileTypes: true });
const assets = [];

for (const entry of entries) {
  if (!entry.isFile() || !/\.(css|js)$/.test(entry.name)) continue;
  const bytes = await readFile(path.join(assetRoot, entry.name));
  assets.push({ name: entry.name, gzipBytes: gzipSync(bytes).byteLength });
}

const css = assets.filter((asset) => asset.name.endsWith(".css"));
const pageJs = assets.filter((asset) => /^page-.*\.js$/.test(asset.name));
if (!css.length || !pageJs.length) throw new Error("Commercial performance assets are missing from the production build.");

const largestCss = Math.max(...css.map((asset) => asset.gzipBytes));
const largestPageJs = Math.max(...pageJs.map((asset) => asset.gzipBytes));
const totalJsCss = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const budgets = {
  // Content System & Planning adds the complete eight-slice, responsive operating
  // surface without lifting the stricter per-page JavaScript ceiling.
  largestCss: 62_000,
  largestPageJs: 50_000,
  // The catalog-wide total covers every route-split asset, not a single user journey.
  // Reserve 5 KB for Intelligence–Niche and a further 5 KB for the production
  // Content Autopilot workspace. This remains a catalog-wide cap across all routes.
  totalJsCss: 310_000,
};

const failures = [
  ["largest CSS", largestCss, budgets.largestCss],
  ["largest page JS", largestPageJs, budgets.largestPageJs],
  ["total JS + CSS", totalJsCss, budgets.totalJsCss],
].filter(([, actual, budget]) => actual > budget);

console.log(`Commercial client budgets (gzip bytes): CSS ${largestCss}/${budgets.largestCss}; page JS ${largestPageJs}/${budgets.largestPageJs}; total ${totalJsCss}/${budgets.totalJsCss}.`);
if (failures.length) {
  for (const [label, actual, budget] of failures) console.error(`- ${label}: ${actual} exceeds ${budget}`);
  process.exit(1);
}

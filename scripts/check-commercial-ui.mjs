import { readFile } from "node:fs/promises";

const files = Object.fromEntries(await Promise.all([
  ["shell", "app/factory-shell.tsx"],
  ["portfolio", "app/page.tsx"],
  ["market", "app/market-intelligence/page.tsx"],
  ["niche", "app/niche-discovery/page.tsx"],
  ["studio", "app/channel-studio/page.tsx"],
  ["css", "app/portfolio.css"],
].map(async ([key, file]) => [key, await readFile(file, "utf8")])));

const checks = [
  ["skip link", files.shell.includes("Skip to main content")],
  ["single named main target", files.shell.includes('id="main-content"')],
  ["current-page navigation", files.shell.includes("aria-current=")],
  ["assistive loading status", files.shell.includes('role="status"') && files.shell.includes('aria-busy="true"')],
  ["fail-closed recovery copy", files.shell.includes("No demo or local fallback was substituted")],
  ["named numeric progress", files.portfolio.includes('role="progressbar"') && files.portfolio.includes("aria-valuenow")],
  ["non-blank async fallbacks", [files.market, files.niche, files.studio].every((source) => !source.includes("fallback={null}") && source.includes("ProjectionState loading"))],
  ["visible keyboard focus", files.css.includes(":focus-visible") && files.css.includes("outline:3px")],
  ["minimum interaction target", files.css.includes("min-height:44px")],
  ["reduced-motion support", files.css.includes("prefers-reduced-motion:reduce")],
  ["forced-colors support", files.css.includes("forced-colors:active")],
  ["tablet breakpoint", files.css.includes("@media(max-width:820px)")],
  ["mobile breakpoint", files.css.includes("@media(max-width:520px)")],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  console.error("Commercial UI contract violations:");
  for (const [label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log(`Commercial UI static contract passed ${checks.length}/${checks.length} checks.`);

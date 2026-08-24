import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const requireText = (file, value, reason) => { if (!read(file).includes(value)) failures.push(`${file}: ${reason}`); };
const forbidText = (file, value, reason) => { if (read(file).includes(value)) failures.push(`${file}: ${reason}`); };

requireText("app/factory-surface-registry.ts", 'href: "/video-engine"', "canonical production navigation must target Video Engine");
requireText("lib/portfolio-projection.ts", 'href: "/video-engine"', "Portfolio production capability must target the canonical operator");
requireText("app/channels/[id]/page.tsx", 'href="/video-engine"', "Channel detail must target the canonical operator");
requireText("app/video-engine/production-engine-workspace.tsx", 'href="/video-engine/audience-golden"', "Golden materials must be discoverable from Video Engine");
requireText("lib/sequential-production-projection.ts", "audienceGoldenSnapshot", "Video Engine must read the Audience Golden authority");
requireText("lib/sequential-production-projection.ts", "reconcileCanonicalGolden", "legacy and current master evidence must be reconciled explicitly");
requireText("app/video-engine/audience-golden/audience-golden-client.tsx", 'href="/video-engine"', "Golden materials must return to the canonical operator");

for (const file of ["lib/portfolio-projection.ts", "app/channels/[id]/page.tsx", "app/continuity/page.tsx", "app/settings/storage/page.tsx", "app/factory-shell.tsx"]) {
  forbidText(file, 'href="/control-plane"', "a canonical surface cannot route operators into compatibility state");
  forbidText(file, 'href: "/control-plane"', "a canonical surface cannot route operators into compatibility state");
}

for (const route of ["control-plane", "intelligence", "creative-contract", "story-architecture", "script-development", "production-design", "shot-orchestration", "material-production"]) {
  requireText(`app/${route}/layout.tsx`, "ProjectionBoundaryNotice", "compatibility routes must disclose their non-authoritative status");
}

if (failures.length) {
  console.error("Projection Integrity Gate failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Projection Integrity Gate passed: canonical navigation, current Golden authority and compatibility boundaries are explicit.");

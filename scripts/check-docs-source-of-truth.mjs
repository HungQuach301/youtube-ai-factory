import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "AGENTS.md",
  "README.md",
  "docs/README.md",
  "docs/governance/REPOSITORY_SOURCE_OF_TRUTH.md",
  "docs/governance/MASTER_ISSUE_REGISTRY.md",
  "docs/architecture/TARGET_OPERATING_ARCHITECTURE.md",
  "docs/architecture/BUSINESS_OPERATING_MODEL.md",
  "docs/architecture/TECHNICAL_RUNTIME_ARCHITECTURE.md",
  "docs/architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md",
  "docs/architecture/E2E_PRODUCTION_GATE_MODEL.md",
  "docs/architecture/VISUAL_MOTION_TECHNIQUE_PLAYBOOK.md",
  "docs/architecture/MULTI_CHANNEL_SCALE_AND_LEARNING.md",
  "docs/architecture/AI_FIRST_PRODUCTION_ASSURANCE.md",
  "docs/architecture/DATA_AND_PROVIDER_CONTROL_PLANE.md",
  "docs/governance/CROSS_CUTTING_CONTROL_STANDARD.md",
  "docs/governance/REPOSITORY_SYNC_AND_RECOVERY.md",
  "docs/governance/DOCUMENT_COMPLETION_MATRIX.md",
  "docs/archive/README.md",
  "docs/roadmap/MASTER_ROADMAP.md",
  "docs/continuity/03_CURRENT_STATE.md",
  "docs/continuity/04_DECISION_LOG.md",
  "docs/continuity/08_CONTINUATION_PACK.md",
  "docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md",
  "docs/continuity/80_HIDDEN_SYSTEMS_VISUAL_DNA_AND_R22_BLUEPRINT.md",
  "docs/continuity/81_VIDEO_PRODUCTION_QUALITY_STANDARD_V3.md",
];

const failures = [];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`MISSING_REQUIRED_FILE:${path}`);

const text = (path) => readFileSync(join(root, path), "utf8");
if (!text("AGENTS.md").includes("sole source of project truth")) failures.push("AGENTS_SSOT_RULE_MISSING");
if (!text("README.md").includes("docs/README.md")) failures.push("ROOT_README_KNOWLEDGE_ENTRY_MISSING");
if (!text("docs/README.md").includes("GIT_REPOSITORY_SSOT_V1")) failures.push("DOC_INDEX_POLICY_MISSING");
if (!text("docs/README.md").includes("DUAL_REMOTE_SINGLE_COMMIT_SSOT_V1")) failures.push("DUAL_REMOTE_POLICY_MISSING");
if (!text("docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md").includes("origin/main")) failures.push("ROLLOVER_GIT_REMOTE_MISSING");
if (!text("docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md").includes("github/main")) failures.push("ROLLOVER_GITHUB_MIRROR_MISSING");
if (!text("docs/governance/REPOSITORY_SYNC_AND_RECOVERY.md").includes("youtube-ai-factory-v2")) failures.push("EXCLUDED_REPOSITORY_RULE_MISSING");
if (!text("docs/governance/REPOSITORY_SYNC_AND_RECOVERY.md").includes("ACTIVE_NORMATIVE__SYNCHRONIZED")) failures.push("REPOSITORY_SYNC_RECEIPT_MISSING");
if (text("docs/continuity/03_CURRENT_STATE.md").includes("CONNECTOR_ACCESS_REQUIRED")) failures.push("STALE_GITHUB_ACCESS_BLOCKER_IN_CURRENT_STATE");
if (!text("docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md").includes("SYNCHRONIZED")) failures.push("ROLLOVER_SYNC_STATE_MISSING");
if (!text("docs/archive/README.md").includes("HISTORICAL_READ_ONLY")) failures.push("ARCHIVE_AUTHORITY_BOUNDARY_MISSING");
if (!text("docs/README.md").includes("Do not read `docs/archive` as current authority")) failures.push("ACTIVE_ARCHIVE_READING_BOUNDARY_MISSING");

function files(path) {
  const output = [];
  for (const name of readdirSync(path)) {
    const candidate = join(path, name);
    if (statSync(candidate).isDirectory()) output.push(...files(candidate));
    else if (extname(candidate) === ".md") output.push(candidate);
  }
  return output;
}

const allDocumentation = files(join(root, "docs"));
const archivePrefix = join(root, "docs", "archive") + "/";
const activeMarkdownFiles = [
  join(root, "README.md"),
  join(root, "AGENTS.md"),
  ...allDocumentation.filter((path) => !path.startsWith(archivePrefix)),
];
const archiveMarkdownFiles = allDocumentation.filter((path) => path.startsWith(archivePrefix));
const staleActiveSyncMarkers = [
  "connector repository access required",
  "connector access plus exact-sha verification",
  "owner_reported_created__connector_access_required",
];
for (const source of activeMarkdownFiles) {
  const normalized = readFileSync(source, "utf8").toLowerCase();
  for (const marker of staleActiveSyncMarkers) {
    if (normalized.includes(marker)) {
      failures.push(`STALE_GITHUB_SYNC_BLOCKER:${relative(root, source)} -> ${marker}`);
    }
  }
}
const localLink = /\[[^\]]*\]\(([^)]+)\)/g;
for (const source of activeMarkdownFiles) {
  const content = readFileSync(source, "utf8");
  for (const match of content.matchAll(localLink)) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (!raw || raw.startsWith("#") || /^(https?:|mailto:|data:|sandbox:)/.test(raw)) continue;
    const path = raw.split("#", 1)[0].split("?", 1)[0];
    if (!path) continue;
    const target = resolve(dirname(source), decodeURIComponent(path));
    if (!existsSync(target)) failures.push(`BROKEN_LINK:${relative(root, source)} -> ${raw}`);
  }
}

const roadmapCopies = activeMarkdownFiles.filter((path) => path.endsWith("MASTER_ROADMAP.md"));
if (roadmapCopies.length !== 1) failures.push(`MASTER_ROADMAP_COUNT:${roadmapCopies.length}`);
const issueCopies = activeMarkdownFiles.filter((path) => path.endsWith("MASTER_ISSUE_REGISTRY.md"));
if (issueCopies.length !== 1) failures.push(`MASTER_ISSUE_REGISTRY_COUNT:${issueCopies.length}`);

if (failures.length) {
  console.error(`Documentation SSOT FAIL · ${failures.length} issue(s)`);
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`Documentation SSOT PASS · ${activeMarkdownFiles.length} active Markdown files · ${archiveMarkdownFiles.length} historical archive files · ${required.length} canonical files present · active local links resolve`);

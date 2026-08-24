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
  "docs/architecture/VISUAL_PRODUCTION_OPERATING_MODEL.md",
  "docs/architecture/AI_FIRST_PRODUCTION_ASSURANCE.md",
  "docs/architecture/DATA_AND_PROVIDER_CONTROL_PLANE.md",
  "docs/governance/REPOSITORY_SYNC_AND_RECOVERY.md",
  "docs/governance/DOCUMENT_COMPLETION_MATRIX.md",
  "docs/roadmap/MASTER_ROADMAP.md",
  "docs/expert-assessments/2026-08-20_EXPERT_ASSESSMENT_RECONCILIATION.md",
  "docs/expert-assessments/2026-08-20_VIDEO_ENGINE_DETAILED_IMPROVEMENT_SPEC.md",
  "docs/migration/2026-08-20_EXTERNAL_SOURCE_MIGRATION.md",
  "docs/continuity/03_CURRENT_STATE.md",
  "docs/continuity/04_DECISION_LOG.md",
  "docs/continuity/08_CONTINUATION_PACK.md",
  "docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md",
  "docs/continuity/40_REPOSITORY_KNOWLEDGE_BASE_CHECKPOINT.md",
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

function files(path) {
  const output = [];
  for (const name of readdirSync(path)) {
    const candidate = join(path, name);
    if (statSync(candidate).isDirectory()) output.push(...files(candidate));
    else if (extname(candidate) === ".md") output.push(candidate);
  }
  return output;
}

const markdownFiles = [join(root, "README.md"), join(root, "AGENTS.md"), ...files(join(root, "docs"))];
const localLink = /\[[^\]]*\]\(([^)]+)\)/g;
for (const source of markdownFiles) {
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

const roadmapCopies = markdownFiles.filter((path) => path.endsWith("MASTER_ROADMAP.md"));
if (roadmapCopies.length !== 1) failures.push(`MASTER_ROADMAP_COUNT:${roadmapCopies.length}`);
const issueCopies = markdownFiles.filter((path) => path.endsWith("MASTER_ISSUE_REGISTRY.md"));
if (issueCopies.length !== 1) failures.push(`MASTER_ISSUE_REGISTRY_COUNT:${issueCopies.length}`);

if (failures.length) {
  console.error(`Documentation SSOT FAIL · ${failures.length} issue(s)`);
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`Documentation SSOT PASS · ${markdownFiles.length} Markdown files · ${required.length} canonical files present · local links resolve`);

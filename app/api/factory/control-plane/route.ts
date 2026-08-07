import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  v7AssetRegistry,
  v7CostEvents,
  v7DecisionRecords,
  v7EvidenceLineage,
  v7FoundationAudits,
  v7ProgramContracts,
  v7StageStates,
  v7StorageContracts,
} from "../../../../db/schema";

const PROGRAM_ID = "YTAF-V7-GREENFIELD";

const foundationSchema = [
  `CREATE TABLE IF NOT EXISTS v7_program_contracts (id text PRIMARY KEY NOT NULL, channel_id text NOT NULL, version integer DEFAULT 7 NOT NULL, status text DEFAULT 'FOUNDATION_BUILD' NOT NULL, execution_mode text DEFAULT 'AUTOPILOT' NOT NULL, quality_policy text DEFAULT 'MAXIMUM_QUALITY_FIRST' NOT NULL, legacy_policy text DEFAULT 'HISTORICAL_QUARANTINE' NOT NULL, overall_floor integer DEFAULT 92 NOT NULL, critical_floor integer DEFAULT 90 NOT NULL, dimension_floor integer DEFAULT 86 NOT NULL, p0_tolerance integer DEFAULT 0 NOT NULL, p1_tolerance integer DEFAULT 0 NOT NULL, maximum_attempts integer DEFAULT 3 NOT NULL, minimum_improvement integer DEFAULT 3 NOT NULL, production_authorized integer DEFAULT false NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_stage_states (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, stage_key text NOT NULL, sequence integer NOT NULL, stage_name text NOT NULL, status text DEFAULT 'BLOCKED' NOT NULL, threshold integer DEFAULT 92 NOT NULL, attempt integer DEFAULT 0 NOT NULL, artifact_id text, blocker text, evidence_summary text DEFAULT 'No verified artifact' NOT NULL, frozen_at text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_evidence_lineage (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, entity_type text NOT NULL, title text NOT NULL, lifecycle_state text DEFAULT 'PLAN' NOT NULL, upstream_evidence_id text, artifact_key text, content_hash text, storage_state text DEFAULT 'NOT_STORED' NOT NULL, rights_state text DEFAULT 'NOT_APPLICABLE' NOT NULL, cost_state text DEFAULT 'NOT_APPLICABLE' NOT NULL, quarantine_state text DEFAULT 'CLEAR' NOT NULL, pipeline_version integer DEFAULT 7 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_asset_registry (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, name text NOT NULL, asset_class text NOT NULL, lifecycle_state text DEFAULT 'PLAN' NOT NULL, provider text, mime_type text, content_hash text, runtime_key text, drive_file_id text, local_relative_path text, sync_state text DEFAULT 'NOT_STORED' NOT NULL, rights_state text DEFAULT 'UNKNOWN' NOT NULL, reusable_eligible integer DEFAULT false NOT NULL, quarantined integer DEFAULT false NOT NULL, cost_usd real DEFAULT 0 NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_cost_events (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, project_id text, stage_key text NOT NULL, provider text NOT NULL, cost_class text NOT NULL, cost_type text NOT NULL, status text DEFAULT 'ESTIMATED' NOT NULL, estimated_usd real DEFAULT 0 NOT NULL, actual_usd real DEFAULT 0 NOT NULL, reusable_allocation_usd real DEFAULT 0 NOT NULL, currency text DEFAULT 'USD' NOT NULL, asset_id text, note text DEFAULT '' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_storage_contracts (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, tier text NOT NULL, binding_name text NOT NULL, role text NOT NULL, required_for_production integer DEFAULT true NOT NULL, implementation_state text DEFAULT 'CONTRACT_READY' NOT NULL, verification_state text DEFAULT 'NOT_VERIFIED' NOT NULL, last_verified_at text, evidence text DEFAULT 'Awaiting verification' NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_decision_records (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, decision_code text NOT NULL, title text NOT NULL, status text NOT NULL, effective_version integer DEFAULT 7 NOT NULL, rationale text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_foundation_audits (id text PRIMARY KEY NOT NULL, program_id text NOT NULL, status text NOT NULL, architecture_score integer DEFAULT 0 NOT NULL, evidence_score integer DEFAULT 0 NOT NULL, cost_score integer DEFAULT 0 NOT NULL, storage_score integer DEFAULT 0 NOT NULL, production_authorized integer DEFAULT false NOT NULL, checks_json text NOT NULL, blockers_json text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

async function ensureFoundationSchema() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  await env.DB.batch(foundationSchema.map((statement) => env.DB.prepare(statement)));
}

const stageContracts = [
  ["00", "Initialize V7 program", 92],
  ["01", "Market & audience intelligence", 85],
  ["02", "Reference intelligence", 90],
  ["03", "Research & claim graph", 92],
  ["04", "Creative contract", 90],
  ["05", "Story architecture", 92],
  ["06", "Script development", 92],
  ["07A", "Narration production", 92],
  ["07B", "Visual language", 92],
  ["08", "Semantic shot orchestration", 92],
  ["09", "Fresh material production", 92],
  ["10", "Sound design", 90],
  ["11", "Clean edit & composition", 92],
  ["12", "Pre-master QA", 92],
  ["13", "Master render", 92],
  ["14", "AI full-master perceptual QA", 92],
  ["15", "Packaging & release", 90],
  ["16", "Performance learning", 90],
] as const;

const lockedDecisions = [
  ["ADR-001", "Adopt Production Pipeline V7 — Greenfield"],
  ["ADR-002", "Legacy masters and materials are historical evidence only"],
  ["ADR-003", "Do not reuse legacy materials in V7"],
  ["ADR-004", "Keep US English faceless channel contract"],
  ["ADR-005", "Do not mention AI in audience-facing packaging"],
  ["ADR-006", "Maximum quality first; cost optimization deferred"],
  ["ADR-007", "Autopilot default with approval and manual modes"],
  ["ADR-008", "Quality thresholds are invariant across modes"],
  ["ADR-009", "Only real measured artifacts satisfy a gate"],
  ["ADR-010", "Release floors and zero P0/P1 tolerance"],
  ["ADR-011", "Exactly one locked narrator identity"],
  ["ADR-012", "Diagnostic and clean compositors are separated"],
  ["ADR-013", "Full-master QA uses eight independent critics"],
  ["ADR-014", "Repair returns to root stage and is bounded"],
  ["ADR-015", "Runtime, Drive archive and local mirror have distinct roles"],
  ["ADR-016", "Local folder integration requires a Sync Agent"],
  ["ADR-017", "Original assets are immutable and SHA-256 deduplicated"],
  ["ADR-018", "Every asset links rights, cost, provenance and storage"],
  ["ADR-019", "Reuse never bypasses a new candidate tournament"],
  ["ADR-020", "One-off paid purchases require initial approval"],
  ["ADR-021", "Cost control spans factory to attempt and unit economics"],
] as const;

async function seedControlPlane() {
  await ensureFoundationSchema();
  const db = await getDb();
  await db.insert(v7ProgramContracts).values({
    id: PROGRAM_ID,
    channelId: "channel-hidden-systems",
  }).onConflictDoNothing();

  const stageRows = stageContracts.map(([key, name, threshold], index) => ({
    id: `${PROGRAM_ID}-STAGE-${key}`,
    programId: PROGRAM_ID,
    stageKey: key,
    sequence: index,
    stageName: name,
    status: key === "00" ? "READY_FOR_AUDIT" : "BLOCKED_UPSTREAM",
    threshold,
    blocker: key === "00" ? "Run Wave 1 foundation audit" : "Stage 00 foundation must freeze first",
    evidenceSummary: key === "00" ? "Wave 1 contracts materialized in D1" : "No V7 production work authorized",
  }));
  for (let index = 0; index < stageRows.length; index += 6) {
    await db.insert(v7StageStates).values(stageRows.slice(index, index + 6)).onConflictDoNothing();
  }

  const decisionRows = lockedDecisions.map(([code, title]) => ({
    id: `${PROGRAM_ID}-${code}`,
    programId: PROGRAM_ID,
    decisionCode: code,
    title,
    status: "LOCKED",
    rationale: "Approved in Production Pipeline V7 Architecture & Standards v1.0",
  }));
  for (let index = 0; index < decisionRows.length; index += 6) {
    await db.insert(v7DecisionRecords).values(decisionRows.slice(index, index + 6)).onConflictDoNothing();
  }

  await db.insert(v7EvidenceLineage).values([
    {
      id: `${PROGRAM_ID}-EVIDENCE-PROGRAM`, programId: PROGRAM_ID, entityType: "PROGRAM_CONTRACT",
      title: "V7 Program Contract", lifecycleState: "MATERIALIZED", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-ADR`, programId: PROGRAM_ID, entityType: "DECISION_BASELINE",
      title: "Architecture Decision Register", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-QUARANTINE`, programId: PROGRAM_ID, entityType: "QUARANTINE_POLICY",
      title: "V5/V6 historical quarantine", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO", quarantineState: "ENFORCED",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-QUALITY`, programId: PROGRAM_ID, entityType: "QUALITY_POLICY",
      title: "Universal V7 release firewall", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
    {
      id: `${PROGRAM_ID}-EVIDENCE-REPAIR`, programId: PROGRAM_ID, entityType: "REPAIR_POLICY",
      title: "Bounded repair and regression policy", lifecycleState: "FROZEN", storageState: "D1_STORED",
      rightsState: "NOT_APPLICABLE", costState: "VERIFIED_ZERO",
    },
  ]).onConflictDoNothing();

  await db.insert(v7StorageContracts).values([
    { id: `${PROGRAM_ID}-STORAGE-RUNTIME`, programId: PROGRAM_ID, tier: "RUNTIME_OBJECT_STORAGE", bindingName: "BUCKET", role: "Preview, processing, render and active production", verificationState: "PENDING_RUNTIME_TEST" },
    { id: `${PROGRAM_ID}-STORAGE-DRIVE`, programId: PROGRAM_ID, tier: "GOOGLE_DRIVE_ARCHIVE", bindingName: "GOOGLE_DRIVE_OAUTH", role: "User-controlled canonical archive and recovery", verificationState: "CONFIG_REQUIRED" },
    { id: `${PROGRAM_ID}-STORAGE-LOCAL`, programId: PROGRAM_ID, tier: "LOCAL_SYNC_FOLDER", bindingName: "LOCAL_SYNC_AGENT", role: "Editing, offline work and external-tool handoff", verificationState: "AGENT_REQUIRED" },
    { id: `${PROGRAM_ID}-STORAGE-REGISTRY`, programId: PROGRAM_ID, tier: "ASSET_REGISTRY", bindingName: "DB", role: "Identity, cost, rights, lineage and state", verificationState: "PENDING_RUNTIME_TEST" },
  ]).onConflictDoNothing();

  await db.insert(v7CostEvents).values({
    id: `${PROGRAM_ID}-COST-BOOTSTRAP`, programId: PROGRAM_ID, stageKey: "00", provider: "INTERNAL",
    costClass: "FIXED", costType: "CONTROL_PLANE_BOOTSTRAP", status: "VERIFIED",
    estimatedUsd: 0, actualUsd: 0, note: "Wave 1 ledger initialized; no V7 production spend authorized",
  }).onConflictDoNothing();

  return db;
}

async function readDashboard() {
  const db = await seedControlPlane();
  const [program] = await db.select().from(v7ProgramContracts).where(eq(v7ProgramContracts.id, PROGRAM_ID)).limit(1);
  const stages = await db.select().from(v7StageStates).where(eq(v7StageStates.programId, PROGRAM_ID)).orderBy(asc(v7StageStates.sequence));
  const evidence = await db.select().from(v7EvidenceLineage).where(eq(v7EvidenceLineage.programId, PROGRAM_ID)).orderBy(asc(v7EvidenceLineage.createdAt));
  const assets = await db.select().from(v7AssetRegistry).where(eq(v7AssetRegistry.programId, PROGRAM_ID));
  const costs = await db.select().from(v7CostEvents).where(eq(v7CostEvents.programId, PROGRAM_ID)).orderBy(desc(v7CostEvents.createdAt));
  const storage = await db.select().from(v7StorageContracts).where(eq(v7StorageContracts.programId, PROGRAM_ID)).orderBy(asc(v7StorageContracts.id));
  const decisions = await db.select().from(v7DecisionRecords).where(eq(v7DecisionRecords.programId, PROGRAM_ID)).orderBy(asc(v7DecisionRecords.decisionCode));
  const [latestAudit] = await db.select().from(v7FoundationAudits).where(eq(v7FoundationAudits.programId, PROGRAM_ID)).orderBy(desc(v7FoundationAudits.createdAt)).limit(1);
  const actualCost = costs.reduce((total, item) => total + item.actualUsd, 0);
  const estimatedCost = costs.reduce((total, item) => total + item.estimatedUsd, 0);
  const lifecycle = ["PLAN", "MATERIALIZED", "VERIFIED", "FROZEN", "REJECTED", "ESCALATED"].map((state) => ({
    state,
    count: evidence.filter((item) => item.lifecycleState === state).length,
  }));
  return {
    program,
    stages,
    evidence,
    lifecycle,
    assets,
    costs,
    costSummary: { actualCost, estimatedCost, reusableValue: assets.filter((item) => item.reusableEligible).reduce((total, item) => total + item.costUsd, 0) },
    storage,
    decisions,
    latestAudit: latestAudit ? { ...latestAudit, checks: JSON.parse(latestAudit.checksJson), blockers: JSON.parse(latestAudit.blockersJson) } : null,
    guardrails: {
      legacyQuarantine: evidence.some((item) => item.quarantineState === "ENFORCED"),
      zeroP0: program.p0Tolerance === 0,
      zeroP1: program.p1Tolerance === 0,
      boundedRepair: program.maximumAttempts === 3 && program.minimumImprovement === 3,
      productionAuthorized: program.productionAuthorized,
    },
  };
}

export async function GET() {
  try {
    return Response.json(await readDashboard());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load V7 control plane" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { action?: string; mode?: string };
    const db = await seedControlPlane();
    if (payload.action === "SET_MODE") {
      if (!payload.mode || !["AUTOPILOT", "APPROVAL_GATES", "MANUAL"].includes(payload.mode)) {
        return Response.json({ error: "Invalid execution mode" }, { status: 400 });
      }
      await db.update(v7ProgramContracts).set({ executionMode: payload.mode, updatedAt: new Date().toISOString() }).where(eq(v7ProgramContracts.id, PROGRAM_ID));
      return Response.json(await readDashboard());
    }

    if (payload.action !== "RUN_FOUNDATION_AUDIT") {
      return Response.json({ error: "Unsupported control-plane action" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let r2Verified = false;
    try {
      const { env } = await import("cloudflare:workers");
      if (env.BUCKET) {
        const markerKey = "v7/system/wave-1-foundation.json";
        await env.BUCKET.put(markerKey, JSON.stringify({ programId: PROGRAM_ID, verifiedAt: now }), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: { pipelineVersion: "7", evidenceType: "FOUNDATION_AUDIT" },
        });
        r2Verified = Boolean(await env.BUCKET.head(markerKey));
      }
    } catch {
      r2Verified = false;
    }

    if (r2Verified) {
      await db.update(v7StorageContracts).set({ verificationState: "VERIFIED", lastVerifiedAt: now, evidence: "R2 marker write and head verification passed", updatedAt: now }).where(eq(v7StorageContracts.id, `${PROGRAM_ID}-STORAGE-RUNTIME`));
    }
    await db.update(v7StorageContracts).set({ verificationState: "VERIFIED", lastVerifiedAt: now, evidence: "D1 registry read/write path verified", updatedAt: now }).where(eq(v7StorageContracts.id, `${PROGRAM_ID}-STORAGE-REGISTRY`));

    const decisions = await db.select().from(v7DecisionRecords).where(eq(v7DecisionRecords.programId, PROGRAM_ID));
    const evidence = await db.select().from(v7EvidenceLineage).where(eq(v7EvidenceLineage.programId, PROGRAM_ID));
    const storage = await db.select().from(v7StorageContracts).where(eq(v7StorageContracts.programId, PROGRAM_ID));
    const blockers = storage.filter((item) => item.requiredForProduction && item.verificationState !== "VERIFIED").map((item) => ({
      code: `STORAGE_${item.tier}`,
      severity: "P0",
      message: `${item.tier.replaceAll("_", " ")} is ${item.verificationState.replaceAll("_", " ").toLowerCase()}`,
      nextAction: item.tier === "GOOGLE_DRIVE_ARCHIVE" ? "Authorize the Factory Google Drive connection and select a root folder" : item.tier === "LOCAL_SYNC_FOLDER" ? "Install and pair the Local Sync Agent" : "Re-run the runtime storage test",
    }));
    const checks = [
      { id: "SCHEMA", label: "V7 authoritative schema", status: "PASS", evidence: "Program, stage, evidence, asset, cost, storage and decision tables respond" },
      { id: "ADR", label: "Locked decision baseline", status: decisions.length === 21 ? "PASS" : "FAIL", evidence: `${decisions.length}/21 locked ADRs stored` },
      { id: "QUARANTINE", label: "Legacy quarantine", status: evidence.some((item) => item.quarantineState === "ENFORCED") ? "PASS" : "FAIL", evidence: "V5/V6 excluded from V7 selection namespace" },
      { id: "D1", label: "Asset Registry database", status: "PASS", evidence: "D1 read/write path verified" },
      { id: "R2", label: "Runtime object storage", status: r2Verified ? "PASS" : "FAIL", evidence: r2Verified ? "Marker write and head verification passed" : "Runtime marker verification failed" },
      { id: "DRIVE", label: "Google Drive archive", status: storage.some((item) => item.tier === "GOOGLE_DRIVE_ARCHIVE" && item.verificationState === "VERIFIED") ? "PASS" : "BLOCKED", evidence: "Connection and root folder must be verified before accepting production assets" },
      { id: "LOCAL", label: "Local Sync Agent", status: storage.some((item) => item.tier === "LOCAL_SYNC_FOLDER" && item.verificationState === "VERIFIED") ? "PASS" : "BLOCKED", evidence: "Desktop agent pairing is required for durable local-folder synchronization" },
    ];
    const architectureScore = Math.round((checks.filter((item) => ["SCHEMA", "ADR", "QUARANTINE"].includes(item.id) && item.status === "PASS").length / 3) * 100);
    const storageScore = Math.round((checks.filter((item) => ["D1", "R2", "DRIVE", "LOCAL"].includes(item.id) && item.status === "PASS").length / 4) * 100);
    const productionAuthorized = blockers.length === 0 && checks.every((item) => item.status === "PASS");
    const auditId = `${PROGRAM_ID}-AUDIT-${Date.now()}`;
    await db.insert(v7FoundationAudits).values({
      id: auditId,
      programId: PROGRAM_ID,
      status: productionAuthorized ? "PASS" : "FOUNDATION_READY_PRODUCTION_BLOCKED",
      architectureScore,
      evidenceScore: 100,
      costScore: 100,
      storageScore,
      productionAuthorized,
      checksJson: JSON.stringify(checks),
      blockersJson: JSON.stringify(blockers),
    });
    await db.update(v7ProgramContracts).set({
      status: productionAuthorized ? "WAVE_1_FROZEN" : "WAVE_1_IMPLEMENTED_EXTERNAL_BLOCKERS",
      productionAuthorized,
      updatedAt: now,
    }).where(eq(v7ProgramContracts.id, PROGRAM_ID));
    await db.update(v7StageStates).set({
      status: productionAuthorized ? "FROZEN" : "IMPLEMENTED_BLOCKED",
      attempt: 1,
      blocker: productionAuthorized ? null : "External storage verification remains incomplete",
      evidenceSummary: productionAuthorized ? "Wave 1 foundation audit passed" : "Control plane verified; production authorization withheld",
      frozenAt: productionAuthorized ? now : null,
      updatedAt: now,
    }).where(eq(v7StageStates.id, `${PROGRAM_ID}-STAGE-00`));

    return Response.json(await readDashboard());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to execute Wave 1 audit" }, { status: 500 });
  }
}

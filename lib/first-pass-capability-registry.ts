export const FIRST_PASS_QUALITY_STANDARD_VERSION = "FIRST_PASS_QUALITY_V1" as const;

type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; run(): Promise<unknown> };
export type FirstPassCapabilityDB = { prepare(query: string): Statement };

export type CapabilityRequirementEvidence = {
  bindingId: string;
  capabilityId: string;
  capabilityKey: string;
  capabilityVersion: string;
  capabilityState: string;
  activeSettingsHash: string;
  archetypeId: string;
  archetypeKey: string;
  archetypeLabel: string;
  qualificationId: string;
  qualificationVersion: number;
  qualificationCapabilityVersion: string;
  qualificationStandardVersion: string;
  qualificationState: string;
  settingsHash: string;
  sampleSize: number;
  minimumSampleSize: number;
  firstPassYield: number;
  minimumFirstPassYield: number;
  p0EscapeCount: number;
  evidenceHashCount: number;
  revokedAt: string;
};

export type CapabilityGap = { bindingId: string; capabilityKey: string; archetypeKey: string; reasons: string[] };
export type CapabilityEligibility = { eligible: boolean; operation: string; stageKey: string; requirementCount: number; eligibleCount: number; qualificationIds: string[]; gaps: CapabilityGap[] };

const clean = (value: unknown) => String(value ?? "").trim();
const numeric = (value: unknown) => Number(value ?? 0);
const parseList = (value: unknown) => { try { const parsed = JSON.parse(clean(value)); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

export class FirstPassCapabilityError extends Error {
  readonly code = "FIRST_PASS_CAPABILITY_NOT_QUALIFIED";
  readonly status = 409;
  readonly gaps: CapabilityGap[];
  constructor(readonly eligibility: CapabilityEligibility) {
    super(eligibility.requirementCount === 0
      ? `No active first-pass capability requirement exists for ${eligibility.operation} at Stage ${eligibility.stageKey}`
      : `${eligibility.requirementCount - eligibility.eligibleCount} first-pass capability requirements are not qualified for ${eligibility.operation} at Stage ${eligibility.stageKey}`);
    this.gaps = eligibility.gaps;
  }
}

export function evaluateCapabilityEligibility(operation: string, stageKey: string, requirements: CapabilityRequirementEvidence[]): CapabilityEligibility {
  const gaps: CapabilityGap[] = [], qualificationIds: string[] = [];
  for (const item of requirements) {
    const reasons: string[] = [];
    if (item.capabilityState !== "QUALIFIED") reasons.push("CAPABILITY_NOT_QUALIFIED");
    if (item.qualificationState !== "QUALIFIED") reasons.push("ARCHETYPE_QUALIFICATION_NOT_PASSED");
    if (!item.qualificationId) reasons.push("QUALIFICATION_EVIDENCE_MISSING");
    if (item.qualificationCapabilityVersion !== item.capabilityVersion) reasons.push("CAPABILITY_VERSION_MISMATCH");
    if (item.qualificationStandardVersion !== FIRST_PASS_QUALITY_STANDARD_VERSION) reasons.push("STANDARD_VERSION_MISMATCH");
    if (!item.settingsHash) reasons.push("SETTINGS_HASH_MISSING");
    if (!item.activeSettingsHash || item.activeSettingsHash === "UNRESOLVED") reasons.push("ACTIVE_SETTINGS_HASH_UNRESOLVED");
    else if (item.settingsHash !== item.activeSettingsHash) reasons.push("CAPABILITY_SETTINGS_MISMATCH");
    if (item.sampleSize < item.minimumSampleSize) reasons.push("SAMPLE_SIZE_BELOW_FLOOR");
    if (item.firstPassYield < item.minimumFirstPassYield) reasons.push("FIRST_PASS_YIELD_BELOW_FLOOR");
    if (item.p0EscapeCount !== 0) reasons.push("P0_ESCAPE_NOT_ZERO");
    if (item.evidenceHashCount < item.minimumSampleSize) reasons.push("EVIDENCE_HASH_COVERAGE_INCOMPLETE");
    if (item.revokedAt) reasons.push("QUALIFICATION_REVOKED");
    if (reasons.length) gaps.push({ bindingId: item.bindingId, capabilityKey: item.capabilityKey, archetypeKey: item.archetypeKey, reasons });
    else qualificationIds.push(item.qualificationId);
  }
  return { eligible: requirements.length > 0 && gaps.length === 0, operation, stageKey, requirementCount: requirements.length, eligibleCount: requirements.length - gaps.length, qualificationIds, gaps };
}

export async function inspectFirstPassCapabilityEligibility(db: FirstPassCapabilityDB, operation: string, stageKey: string) {
  const result = await db.prepare(`SELECT r.id binding_id,r.minimum_sample_size,r.minimum_first_pass_yield,
    c.id capability_id,c.capability_key,c.capability_version,c.lifecycle_state capability_state,c.active_settings_hash,
    a.id archetype_id,a.archetype_key,a.label archetype_label,
    q.id qualification_id,q.qualification_version,q.capability_version qualification_capability_version,q.standard_version qualification_standard_version,
    q.lifecycle_state qualification_state,q.settings_hash,q.sample_size,q.first_pass_yield,q.p0_escape_count,q.evidence_hashes_json,q.revoked_at
    FROM v7_first_pass_operation_requirements r
    JOIN v7_first_pass_capabilities c ON c.id=r.capability_id
    JOIN v7_first_pass_archetypes a ON a.id=r.archetype_id AND a.active=1
    LEFT JOIN v7_first_pass_qualifications q ON q.id=(SELECT q2.id FROM v7_first_pass_qualifications q2 WHERE q2.capability_id=r.capability_id AND q2.archetype_id=r.archetype_id ORDER BY q2.qualification_version DESC LIMIT 1)
    WHERE r.operation=? AND r.stage_key=? AND r.active=1 ORDER BY c.plane,c.capability_key,a.archetype_key`).bind(operation, stageKey).all<Row>();
  const requirements = (result.results ?? []).map((row) => ({
    bindingId: clean(row.binding_id), capabilityId: clean(row.capability_id), capabilityKey: clean(row.capability_key), capabilityVersion: clean(row.capability_version), capabilityState: clean(row.capability_state), activeSettingsHash: clean(row.active_settings_hash),
    archetypeId: clean(row.archetype_id), archetypeKey: clean(row.archetype_key), archetypeLabel: clean(row.archetype_label), qualificationId: clean(row.qualification_id), qualificationVersion: numeric(row.qualification_version),
    qualificationCapabilityVersion: clean(row.qualification_capability_version), qualificationStandardVersion: clean(row.qualification_standard_version), qualificationState: clean(row.qualification_state), settingsHash: clean(row.settings_hash),
    sampleSize: numeric(row.sample_size), minimumSampleSize: numeric(row.minimum_sample_size), firstPassYield: numeric(row.first_pass_yield), minimumFirstPassYield: numeric(row.minimum_first_pass_yield),
    p0EscapeCount: numeric(row.p0_escape_count), evidenceHashCount: parseList(row.evidence_hashes_json).length, revokedAt: clean(row.revoked_at),
  })) satisfies CapabilityRequirementEvidence[];
  return evaluateCapabilityEligibility(operation, stageKey, requirements);
}

export async function assertFirstPassCapabilityEligibility(db: FirstPassCapabilityDB, input: { operation: string; stageKey: string; programId?: string; queueId?: string }) {
  await db.prepare(`UPDATE v7_first_pass_qualifications SET lifecycle_state='SUPERSEDED',revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP),blocker='Capability version or active settings hash changed; requalification required',updated_at=CURRENT_TIMESTAMP
    WHERE lifecycle_state='QUALIFIED' AND EXISTS (SELECT 1 FROM v7_first_pass_capabilities c WHERE c.id=v7_first_pass_qualifications.capability_id AND (c.capability_version<>v7_first_pass_qualifications.capability_version OR c.active_settings_hash='UNRESOLVED' OR c.active_settings_hash<>v7_first_pass_qualifications.settings_hash))`).run();
  const eligibility = await inspectFirstPassCapabilityEligibility(db, input.operation, input.stageKey);
  await db.prepare("INSERT INTO v7_first_pass_dispatch_audits (id,program_id,queue_id,operation,stage_key,decision,standard_version,requirement_count,eligible_count,gap_json,provider_requests,spend_usd) VALUES (?,?,?,?,?,?,?,?,?,?,0,0)")
    .bind(`fp-dispatch-${crypto.randomUUID()}`, input.programId || null, input.queueId || null, input.operation, input.stageKey, eligibility.eligible ? "AUTHORIZED" : "BLOCKED", FIRST_PASS_QUALITY_STANDARD_VERSION, eligibility.requirementCount, eligibility.eligibleCount, JSON.stringify(eligibility.gaps)).run();
  if (!eligibility.eligible) throw new FirstPassCapabilityError(eligibility);
  return eligibility;
}

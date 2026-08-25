import { canonicalHash } from "@/lib/canonical-json";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";

export const FACTORY_PROVIDER_GATEWAY_VERSION = "FACTORY_PROVIDER_GATEWAY_V1" as const;

type Row = Record<string, unknown>;

export type FactoryProviderWorkRequest = {
  videoId: string;
  shotContractId?: string | null;
  capabilityKey: string;
  capabilityVersion: string;
  archetype: string;
  inputHash: string;
  payloadBytes: number;
  expectedOutputSchemaHash: string;
  requiredSettingsHash: string;
  standardVersion: string;
  rightsPolicyVersion: string;
  retentionPolicyVersion: string;
  minimumSampleSize: number;
  minimumFirstPassYield: number;
  dispatchMode: "ZERO_DISPATCH" | "PLAN_ONLY" | "DISPATCH_ALLOWED";
  maxProviderRequests: number;
  maxSpendMicros: number;
  fallbackAllowed: boolean;
  requestedBindingId?: string | null;
  evaluatedAt?: string;
};

export type FactoryProviderRouteDecision = {
  decision: "PLANNED_ZERO_DISPATCH" | "BLOCKED";
  bindingId: string | null;
  qualificationId: string | null;
  providerId: string | null;
  reasons: string[];
  providerRequests: 0;
  spendMicros: 0;
  fallbackUsed: false;
  gatewayVersion: typeof FACTORY_PROVIDER_GATEWAY_VERSION;
  decisionHash: string;
};

const clean = (value: unknown) => String(value ?? "").trim();
const numeric = (value: unknown) => Number(value ?? 0);
const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[A-Za-z0-9._:@/-]{3,200}$/;
const tokenPattern = /^[A-Za-z0-9._:@/-]{1,200}$/;

function parseList(value: unknown) {
  try {
    const parsed = JSON.parse(clean(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function validate(input: FactoryProviderWorkRequest) {
  const reasons: string[] = [];
  for (const [label, value] of [["VIDEO_ID", input.videoId], ["CAPABILITY_KEY", input.capabilityKey], ["ARCHETYPE", input.archetype]] as const) {
    if (!identityPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  for (const [label, value] of [["CAPABILITY_VERSION", input.capabilityVersion], ["STANDARD_VERSION", input.standardVersion], ["RIGHTS_POLICY_VERSION", input.rightsPolicyVersion], ["RETENTION_POLICY_VERSION", input.retentionPolicyVersion]] as const) {
    if (!tokenPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  for (const [label, value] of [["INPUT_HASH", input.inputHash], ["OUTPUT_SCHEMA_HASH", input.expectedOutputSchemaHash], ["SETTINGS_HASH", input.requiredSettingsHash]] as const) {
    if (!hashPattern.test(clean(value))) reasons.push(`${label}_INVALID`);
  }
  if (!Number.isSafeInteger(input.payloadBytes) || input.payloadBytes < 0) reasons.push("PAYLOAD_BYTES_INVALID");
  if (!Number.isSafeInteger(input.minimumSampleSize) || input.minimumSampleSize < 1) reasons.push("MINIMUM_SAMPLE_SIZE_INVALID");
  if (!Number.isFinite(input.minimumFirstPassYield) || input.minimumFirstPassYield < 0 || input.minimumFirstPassYield > 1) reasons.push("MINIMUM_FIRST_PASS_YIELD_INVALID");
  if (!Number.isSafeInteger(input.maxProviderRequests) || input.maxProviderRequests < 0) reasons.push("MAX_PROVIDER_REQUESTS_INVALID");
  if (!Number.isSafeInteger(input.maxSpendMicros) || input.maxSpendMicros < 0) reasons.push("MAX_SPEND_MICROS_INVALID");
  if (input.dispatchMode === "ZERO_DISPATCH" && (input.maxProviderRequests !== 0 || input.maxSpendMicros !== 0)) reasons.push("ZERO_DISPATCH_ENVELOPE_INVALID");
  return reasons;
}

async function blocked(input: FactoryProviderWorkRequest, reasons: string[]): Promise<FactoryProviderRouteDecision> {
  const core = { decision: "BLOCKED" as const, bindingId: null, qualificationId: null, providerId: null, reasons: [...new Set(reasons)].sort(), providerRequests: 0 as const, spendMicros: 0 as const, fallbackUsed: false as const, gatewayVersion: FACTORY_PROVIDER_GATEWAY_VERSION };
  return { ...core, decisionHash: await canonicalHash({ input, ...core }) };
}

export async function resolveFactoryProviderRoute(db: FactoryRuntimeDB, input: FactoryProviderWorkRequest): Promise<FactoryProviderRouteDecision> {
  const invalid = validate(input);
  if (invalid.length) throw new FactoryRuntimeError("PROVIDER_WORK_REQUEST_INVALID", 400, "The typed provider work request is invalid", invalid);
  if (input.dispatchMode === "DISPATCH_ALLOWED") return blocked(input, ["FACTORY_PROVIDER_DISPATCH_DISABLED"]);
  if (input.fallbackAllowed) return blocked(input, ["AUTOMATIC_PROVIDER_FALLBACK_DISABLED"]);

  const statement = db.prepare(`SELECT
      b.id binding_id,b.provider_id,b.output_schema_hash binding_output_schema_hash,b.settings_hash binding_settings_hash,
      b.rights_policy_version,b.retention_policy_version,b.max_payload_bytes,b.lifecycle_state binding_state,b.fallback_binding_id,
      EXISTS(SELECT 1 FROM factory_provider_bindings parent WHERE parent.fallback_binding_id=b.id) is_declared_fallback,
      p.lifecycle_state provider_state,p.health_state,
      c.id capability_id,c.lifecycle_state capability_state,c.output_schema_hash capability_output_schema_hash,
      q.id qualification_id,q.standard_version,q.qualified_archetypes_json,q.settings_hash qualification_settings_hash,
      q.sample_size,q.first_pass_yield,q.p0_escape_count,q.lifecycle_state qualification_state,q.expires_at,
      r.commercial_use_state,r.valid_from rights_valid_from,r.expires_at rights_expires_at,
      (SELECT drift_state FROM factory_provider_drift_receipts d WHERE d.binding_id=b.id ORDER BY d.observed_at DESC,d.created_at DESC,d.id DESC LIMIT 1) latest_drift_state
    FROM factory_provider_bindings b
    JOIN factory_providers p ON p.id=b.provider_id
    JOIN factory_capabilities c ON c.id=b.capability_id
    LEFT JOIN factory_capability_qualifications q ON q.binding_id=b.id
    LEFT JOIN factory_rights_eligibility_receipts r ON r.binding_id=b.id AND r.rights_policy_version=b.rights_policy_version AND r.retention_policy_version=b.retention_policy_version
    WHERE c.capability_key=? AND c.capability_version=?
      AND (? IS NULL OR b.id=?)
    ORDER BY b.priority ASC,q.qualification_version DESC,r.created_at DESC,b.id ASC`)
    .bind(input.capabilityKey, input.capabilityVersion, input.requestedBindingId ?? null, input.requestedBindingId ?? null);
  const candidates = (await statement.all<Row>()).results ?? [];
  const now = input.evaluatedAt ?? new Date().toISOString();
  const rejected: string[] = [];

  for (const row of candidates) {
    const reasons: string[] = [];
    if (clean(row.provider_state) !== "ACTIVE") reasons.push("PROVIDER_NOT_ACTIVE");
    if (clean(row.health_state) !== "HEALTHY") reasons.push("PROVIDER_NOT_HEALTHY");
    if (clean(row.capability_state) !== "ACTIVE") reasons.push("CAPABILITY_NOT_ACTIVE");
    if (clean(row.binding_state) !== "ACTIVE") reasons.push("BINDING_NOT_ACTIVE");
    if (numeric(row.is_declared_fallback) === 1) reasons.push("FALLBACK_BINDING_REQUIRES_EXPLICIT_AUTHORIZATION");
    if (clean(row.binding_output_schema_hash) !== input.expectedOutputSchemaHash || clean(row.capability_output_schema_hash) !== input.expectedOutputSchemaHash) reasons.push("OUTPUT_SCHEMA_MISMATCH");
    if (clean(row.binding_settings_hash) !== input.requiredSettingsHash || clean(row.qualification_settings_hash) !== input.requiredSettingsHash) reasons.push("SETTINGS_HASH_MISMATCH");
    if (clean(row.rights_policy_version) !== input.rightsPolicyVersion) reasons.push("RIGHTS_POLICY_MISMATCH");
    if (clean(row.retention_policy_version) !== input.retentionPolicyVersion) reasons.push("RETENTION_POLICY_MISMATCH");
    if (numeric(row.max_payload_bytes) < input.payloadBytes) reasons.push("PAYLOAD_LIMIT_EXCEEDED");
    if (clean(row.qualification_state) !== "QUALIFIED") reasons.push("QUALIFICATION_NOT_ACTIVE");
    if (clean(row.latest_drift_state) === "STALE") reasons.push("PROVIDER_BINDING_DRIFT_STALE");
    if (clean(row.standard_version) !== input.standardVersion) reasons.push("QUALIFICATION_STANDARD_MISMATCH");
    if (!parseList(row.qualified_archetypes_json).includes(input.archetype)) reasons.push("ARCHETYPE_NOT_QUALIFIED");
    if (numeric(row.sample_size) < input.minimumSampleSize) reasons.push("QUALIFICATION_SAMPLE_TOO_SMALL");
    if (numeric(row.first_pass_yield) < input.minimumFirstPassYield) reasons.push("FIRST_PASS_YIELD_BELOW_FLOOR");
    if (numeric(row.p0_escape_count) !== 0) reasons.push("P0_ESCAPE_DETECTED");
    if (clean(row.expires_at) && clean(row.expires_at) <= now) reasons.push("QUALIFICATION_EXPIRED");
    if (clean(row.commercial_use_state) !== "ELIGIBLE") reasons.push("COMMERCIAL_RIGHTS_NOT_ELIGIBLE");
    if (clean(row.rights_valid_from) > now) reasons.push("RIGHTS_NOT_YET_VALID");
    if (clean(row.rights_expires_at) && clean(row.rights_expires_at) <= now) reasons.push("RIGHTS_EXPIRED");
    if (reasons.length) { rejected.push(...reasons); continue; }

    const core = {
      decision: "PLANNED_ZERO_DISPATCH" as const,
      bindingId: clean(row.binding_id), qualificationId: clean(row.qualification_id), providerId: clean(row.provider_id), reasons: [] as string[],
      providerRequests: 0 as const, spendMicros: 0 as const, fallbackUsed: false as const, gatewayVersion: FACTORY_PROVIDER_GATEWAY_VERSION,
    };
    return { ...core, decisionHash: await canonicalHash({ input, ...core }) };
  }
  return blocked(input, candidates.length ? rejected : ["NO_PROVIDER_BINDING"]);
}

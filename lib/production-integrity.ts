export const PRODUCTION_INTEGRITY_VERSION = "FP3_1_PRODUCTION_INTEGRITY_V1" as const;

export type ImmutabilityState = "MUTABLE" | "SEALED" | "SUPERSEDED";
export type EligibilityState = "PENDING" | "ELIGIBLE" | "BLOCKED" | "REQUALIFICATION_REQUIRED" | "SUPERSEDED";
export type HardGateState = "PASS" | "FAIL" | "BLOCKED" | "NOT_EVALUATED";

export function deriveArtifactIntegrityState(input: {
  lifecycleState: string;
  rightsEligible: boolean;
  costEligible: boolean;
  capabilityCurrent: boolean;
  hardGateStates: HardGateState[];
}) {
  const immutabilityState: ImmutabilityState = input.lifecycleState === "SUPERSEDED" ? "SUPERSEDED" : input.lifecycleState === "FROZEN" ? "SEALED" : "MUTABLE";
  if (immutabilityState === "SUPERSEDED") return { immutabilityState, eligibilityState: "SUPERSEDED" as const, reasons: ["ARTIFACT_SUPERSEDED"] };
  const reasons: string[] = [];
  if (!input.rightsEligible) reasons.push("RIGHTS_INELIGIBLE");
  if (!input.costEligible) reasons.push("COST_INELIGIBLE");
  if (!input.capabilityCurrent) reasons.push("CAPABILITY_REQUALIFICATION_REQUIRED");
  if (input.hardGateStates.includes("FAIL")) reasons.push("HARD_GATE_FAILED");
  if (input.hardGateStates.includes("BLOCKED")) reasons.push("HARD_GATE_BLOCKED");
  if (input.hardGateStates.includes("NOT_EVALUATED")) reasons.push("HARD_GATE_NOT_EVALUATED");
  const eligibilityState: EligibilityState = !input.capabilityCurrent ? "REQUALIFICATION_REQUIRED" : reasons.length ? "BLOCKED" : "ELIGIBLE";
  return { immutabilityState, eligibilityState, reasons };
}

export function evaluateSafetyScopeEvidence(input: Array<{ standardId: string; level: string; state: HardGateState; evidenceHash?: string }>) {
  const owned = input.filter((item) => item.level === "M0" || item.level === "M1");
  const failed = owned.filter((item) => item.state === "FAIL");
  const blocked = owned.filter((item) => item.state === "BLOCKED");
  const notEvaluated = owned.filter((item) => item.state === "NOT_EVALUATED" || !item.evidenceHash);
  return {
    eligible: owned.length > 0 && failed.length === 0 && blocked.length === 0 && notEvaluated.length === 0 && owned.every((item) => item.state === "PASS" && Boolean(item.evidenceHash)),
    passed: owned.filter((item) => item.state === "PASS" && item.evidenceHash).map((item) => item.standardId),
    failed: failed.map((item) => item.standardId),
    blocked: blocked.map((item) => item.standardId),
    notEvaluated: notEvaluated.map((item) => item.standardId),
  };
}

const personalizedAdvicePatterns = [
  /\b(?:you should|you need to|i recommend(?: that)? you|my recommendation is to)\s+(?:buy|sell|invest|borrow|refinance|consolidate|open|close|switch)\b/i,
  /\bbased on your (?:income|salary|debt|credit score|portfolio|risk tolerance|age|savings)\b/i,
  /\b(?:guaranteed|risk[- ]free) (?:return|profit|income|investment)\b/i,
  /\bthis (?:stock|fund|loan|card|investment) is (?:right|best|ideal) for you\b/i,
] as const;

export function lintFinancialSafety(text: string) {
  const normalized = text.normalize("NFC").replace(/\s+/g, " ").trim();
  const findings = personalizedAdvicePatterns.flatMap((pattern, index) => pattern.test(normalized) ? [{ code: `PERSONALIZED_FINANCIAL_ADVICE_${index + 1}`, severity: "M0" as const }] : []);
  return { state: findings.length ? "FAIL" as const : "PASS" as const, findings, normalizedLength: normalized.length };
}

export type FencedLease = { id: string; stageKey: string; fencingToken: number; state: string; expiresAt: string; heartbeatAt: string };

export function evaluateFencedLease(lease: FencedLease | null, input: { leaseId: string; stageKey: string; fencingToken: number; nowIso: string; maximumHeartbeatAgeMs: number }) {
  const reasons: string[] = [];
  if (!lease) reasons.push("ACTIVE_LEASE_MISSING");
  else {
    if (lease.id !== input.leaseId) reasons.push("LEASE_ID_MISMATCH");
    if (lease.stageKey !== input.stageKey) reasons.push("LEASE_STAGE_MISMATCH");
    if (lease.fencingToken !== input.fencingToken) reasons.push("STALE_FENCING_TOKEN");
    if (lease.state !== "ACTIVE") reasons.push("LEASE_NOT_ACTIVE");
    if (Date.parse(lease.expiresAt) <= Date.parse(input.nowIso)) reasons.push("LEASE_EXPIRED");
    if (Date.parse(input.nowIso) - Date.parse(lease.heartbeatAt) > input.maximumHeartbeatAgeMs) reasons.push("LEASE_HEARTBEAT_STALE");
  }
  return { eligible: reasons.length === 0, reasons };
}

export type BudgetSnapshot = { version: number; maximumRequests: number; maximumSpendUsd: number; actualRequests: number; actualSpendUsd: number; reservedRequests: number; reservedSpendUsd: number };

export function applyAtomicReservation(snapshot: BudgetSnapshot, input: { expectedVersion: number; requests: number; spendUsd: number }) {
  if (snapshot.version !== input.expectedVersion) return { accepted: false as const, reason: "BUDGET_VERSION_CONFLICT", snapshot };
  if (!Number.isInteger(input.requests) || input.requests < 0 || !Number.isFinite(input.spendUsd) || input.spendUsd < 0) return { accepted: false as const, reason: "RESERVATION_INVALID", snapshot };
  if (snapshot.actualRequests + snapshot.reservedRequests + input.requests > snapshot.maximumRequests) return { accepted: false as const, reason: "REQUEST_CEILING_EXCEEDED", snapshot };
  if (snapshot.actualSpendUsd + snapshot.reservedSpendUsd + input.spendUsd > snapshot.maximumSpendUsd + 1e-9) return { accepted: false as const, reason: "SPEND_CEILING_EXCEEDED", snapshot };
  return { accepted: true as const, snapshot: { ...snapshot, version: snapshot.version + 1, reservedRequests: snapshot.reservedRequests + input.requests, reservedSpendUsd: snapshot.reservedSpendUsd + input.spendUsd } };
}

export type DispatchFirewallInput = {
  capabilityQualified: boolean;
  capabilitySettingsCurrent: boolean;
  leaseEligible: boolean;
  reservationState: "RESERVED" | "MISSING" | "EXHAUSTED";
  rightsState: string;
  allowedRightsStates: string[];
  idempotencyKey: string;
  safetyRequired: boolean;
  safetyState: HardGateState;
};

export function evaluateDispatchFirewall(input: DispatchFirewallInput) {
  const reasons: string[] = [];
  if (!input.capabilityQualified) reasons.push("CAPABILITY_NOT_QUALIFIED");
  if (!input.capabilitySettingsCurrent) reasons.push("CAPABILITY_SETTINGS_SUPERSEDED");
  if (!input.leaseEligible) reasons.push("FENCED_LEASE_REQUIRED");
  if (input.reservationState !== "RESERVED") reasons.push(input.reservationState === "EXHAUSTED" ? "BUDGET_EXHAUSTED" : "ATOMIC_RESERVATION_REQUIRED");
  if (!input.allowedRightsStates.includes(input.rightsState)) reasons.push("RIGHTS_INELIGIBLE");
  if (!/^[A-Za-z0-9._:-]{16,200}$/.test(input.idempotencyKey)) reasons.push("IDEMPOTENCY_KEY_INVALID");
  if (input.safetyRequired && input.safetyState !== "PASS") reasons.push(input.safetyState === "NOT_EVALUATED" ? "SAFETY_SCOPE_NOT_EVALUATED" : "SAFETY_SCOPE_BLOCKED");
  return { authorized: reasons.length === 0, reasons };
}

export function classifyProviderFailure(code: string) {
  const value = code.toUpperCase();
  if (/TIMEOUT|429|RATE_LIMIT|5\d\d|NETWORK|ECONN/.test(value)) return "TRANSIENT" as const;
  if (/RIGHTS|LICENSE|COPYRIGHT|CONTENT_ID/.test(value)) return "RIGHTS" as const;
  if (/SCHEMA|VALIDATION|OUTPUT_MISSING|PARSE/.test(value)) return "SCHEMA" as const;
  if (/AUTH|401|403|ENTITLEMENT|PERMISSION/.test(value)) return "AUTHORIZATION" as const;
  if (/SAFETY|POLICY|MODERATION/.test(value)) return "SAFETY" as const;
  return "UNKNOWN" as const;
}

const sensitiveKey = /authorization|api[-_]?key|token|secret|cookie|email|prompt|transcript|content|body/i;
export function redactTraceAttributes(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : typeof item === "string" && item.length > 256 ? `${item.slice(0, 256)}…` : item]));
}

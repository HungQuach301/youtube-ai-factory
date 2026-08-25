import { sha256Hex } from "@/lib/canonical-json";
import {
  persistHiddenSystemsTreatmentQualification,
  type HiddenSystemsTreatmentCorpus,
  type HiddenSystemsTreatmentExecutionReceipt,
} from "@/lib/factory-hidden-systems-treatment-qualification";
import { FactoryRuntimeError, type FactoryRuntimeDB } from "@/lib/factory-runtime-writer";
import type { FactoryRenderBucket } from "@/lib/factory-scene-graph-renderer";

export const HIDDEN_SYSTEMS_TREATMENT_LIVE_RUNNER_VERSION = "HIDDEN_SYSTEMS_TREATMENT_LIVE_RUNNER_V1" as const;
const maximumBytes = 400_000;

export async function runHiddenSystemsTreatmentLiveQualification(
  env: { DB: FactoryRuntimeDB; BUCKET: FactoryRenderBucket },
  corpus: HiddenSystemsTreatmentCorpus,
  execution: HiddenSystemsTreatmentExecutionReceipt,
  outputBytes: Uint8Array,
) {
  if (!outputBytes.byteLength || outputBytes.byteLength > maximumBytes) throw new FactoryRuntimeError("TREATMENT_QUALIFICATION_OUTPUT_SIZE_INVALID", 400, "The bounded qualification output must be between 1 and 400000 bytes");
  const outputHash = await sha256Hex(outputBytes);
  if (outputHash !== execution.output.sha256 || outputHash !== execution.output.readbackHash || outputHash !== execution.output.deterministicReplayHash) {
    throw new FactoryRuntimeError("TREATMENT_QUALIFICATION_OUTPUT_HASH_MISMATCH", 409, "The uploaded production-scale output does not match the exact execution receipt");
  }
  const storageKey = `factory/qualifications/hidden-systems/${outputHash}.webm`;
  const existing = await env.BUCKET.get(storageKey);
  if (!existing) await env.BUCKET.put(storageKey, outputBytes);
  const stored = await env.BUCKET.get(storageKey);
  if (!stored) throw new FactoryRuntimeError("TREATMENT_QUALIFICATION_R2_WRITE_MISSING", 503, "The exact qualification output is missing after active-storage write");
  const readback = new Uint8Array(await stored.arrayBuffer()), readbackHash = await sha256Hex(readback);
  if (readback.byteLength !== outputBytes.byteLength || readbackHash !== outputHash) throw new FactoryRuntimeError("TREATMENT_QUALIFICATION_R2_READBACK_MISMATCH", 503, "The active-storage read-back differs from the uploaded qualification output");
  const persisted = await persistHiddenSystemsTreatmentQualification(env.DB, corpus, execution);
  const packageRow = await env.DB.prepare("SELECT * FROM factory_treatment_qualification_packages WHERE id=?").bind(persisted.packageId).first<Record<string, unknown>>();
  const caseRows = await env.DB.prepare("SELECT id FROM factory_treatment_qualification_case_receipts WHERE package_id=? ORDER BY case_key").bind(persisted.packageId).all<Record<string, unknown>>();
  if (!packageRow || String(packageRow.output_hash) !== outputHash || String(packageRow.verification_state) !== "PASS" || Number(packageRow.r22_authority) !== 0 || (caseRows.results ?? []).length !== 10) {
    throw new FactoryRuntimeError("TREATMENT_QUALIFICATION_D1_READBACK_MISMATCH", 503, "The append-only D1 package or case read-back is incomplete");
  }
  return {
    outcome: persisted.outcome,
    runnerVersion: HIDDEN_SYSTEMS_TREATMENT_LIVE_RUNNER_VERSION,
    packageId: persisted.packageId,
    caseCount: 10,
    outputHash,
    readbackHash,
    byteSize: readback.byteLength,
    storageKey,
    evidenceHash: persisted.evidenceHash,
    authorityBoundary: "INTERNAL_TREATMENT_QUALIFICATION_ONLY",
    r22Authority: false,
    masterAuthority: false,
    releaseAuthority: false,
    publicationAuthority: false,
    providerRequests: 0,
    spendMicros: 0,
  };
}

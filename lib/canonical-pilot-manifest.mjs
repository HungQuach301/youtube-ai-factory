export const CANONICAL_PILOT_MANIFEST_VERSION = "CANONICAL_PILOT_MANIFEST_V1";

export function deriveCanonicalPilotManifest(units, sealedIds = ["MP-001"]) {
  if (!Array.isArray(units) || units.length !== 10) {
    throw new Error(`CANONICAL_PILOT_MANIFEST_SIZE_INVALID · ${Array.isArray(units) ? units.length : 0}/10`);
  }
  const normalized = units.map((unit) => ({
    logicalId: String(unit.logicalId || "").trim(),
    briefId: String(unit.briefId || "").trim(),
    startSeconds: Number(unit.startSeconds),
    contentHash: String(unit.contentHash || "").trim(),
  }));
  const ids = normalized.map((unit) => unit.logicalId);
  if (ids.some((id) => !/^MP-\d{3}$/.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error("CANONICAL_PILOT_MANIFEST_IDS_INVALID");
  }
  const sealed = [...new Set(sealedIds.map((id) => String(id).trim()))];
  if (sealed.some((id) => !ids.includes(id))) throw new Error("CANONICAL_PILOT_SEALED_UNIT_MISSING");
  const active = normalized.filter((unit) => !sealed.includes(unit.logicalId));
  if (active.length !== 9 || !active.some((unit) => unit.logicalId === "MP-002")) {
    throw new Error("CANONICAL_PILOT_ACTIVE_SET_INVALID");
  }
  return {
    manifestVersion: CANONICAL_PILOT_MANIFEST_VERSION,
    units: normalized,
    sealedSet: sealed,
    activeReleaseSet: active.map((unit) => unit.logicalId),
  };
}

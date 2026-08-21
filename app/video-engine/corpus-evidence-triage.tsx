type Count = { key: string; count: number };

const labels: Record<string, string> = {
  OBJECT_MISSING: "R2 object missing",
  OBJECT_SIZE_LIMIT_EXCEEDED: "Object exceeds read limit",
  BYTE_SIZE_MISMATCH: "Declared byte size differs",
  DECLARED_HASH_MISSING: "Declared checksum missing",
  CHECKSUM_MISMATCH: "R2 checksum differs",
  PROVENANCE_JSON_INVALID: "Provenance JSON invalid",
  LEGACY_SOURCE_ISOLATION_UNPROVEN: "Legacy isolation unproven",
  R2_OBJECT_METADATA_MISMATCH: "R2 metadata differs",
  RECONCILIATION_REASON_MISSING: "Receipt reason missing",
  UNKNOWN_RECONCILIATION_REASON: "Unknown receipt reason",
};

export function CorpusEvidenceTriage({ blocked, rightsPending, reasons, states, kinds }: {
  blocked: number;
  rightsPending: number;
  reasons: Count[];
  states: Count[];
  kinds: Count[];
}) {
  return <section aria-label="Corpus evidence triage">
    <div className="seqRootGrid">
      <article><small>Blocked evidence</small><h3>{blocked} candidates</h3><p>Receipts remain immutable. Repair must create new evidence or exclude the candidate from independent counts.</p></article>
      <article><small>Rights queue</small><h3>{rightsPending} candidates</h3><p>Byte and provenance substrate passed; explicit provider receipt or terms binding is still required.</p></article>
      <article><small>Dominant conflict</small><h3>{reasons[0] ? `${reasons[0].count} · ${labels[reasons[0].key] ?? reasons[0].key}` : "No open conflict"}</h3><p>{reasons.slice(1, 4).map((item) => `${item.count} ${labels[item.key] ?? item.key}`).join(" · ") || "No secondary reason recorded"}</p></article>
      <article><small>State / modality</small><h3>{states[0] ? `${states[0].count} · ${states[0].key}` : "No blocked state"}</h3><p>{kinds.map((item) => `${item.count} ${item.key.toLowerCase()}`).join(" · ") || "No blocked candidate kind"}</p></article>
    </div>
  </section>;
}

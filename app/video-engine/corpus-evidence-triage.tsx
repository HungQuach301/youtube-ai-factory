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
  DECLARATION_NOT_ELIGIBLE: "Rights declaration ineligible",
  PROVIDER_TERMS_RECEIPT_MISSING: "Provider terms receipt missing",
  AUTHORSHIP_EVIDENCE_INCOMPLETE: "Authorship evidence incomplete",
  R2_ARTIFACT_ID_FIELD_MISMATCH: "R2 artifact ID differs",
  R2_PACKAGE_ID_FIELD_MISMATCH: "R2 package ID differs",
  R2_METADATA_HASH_DECLARATION_MISMATCH: "R2 metadata hash differs from declaration",
  R2_ENGINE_VERSION_FIELD_MISMATCH: "R2 engine version differs",
  CANDIDATE_SOURCE_HASH_MISMATCH: "Candidate/source hash differs",
  SOURCE_HASH_OBJECT_BYTES_MISMATCH: "Source hash differs from object bytes",
  R2_METADATA_HASH_OBJECT_BYTES_MISMATCH: "R2 metadata hash differs from object bytes",
  CANDIDATE_SOURCE_BYTE_SIZE_MISMATCH: "Candidate/source byte size differs",
  SOURCE_BYTE_SIZE_OBJECT_MISMATCH: "Source byte size differs from object bytes",
};

export function CorpusEvidenceTriage({ blocked, excluded, metadataReview, metadataAccepted, rightsPending, rightsAccepted, rightsBases, rightsKinds, rightsProviders, rightsTasks = [], reasons, facts, states, kinds }: {
  blocked: number;
  excluded: number;
  metadataReview: number;
  metadataAccepted: number;
  rightsPending: number;
  rightsAccepted: number;
  rightsBases: Count[];
  rightsKinds: Count[];
  rightsProviders: Count[];
  rightsTasks?: Count[];
  reasons: Count[];
  facts: Count[];
  states: Count[];
  kinds: Count[];
}) {
  const providerTasks = rightsProviders.filter((item) => item.key !== "NO_PROVIDER_DECLARED").reduce((sum, item) => sum + item.count, 0);
  const noProvider = rightsProviders.find((item) => item.key === "NO_PROVIDER_DECLARED")?.count ?? 0;
  const compositeTasks = Math.min(noProvider, rightsKinds.find((item) => item.key === "MASTER")?.count ?? 0);
  const effectiveRightsTasks = rightsTasks.length ? rightsTasks : [
    providerTasks ? { key: "PROVIDER_TERMS_AND_PLAN_RECEIPT", count: providerTasks } : null,
    compositeTasks ? { key: "COMPOSITE_PARENT_RIGHTS_MANIFEST", count: compositeTasks } : null,
    noProvider - compositeTasks > 0 ? { key: "AUTHORSHIP_SOURCE_RECEIPT", count: noProvider - compositeTasks } : null,
  ].filter((item): item is Count => Boolean(item)).sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
  return <section aria-label="Corpus evidence triage">
    <div className="seqRootGrid">
      <article><small>Blocked evidence</small><h3>{blocked} candidates</h3><p>Receipts remain immutable. Repair must create new evidence or exclude the candidate from independent counts.</p></article>
      <article><small>Quarantined evidence</small><h3>{excluded} candidates</h3><p>Declared source bytes diverge from R2. These records remain preserved but cannot enter a gold set.</p></article>
      <article><small>Metadata binding</small><h3>{metadataAccepted} accepted · {metadataReview} open</h3><p>Only unique storage-key/hash lineage with exact package, bytes and engine can append a provenance rebind receipt.</p></article>
      <article><small>Rights queue</small><h3>{rightsPending} pending · {rightsAccepted} reconciled</h3><p>{rightsBases.map((item) => `${item.count} ${labels[item.key] ?? item.key}`).join(" · ") || "No rights evidence pending"}</p></article>
      <article><small>Rights modality</small><h3>{rightsKinds[0] ? `${rightsKinds[0].count} ${rightsKinds[0].key.toLowerCase()}` : "No pending modality"}</h3><p>{rightsKinds.slice(1).map((item) => `${item.count} ${item.key.toLowerCase()}`).join(" · ") || "Rights queue is fully classified"}</p></article>
      <article><small>Provider family</small><h3>{rightsProviders[0] ? `${rightsProviders[0].count} ${rightsProviders[0].key.replaceAll("_", " ").toLowerCase()}` : "No provider receipt open"}</h3><p>{rightsProviders.slice(1).map((item) => `${item.count} ${item.key.replaceAll("_", " ").toLowerCase()}`).join(" · ") || "No secondary provider family"}</p></article>
      <article><small>Evidence collection lanes</small><h3>{effectiveRightsTasks[0] ? `${effectiveRightsTasks[0].count} ${effectiveRightsTasks[0].key.replaceAll("_", " ").toLowerCase()}` : "No rights task open"}</h3><p>{effectiveRightsTasks.slice(1).map((item) => `${item.count} ${item.key.replaceAll("_", " ").toLowerCase()}`).join(" · ") || "No secondary evidence lane"}</p></article>
      <article><small>Dominant conflict</small><h3>{reasons[0] ? `${reasons[0].count} · ${labels[reasons[0].key] ?? reasons[0].key}` : "No open conflict"}</h3><p>{reasons.slice(1, 4).map((item) => `${item.count} ${labels[item.key] ?? item.key}`).join(" · ") || "No secondary reason recorded"}</p></article>
      <article><small>Field-level fact</small><h3>{facts[0] ? `${facts[0].count} · ${labels[facts[0].key] ?? facts[0].key}` : "No field mismatch"}</h3><p>{facts.slice(1, 4).map((item) => `${item.count} ${labels[item.key] ?? item.key}`).join(" · ") || "No secondary field mismatch"}</p></article>
      <article><small>State / modality</small><h3>{states[0] ? `${states[0].count} · ${states[0].key}` : "No blocked state"}</h3><p>{kinds.map((item) => `${item.count} ${item.key.toLowerCase()}`).join(" · ") || "No blocked candidate kind"}</p></article>
    </div>
    <iframe style={{ display: "block", width: "calc(100% - 36px)", minHeight: 780, margin: 18, border: "1px solid #35604e", borderRadius: 14, background: "#101f19" }} src="/api/factory/sequential-production/evaluation?view=owner-label-workflow" title="Owner-confirmed corpus labeling" loading="lazy" />
  </section>;
}

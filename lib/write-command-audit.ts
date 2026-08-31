export type WriteCommandAuditPhase = "AUTHORIZED" | "SUCCEEDED" | "FAILED";

export type WriteCommandAuditStatement = {
  bind: (...values: unknown[]) => WriteCommandAuditStatement;
  run: () => Promise<unknown>;
};

export type WriteCommandAuditDatabase = {
  prepare: (query: string) => WriteCommandAuditStatement;
};

export type WriteCommandAuditIdentity = {
  handlerIdentity: string;
  actorType: string;
  actorSubjectHash: string;
  action: string;
  resourceScope: string;
  correlationId: string;
  requestHash: string;
};

export async function sha256Text(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export async function hashActorSubject(actorType: string, subject: string) {
  return sha256Text(`${actorType}:${subject}`);
}

export async function appendWriteCommandAudit(
  db: WriteCommandAuditDatabase,
  identity: WriteCommandAuditIdentity,
  phase: WriteCommandAuditPhase,
  domainReceiptReference: string | null,
  timestamp = new Date().toISOString(),
) {
  const id = `write-command-audit-${crypto.randomUUID()}`;
  await db.prepare(`INSERT INTO factory_write_command_audit
    (id,handler_identity,actor_type,actor_subject_hash,action,resource_scope,correlation_id,request_hash,phase,domain_receipt_reference,canonical_timestamp)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      id,
      identity.handlerIdentity,
      identity.actorType,
      identity.actorSubjectHash,
      identity.action,
      identity.resourceScope,
      identity.correlationId,
      identity.requestHash,
      phase,
      domainReceiptReference,
      timestamp,
    )
    .run();
  return id;
}

export function CorpusVerificationControl({ initial }: { initial: { pending: number; [key: string]: number } }) {
  return <form className="seqCorpusControl" action="/api/factory/sequential-production/evaluation" method="post">
    <input type="hidden" name="action" value="RUN_CORPUS_VERIFICATION_BATCH" />
    <input type="hidden" name="limit" value="20" />
    <input type="hidden" name="idempotencyKey" value={`corpus-form:pending-${initial.pending}`} />
    <div><small>Read-only R2 verifier</small><b>{initial.pending} pending</b><span>Owner-bound · zero provider spend · 20 artifacts per durable batch</span></div>
    <div className="seqCorpusButtons"><button type="submit" disabled={initial.pending === 0}>{initial.pending ? "Verify next 20" : "Byte sweep complete"}</button></div>
  </form>;
}

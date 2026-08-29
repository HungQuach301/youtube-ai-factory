"use client";

import { useState } from "react";

export function AudioProviderCertificationControl() {
  const [state, setState] = useState<"IDLE" | "RUNNING" | "FAILED">("IDLE");
  const [message, setMessage] = useState("");

  async function certify() {
    setState("RUNNING");
    setMessage("");
    try {
      const observedAt = new Date().toISOString();
      const response = await fetch("/api/factory/runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "CERTIFY_ASSURANCE_AUDIO_PROVIDER",
          idempotencyKey: `assurance-audio-provider-certification-${observedAt.replace(/[^0-9]/g, "")}`,
          observedAt,
          providerRequests: 0,
          spendUsd: 0,
        }),
      });
      const result = await response.json() as { certificationState?: string; blockers?: string[]; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "Audio-provider certification failed");
      if (result.certificationState !== "CERTIFIED") throw new Error(`Certification blocked: ${(result.blockers || []).join(", ") || "exact evidence incomplete"}`);
      window.location.reload();
    } catch (error) {
      setState("FAILED");
      setMessage(error instanceof Error ? error.message : "Audio-provider certification failed");
    }
  }

  return <div className="qaAction">
    <button type="button" onClick={certify} disabled={state === "RUNNING"}>
      {state === "RUNNING" ? "Observing exact provider controls…" : "Certify exact audio binding"}
    </button>
    <span>Reads subscription, voice, model and official rights metadata; 0 synthesis requests, 0 reservation and $0 spend.</span>
    {state === "FAILED" && <code>{message}</code>}
  </div>;
}

"use client";

import { useState } from "react";

export function AudioPaidDispatchAuthorizationControl() {
  const [state, setState] = useState<"IDLE" | "RUNNING" | "FAILED">("IDLE");
  const [message, setMessage] = useState("");

  async function authorize() {
    setState("RUNNING");
    setMessage("");
    try {
      const observedAt = new Date().toISOString();
      const response = await fetch("/api/factory/runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "AUTHORIZE_ASSURANCE_AUDIO_PAID_DISPATCH",
          idempotencyKey: `assurance-audio-paid-dispatch-authorization-${observedAt.replace(/[^0-9]/g, "")}`,
          observedAt,
          providerRequests: 0,
          spendUsd: 0,
        }),
      });
      const result = await response.json() as { authorizationState?: string; blockers?: string[]; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "Paid audio dispatch authorization failed");
      if (result.authorizationState !== "AUTHORIZED") throw new Error(`Authorization blocked: ${(result.blockers || []).join(", ") || "exact evidence incomplete"}`);
      window.location.reload();
    } catch (error) {
      setState("FAILED");
      setMessage(error instanceof Error ? error.message : "Paid audio dispatch authorization failed");
    }
  }

  return <div className="qaAction">
    <button type="button" onClick={authorize} disabled={state === "RUNNING"}>
      {state === "RUNNING" ? "Refreshing entitlement evidence…" : "Authorize one bounded audio dispatch"}
    </button>
    <span>Rechecks the paid plan, exact voice/model and official commercial rights, then authorizes one dispatch for 15 minutes. This action makes 0 synthesis calls and spends $0.</span>
    {state === "FAILED" && <code>{message}</code>}
  </div>;
}

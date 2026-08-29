"use client";

import { useState } from "react";

export function AudioRouteReservationControl() {
  const [state, setState] = useState<"IDLE" | "RUNNING" | "FAILED">("IDLE");
  const [message, setMessage] = useState("");

  async function plan() {
    setState("RUNNING");
    setMessage("");
    try {
      const evaluatedAt = new Date().toISOString();
      const response = await fetch("/api/factory/runtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "PLAN_ASSURANCE_AUDIO_ROUTE_RESERVATION",
          idempotencyKey: `assurance-audio-route-reservation-${evaluatedAt.replace(/[^0-9]/g, "")}`,
          evaluatedAt,
          providerRequests: 0,
          spendUsd: 0,
        }),
      });
      const result = await response.json() as { planState?: string; blockers?: string[]; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "Canonical audio route planning failed");
      if (result.planState !== "PLANNED") throw new Error(`Route planning blocked: ${(result.blockers || []).join(", ") || "exact evidence incomplete"}`);
      window.location.reload();
    } catch (error) {
      setState("FAILED");
      setMessage(error instanceof Error ? error.message : "Canonical audio route planning failed");
    }
  }

  return <div className="qaAction">
    <button type="button" onClick={plan} disabled={state === "RUNNING"}>
      {state === "RUNNING" ? "Freezing canonical plan…" : "Plan and reserve exact audio route"}
    </button>
    <span>Creates one canonical PLAN_ONLY request, one zero-dispatch route and one exact 2-request / $0.08 reservation; 0 synthesis calls and $0 actual spend.</span>
    {state === "FAILED" && <code>{message}</code>}
  </div>;
}

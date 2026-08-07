"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type DriveStatus = {
  provider: string;
  priority: string;
  configuration: {
    ready: boolean;
    keys: Record<string, boolean>;
  };
  callbackUrl: string;
  connected: boolean;
  status: string;
  scope: string;
  rootFolder: null | { id: string; name: string; url: string };
  lastVerifiedAt: string | null;
  lastError: string | null;
  localSync: { requiredForProduction: boolean; status: string };
};

function readable(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export default function StorageSettingsPage() {
  const [data, setData] = useState<DriveStatus | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/factory/storage/google-drive", { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const payload = await response.json() as DriveStatus & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Storage settings could not load");
    setData(payload);
    const params = new URLSearchParams(window.location.search);
    if (params.get("drive") === "error") setError(params.get("reason") || "Google Drive authorization failed");
    else if (params.get("drive") === "connected") setError(null);
  }, []);

  useEffect(() => {
    const request = window.setTimeout(() => void load().catch((reason: Error) => setError(reason.message)), 0);
    return () => window.clearTimeout(request);
  }, [load]);

  async function run(action: "VERIFY" | "DISCONNECT") {
    if (action === "DISCONNECT" && !window.confirm("Disconnect Google Drive and lock V7 production until it is re-authorized? Stored Drive files will not be deleted.")) return;
    setWorking(action);
    setError(null);
    try {
      const response = await fetch("/api/factory/storage/google-drive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as DriveStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Storage action failed");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Storage action failed");
    } finally {
      setWorking(null);
    }
  }

  const configuredCount = useMemo(() => data ? Object.values(data.configuration.keys).filter(Boolean).length : 0, [data]);

  if (!data) return <main className="storageLoading"><span>G</span><h1>Reading Google Drive storage controls…</h1>{error && <p>{error}</p>}</main>;

  return <main className="storageShell">
    <header className="storageTopbar">
      <div><Link href="/settings">← Factory connections</Link><p>PRODUCTION V7 · WAVE 1.1</p><h1>Google Drive–first storage</h1></div>
      <div><span className={`storageState ${data.connected ? "verified" : "blocked"}`}>{readable(data.status)}</span><Link className="storageOutline" href="/control-plane">V7 Control Plane</Link></div>
    </header>

    {error && <section className="storageAlert" role="alert"><strong>Connection stopped</strong><p>{error}</p></section>}

    <section className="storageHero">
      <div><p>CANONICAL ARCHIVE POLICY</p><h2>Your Google Drive owns the durable production archive.</h2><span>R2 accelerates ingestion and rendering. D1 proves identity and lineage. Google Drive retains verified production files under your control. Local Sync is optional.</span></div>
      <aside><small>PROTECTED VALUES</small><strong>{configuredCount}/3</strong><span>{data.configuration.ready ? "Ready for authorization" : "Configuration required"}</span></aside>
    </section>

    <section className="storageFlow" aria-label="Storage architecture">
      <article><span>01</span><small>RUNTIME</small><strong>R2 staging</strong><p>Fast uploads, processing and render inputs.</p><b>CONNECTED</b></article>
      <i>→</i>
      <article className="primary"><span>02</span><small>CANONICAL</small><strong>Google Drive</strong><p>Durable archive, recovery and ownership.</p><b>{data.connected ? "VERIFIED" : "REQUIRED"}</b></article>
      <i>→</i>
      <article><span>03</span><small>EDITING MIRROR</small><strong>Local Sync</strong><p>Optional external-editor handoff.</p><b>OPTIONAL</b></article>
    </section>

    <div className="storageColumns">
      <section className="storagePanel">
        <header><div><p>SERVER CONFIGURATION</p><h2>Protected OAuth values</h2></div><span>{configuredCount}/3 ready</span></header>
        <div className="storageKeyList">
          {Object.entries(data.configuration.keys).map(([name, ready]) => <article key={name}><span className={ready ? "ok" : "missing"}>{ready ? "✓" : "!"}</span><div><strong>{name}</strong><small>{ready ? "Protected value available" : "Add to the GPT Site protected environment"}</small></div><b>{ready ? "READY" : "MISSING"}</b></article>)}
        </div>
        <div className="storageCallback"><small>AUTHORIZED REDIRECT URI</small><code>{data.callbackUrl}</code><button onClick={() => navigator.clipboard.writeText(data.callbackUrl).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</button></div>
        <p className="storageHelp">Create one Google Cloud Web OAuth client, enable Google Drive API, use the redirect URI above, and keep the app in Testing while you are the only user. GOOGLE_DRIVE_TOKEN_KEY must be a random 64-character hexadecimal value (32 bytes).</p>
        <div className="storageLinks"><a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noreferrer">Enable Drive API ↗</a><a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noreferrer">OAuth clients ↗</a></div>
      </section>

      <section className="storagePanel connectionPanel">
        <header><div><p>USER AUTHORIZATION</p><h2>Canonical archive connection</h2></div><span className={data.connected ? "pass" : "pending"}>{data.connected ? "VERIFIED" : "WAITING"}</span></header>
        {!data.connected ? <>
          <div className="storageConsent"><span>G</span><div><strong>File-scoped Google Drive access</strong><p>Factory requests only <code>drive.file</code>. It can manage files it creates or files you explicitly share with it—not your whole Drive.</p></div></div>
          <button className="storagePrimary" disabled={!data.configuration.ready || working !== null} onClick={() => window.location.assign("/api/factory/storage/google-drive?action=connect")}>{data.configuration.ready ? "Connect Google Drive" : "Complete protected configuration first"}</button>
        </> : <>
          <div className="driveRoot"><span>✓</span><div><small>CANONICAL ROOT</small><strong>{data.rootFolder?.name}</strong><p>Last verified {data.lastVerifiedAt ? new Date(data.lastVerifiedAt).toLocaleString() : "—"}</p></div></div>
          <a className="storagePrimary link" href={data.rootFolder?.url} target="_blank" rel="noreferrer">Open archive folder ↗</a>
          <div className="storageButtonRow"><button disabled={working !== null} onClick={() => void run("VERIFY")}>{working === "VERIFY" ? "Running round-trip audit…" : "Verify read/write again"}</button><button className="danger" disabled={working !== null} onClick={() => void run("DISCONNECT")}>Disconnect</button></div>
        </>}
      </section>
    </div>

    <section className="storagePanel folderContract">
      <header><div><p>AUTOMATIC MATERIALIZATION</p><h2>Folder contract created after authorization</h2></div><span>7 controlled roots</span></header>
      <div>{["Channels", "Reusable Library", "Rights & Licenses", "Masters", "Publishing Packages", "Audit & Recovery"].map((folder, index) => <article key={folder}><span>{String(index + 1).padStart(2, "0")}</span><strong>{folder}</strong></article>)}</div>
      <footer><strong>Verification proof</strong><span>OAuth refresh → root read → audit marker write → marker read-back → D1 evidence → V7 storage gate</span></footer>
    </section>

    <section className="localOptional">
      <div><p>LOCAL SYNC POLICY</p><h2>Optional, not a Wave 2 blocker</h2><span>The desktop agent will be implemented later for Premiere, DaVinci and CapCut handoff. Google Drive remains the durable source of truth.</span></div><b>OPTIONAL</b>
    </section>

    <footer className="storageFooter"><Link href="/settings">← All Factory connections</Link><Link href="/control-plane">Run Foundation Audit after Drive verifies →</Link></footer>
  </main>;
}

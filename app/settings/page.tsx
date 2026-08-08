"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Connection = {
  id: string; name: string; group: "AI_GENERATION" | "VOICE_SOUND" | "MEDIA_SOURCING" | "MEDIA_EXECUTION" | "STORAGE_LIBRARY" | "DISTRIBUTION_ANALYTICS";
  status: "CONNECTED" | "KEY_REQUIRED" | "CONFIG_REQUIRED" | "OAUTH_SETUP" | "BLOCKED";
  capability: string; requiredKeys: string[]; securityModel: string; nextAction: string;
};

type FactoryConnections = {
  scope: "FACTORY"; connections: Connection[];
  summary: { total: number; connected: number; attention: number };
  policy: { secretStorage: string; projectInheritance: string; browserExposure: string; rightsGate: string };
};

const groupMeta: Record<Connection["group"], { title: string; description: string }> = {
  AI_GENERATION: { title: "AI & generation", description: "Intelligence, writing, critics and generative adapters" },
  VOICE_SOUND: { title: "Voice & sound", description: "Narrator identity, speech production and audio QA" },
  MEDIA_SOURCING: { title: "Media sourcing", description: "Free and paid footage, images and rights evidence" },
  MEDIA_EXECUTION: { title: "Media execution", description: "Deterministic video probing, frame extraction and render workers" },
  STORAGE_LIBRARY: { title: "Storage & personal library", description: "Factory records, private media and user-selected cloud files" },
  DISTRIBUTION_ANALYTICS: { title: "Distribution & analytics", description: "YouTube discovery, publishing, measurement and learning" },
};

function LogoMark() { return <span className="logoMark" aria-hidden="true"><span /><span /><span /></span>; }

export default function FactorySettings() {
  const [data, setData] = useState<FactoryConnections | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, { status: string; latencyMs: number; message: string }>>({});

  const load = useCallback(async () => {
    const response = await fetch("/api/factory/connections", { signal: AbortSignal.timeout(15000) });
    const payload = await response.json().catch(() => ({})) as FactoryConnections & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Factory connections could not be loaded");
    setData(payload); setError(null);
  }, []);

  useEffect(() => { load().catch((caught: Error) => setError(caught.message)); }, [load]);

  const grouped = useMemo(() => data ? (Object.keys(groupMeta) as Connection["group"][]).map((group) => ({ group, ...groupMeta[group], items: data.connections.filter((connection) => connection.group === group) })) : [], [data]);

  async function testConnection(id: string) {
    setTesting(id);
    try {
      const response = await fetch(`/api/factory/connections?test=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
      const payload = await response.json().catch(() => ({})) as { status?: string; latencyMs?: number; message?: string };
      if (!response.ok) throw new Error(payload.message || "Connection test failed");
      setTests((current) => ({ ...current, [id]: { status: payload.status || "FAILED", latencyMs: payload.latencyMs || 0, message: payload.message || "No response" } }));
    } catch (caught) { setTests((current) => ({ ...current, [id]: { status: "FAILED", latencyMs: 0, message: caught instanceof Error ? caught.message : "Connection test failed" } })); }
    finally { setTesting(null); }
  }

  return <main className="appShell factorySettingsShell">
    <aside className="sidebar">
      <Link className="brand" href="/"><LogoMark /><div><strong>Frameflow</strong><span>YouTube operations</span></div></Link>
      <nav aria-label="Primary navigation">
        <Link className="navItem" href="/"><span>⌁</span>Command center</Link>
        <span className="navItem muted"><span>◫</span>Market radar</span>
        <span className="navItem muted"><span>◇</span>Topic backlog</span>
        <span className="navItem muted"><span>▦</span>Content calendar</span>
        <Link className="navItem" href="/"><span>▶</span>Video projects</Link>
        <span className="navItem muted"><span>⌁</span>Analytics</span>
      </nav>
      <div className="sidebarBottom"><div className="channelBadge"><span className="channelAvatar">HS</span><div><strong>Hidden Systems</strong><span>Behind Money · US</span></div></div><Link className="navItem active" href="/settings"><span>⚙</span>Factory settings</Link></div>
    </aside>

    <section className="workspace factorySettingsWorkspace">
      <header className="factorySettingsHeader"><div><p className="eyebrow">FACTORY CONTROL PLANE</p><h1>Factory Connections</h1><p>Configure every external provider once. All video projects inherit connection status without receiving or storing provider secrets.</p></div><Link href="/">← Command center</Link></header>
      {error && <section className="factoryConnectionError"><strong>Connections could not load</strong><p>{error}</p><button onClick={() => load().catch((caught: Error) => setError(caught.message))}>Try again</button></section>}
      {!data && !error && <section className="voiceLoading"><span>◌</span><p>Reading protected factory connections…</p></section>}
      {data && <>
        <section className="factoryConnectionSummary">
          <div><small>Configuration scope</small><strong>Factory-wide</strong><span>Shared across every channel and project</span></div>
          <div><small>Operational</small><strong>{data.summary.connected}/{data.summary.total}</strong><span>Server-side connections available</span></div>
          <div><small>Need attention</small><strong>{data.summary.attention}</strong><span>Key, OAuth or provider setup required</span></div>
          <div><small>Secret exposure</small><strong>0</strong><span>No API secret is returned to the browser</span></div>
        </section>
        <section className="factorySecurityContract"><div><span>SECURITY CONTRACT</span><strong>One protected configuration layer</strong><p>Provider credentials live in protected production environment settings. Projects receive capabilities and health status only.</p></div><ul><li>Server-side adapters only</li><li>Read-only project inheritance</li><li>Per-asset rights gate remains mandatory</li></ul></section>
        <div className="factoryConnectionGroups">{grouped.map(({ group, title, description, items }) => <section key={group} className="factoryConnectionGroup">
          <header><div><p className="eyebrow">{group.replaceAll("_", " ")}</p><h2>{title}</h2></div><span>{items.filter((item) => item.status === "CONNECTED").length}/{items.length} connected</span><p>{description}</p></header>
          <div>{items.map((connection) => { const test = tests[connection.id]; const status = test?.status || connection.status; return <article key={connection.id}>
            <div className="factoryConnectionIdentity"><span>{connection.name.slice(0, 1)}</span><div><strong>{connection.name}</strong><em className={status.toLowerCase()}>{status.replaceAll("_", " ")}</em></div></div>
            <p>{connection.capability}</p>
            <div className="factoryConnectionKeys"><small>PROTECTED CONFIGURATION</small>{connection.requiredKeys.length ? connection.requiredKeys.map((key) => <code key={key}>{key}</code>) : <code>NO SECRET REQUIRED</code>}</div>
            <div className="factoryConnectionSecurity"><small>{connection.securityModel}</small><span>{test ? `${test.message}${test.latencyMs ? ` · ${test.latencyMs}ms` : ""}` : connection.nextAction}</span></div>
            {connection.id === "google_drive" ? <Link className="factoryManageLink" href="/settings/storage">Open Drive setup</Link> : <button disabled={testing === connection.id} onClick={() => testConnection(connection.id)}>{testing === connection.id ? "Testing…" : "Test connection"}</button>}
          </article>; })}</div>
        </section>)}</div>
        <section className="factoryConnectionNext"><div><span>NEXT CONFIGURATION ORDER</span><strong>Free media first, then distribution</strong></div><ol><li><b>1</b>Pexels + Pixabay</li><li><b>2</b>Shutterstock</li><li><b>3</b>Google Drive OAuth</li><li><b>4</b>YouTube publishing + analytics</li></ol></section>
      </>}
    </section>
  </main>;
}

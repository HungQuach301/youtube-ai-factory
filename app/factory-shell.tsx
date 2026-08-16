import Link from "next/link";
import type { ReactNode } from "react";

type Surface = "portfolio" | "intelligence" | "niches" | "studio" | "production" | "continuity";

function Mark() {
  return <span className="pfMark" aria-hidden="true"><i /><i /><i /></span>;
}

export function FactoryShell({ children, active = "portfolio" }: { children: ReactNode; active?: Surface }) {
  const navigation: Array<[Surface, string, string]> = [
    ["portfolio", "01", "Portfolio"],
    ["intelligence", "02", "Intelligence"],
    ["niches", "03", "Niche discovery"],
    ["studio", "04", "Channel studio"],
    ["production", "05", "Video engine"],
    ["continuity", "06", "Continuity"],
  ];
  const href: Record<Surface, string> = {
    portfolio: "/",
    intelligence: "/market-intelligence",
    niches: "/niche-discovery",
    studio: "/channel-studio",
    production: "/video-engine",
    continuity: "/continuity",
  };
  return <>
    <a className="pfSkipLink" href="#main-content">Skip to main content</a>
    <div className="pfShell">
    <aside className="pfSidebar">
      <Link className="pfBrand" href="/"><Mark /><span><strong>AI Factory</strong><small>Multi-channel operations</small></span></Link>
      <nav aria-label="Factory navigation">
        {navigation.map(([key, number, label]) => <Link key={key} aria-current={active === key ? "page" : undefined} className={active === key ? "active" : ""} href={href[key]}><span>{number}</span>{label}</Link>)}
      </nav>
      <div className="pfSidebarFoot"><div><i />Read-only projection</div><Link href="/settings">Factory settings →</Link></div>
    </aside>
    <main className="pfWorkspace" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  </>;
}

export function ProjectionState({ loading, error, data, label = "canonical state" }: { loading: boolean; error: string | null; data: unknown; label?: string }) {
  if (error) return <section className="pfFailure" role="alert"><small>PROJECTION UNAVAILABLE</small><h1>Canonical state could not load.</h1><p>{error}</p><span>No demo or local fallback was substituted.</span></section>;
  if (loading || !data) return <section className="pfLoading" role="status" aria-live="polite" aria-busy="true"><h1 className="pfSrOnly">{label}</h1><i aria-hidden="true" /><span>Loading {label}…</span></section>;
  return null;
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={`pfPill ${tone}`}>{children}</span>;
}

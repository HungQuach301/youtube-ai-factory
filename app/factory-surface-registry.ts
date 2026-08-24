export const CANONICAL_FACTORY_SURFACES = [
  { key: "portfolio", number: "01", label: "Portfolio", href: "/" },
  { key: "intelligence", number: "02", label: "Intelligence", href: "/market-intelligence" },
  { key: "niches", number: "03", label: "Niche discovery", href: "/niche-discovery" },
  { key: "studio", number: "04", label: "Channel studio", href: "/channel-studio" },
  { key: "production", number: "05", label: "Video engine", href: "/video-engine" },
  { key: "continuity", number: "06", label: "Continuity", href: "/continuity" },
] as const;

export type CanonicalFactorySurface = (typeof CANONICAL_FACTORY_SURFACES)[number]["key"];

export const CANONICAL_PRODUCTION_SURFACES = {
  operator: "/video-engine",
  materials: "/video-engine/audience-golden",
} as const;

export const COMPATIBILITY_PRODUCTION_SURFACES = [
  "/control-plane",
  "/intelligence",
  "/creative-contract",
  "/story-architecture",
  "/script-development",
  "/production-design",
  "/shot-orchestration",
  "/material-production",
] as const;

export const PROJECTION_AUTHORITY = {
  canonical: "CANONICAL_OPERATING_PROJECTION",
  compatibility: "HISTORICAL_COMPATIBILITY_EVIDENCE_ONLY",
} as const;

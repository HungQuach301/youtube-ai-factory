import { Suspense } from "react";
import { NichePortfolioView } from "../niche-portfolio-view";
import { FactoryShell, ProjectionState } from "../factory-shell";

export default function NicheDiscoveryPage() {
  return <Suspense fallback={<FactoryShell active="niches"><ProjectionState loading error={null} data={null} label="niche opportunity portfolio" /></FactoryShell>}><NichePortfolioView /></Suspense>;
}

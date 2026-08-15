import { Suspense } from "react";
import { DiscoveryView } from "../discovery-view";
import { FactoryShell, ProjectionState } from "../factory-shell";

export default function MarketIntelligencePage() { return <Suspense fallback={<FactoryShell active="intelligence"><ProjectionState loading error={null} data={null} label="market intelligence" /></FactoryShell>}><DiscoveryView mode="intelligence" /></Suspense>; }

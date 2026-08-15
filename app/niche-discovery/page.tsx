import { Suspense } from "react";
import { DiscoveryView } from "../discovery-view";
import { FactoryShell, ProjectionState } from "../factory-shell";

export default function NicheDiscoveryPage() { return <Suspense fallback={<FactoryShell active="niches"><ProjectionState loading error={null} data={null} label="niche candidates" /></FactoryShell>}><DiscoveryView mode="niches" /></Suspense>; }

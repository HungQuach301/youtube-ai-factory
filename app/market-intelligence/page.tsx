import { Suspense } from "react";
import { DiscoveryView } from "../discovery-view";

export default function MarketIntelligencePage() { return <Suspense fallback={null}><DiscoveryView mode="intelligence" /></Suspense>; }

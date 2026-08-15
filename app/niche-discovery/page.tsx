import { Suspense } from "react";
import { DiscoveryView } from "../discovery-view";

export default function NicheDiscoveryPage() { return <Suspense fallback={null}><DiscoveryView mode="niches" /></Suspense>; }

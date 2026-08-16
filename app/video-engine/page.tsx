import { FactoryShell, ProjectionState } from "@/app/factory-shell";
import { productionV2Projection, type ProductionV2DB } from "@/lib/production-v2-projection";
import { ProductionEngineWorkspace } from "./production-engine-workspace";

export const dynamic = "force-dynamic";

type RuntimeEnv = { DB?: ProductionV2DB };
export default async function VideoEnginePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  try {
    const { env } = await import("cloudflare:workers") as unknown as { env: RuntimeEnv };
    if (!env.DB) throw new Error("Canonical database binding is unavailable");
    const [{ view }, data] = await Promise.all([searchParams, productionV2Projection("channel-hidden-systems", env.DB)]);
    return <FactoryShell active="production"><ProductionEngineWorkspace data={data} view={view} /></FactoryShell>;
  } catch (error) {
    return <FactoryShell active="production"><ProjectionState loading={false} error={error instanceof Error ? error.message : "Production state unavailable"} data={null} label="Production Engine" /></FactoryShell>;
  }
}

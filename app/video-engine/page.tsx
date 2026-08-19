import { FactoryShell, ProjectionState } from "@/app/factory-shell";
import { sequentialProductionProjection, type SequentialProductionDB } from "@/lib/sequential-production-projection";
import { ProductionEngineWorkspace } from "./production-engine-workspace";

export const dynamic = "force-dynamic";

type RuntimeEnv = { DB?: SequentialProductionDB };
export default async function VideoEnginePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  let data: Awaited<ReturnType<typeof sequentialProductionProjection>> | null = null;
  let errorMessage: string | null = null;
  try {
    const { env } = await import("cloudflare:workers") as unknown as { env: RuntimeEnv };
    if (!env.DB) throw new Error("Canonical database binding is unavailable");
    data = await sequentialProductionProjection("channel-hidden-systems", env.DB);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Production state unavailable";
  }
  return <FactoryShell active="production" mode="operator">{data ? <ProductionEngineWorkspace data={data} view={view} /> : <ProjectionState loading={false} error={errorMessage || "Production state unavailable"} data={null} label="Production Engine" />}</FactoryShell>;
}

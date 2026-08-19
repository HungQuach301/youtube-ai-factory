import { FactoryShell, ProjectionState } from "@/app/factory-shell";
import { sequentialProductionProjection, type SequentialProductionDB } from "@/lib/sequential-production-projection";
import { ProductionEngineWorkspace } from "./production-engine-workspace";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type RuntimeEnv = { DB?: SequentialProductionDB };
async function ProductionProjection({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
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
  return data ? <ProductionEngineWorkspace data={data} view={view} /> : <ProjectionState loading={false} error={errorMessage || "Production state unavailable"} data={null} label="Production Engine" />;
}

export default function VideoEnginePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <FactoryShell active="production" mode="operator"><Suspense fallback={<ProjectionState loading error={null} data={null} label="Production Engine" />}><ProductionProjection searchParams={searchParams} /></Suspense></FactoryShell>;
}

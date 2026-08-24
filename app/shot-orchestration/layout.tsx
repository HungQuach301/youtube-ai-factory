import type { ReactNode } from "react";
import { ProjectionBoundaryNotice } from "@/app/projection-boundary-notice";

export default function ShotOrchestrationCompatibilityLayout({ children }: { children: ReactNode }) {
  return <><ProjectionBoundaryNotice surface="V7 Shot Orchestration" />{children}</>;
}

import type { ReactNode } from "react";
import { ProjectionBoundaryNotice } from "@/app/projection-boundary-notice";

export default function ScriptDevelopmentCompatibilityLayout({ children }: { children: ReactNode }) {
  return <><ProjectionBoundaryNotice surface="V7 Script Development" />{children}</>;
}

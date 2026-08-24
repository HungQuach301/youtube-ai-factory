import type { ReactNode } from "react";
import { ProjectionBoundaryNotice } from "@/app/projection-boundary-notice";

export default function ProductionDesignCompatibilityLayout({ children }: { children: ReactNode }) {
  return <><ProjectionBoundaryNotice surface="V7 Production Design" />{children}</>;
}

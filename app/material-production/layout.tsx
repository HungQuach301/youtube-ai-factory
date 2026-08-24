import type { ReactNode } from "react";
import { ProjectionBoundaryNotice } from "@/app/projection-boundary-notice";
export default function Layout({ children }: { children: ReactNode }) { return <><ProjectionBoundaryNotice surface="V23 Material Production" />{children}</>; }

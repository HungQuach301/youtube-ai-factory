import Link from "next/link";
import { CANONICAL_PRODUCTION_SURFACES, PROJECTION_AUTHORITY } from "./factory-surface-registry";

export function ProjectionBoundaryNotice({ surface }: { surface: string }) {
  return <aside className="projectionBoundaryNotice" data-projection-authority={PROJECTION_AUTHORITY.compatibility} role="note">
    <div><strong>Compatibility evidence · not current operating state</strong><span>{surface} preserves historical V7/V23 evidence. Current video state, Golden materials and release eligibility are projected only by the canonical Video Engine.</span></div>
    <Link href={CANONICAL_PRODUCTION_SURFACES.operator}>Open canonical Video Engine →</Link>
  </aside>;
}

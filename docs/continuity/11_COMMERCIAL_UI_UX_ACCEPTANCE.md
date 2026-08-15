# Commercial UI/UX Acceptance — Multi-Channel Slices

**Acceptance contract:** Document 27  
**Run date:** 2026-08-15 (Asia/Bangkok)  
**Source baseline:** Sites v289 / `87dae74fffc9d7388152e532efcbae6387cdaed5`  
**Status:** `COMMERCIAL_UI_REVIEW_PENDING`  
**Deployment:** not deployed

## Scope

1. Canonical Shell / Portfolio.
2. Channel Detail.
3. Market Intelligence and Niche Discovery.
4. Channel Studio.

The protected V7/V23 Video Production Engine was not redesigned and no command authority was added.

## Repairs completed

- Added a keyboard-visible skip link and one explicit `main` landmark.
- Added `aria-current="page"` to the active factory navigation item.
- Replaced blank Suspense fallbacks with named, live loading states.
- Marked loading states with `role="status"`, `aria-live` and `aria-busy`.
- Added an accessible name and numeric value to channel progress indicators.
- Added high-visibility `:focus-visible` treatment and minimum 44 px interactive targets.
- Raised dense 6–10 px operational typography to commercially legible sizes on accepted slices.
- Added mobile reflow for score grids, identity cards, table rows and status pills.
- Added `prefers-reduced-motion` and forced-colors accommodations.
- Preserved truthful read-only, compatibility, expert-gate and fail-closed authority states.

## Evidence passed

- Targeted ESLint on changed TypeScript/TSX: pass.
- Async API error boundaries: 29/29.
- Production build: pass.
- Sites artifact validation: pass.
- Full regression suite: 95/95.
- Built-worker SSR checks: HTTP 200; skip link, main landmark, current-page state and assistive loading state present.
- Blank Suspense fallback scan across Intelligence, Niche Discovery and Channel Studio: zero.
- Largest shared client CSS: 291,305 bytes raw / 52,988 bytes gzip.
- Largest page JavaScript chunk: 201,125 bytes raw / 46,326 bytes gzip.

## Evidence not yet available

The supervised preview was healthy, but the cloud-browser navigation timed out on both bounded attempts. This was classified as preview/browser infrastructure failure, not a verified Site defect. Therefore the following gates remain open:

- desktop, tablet and mobile screenshot comparison;
- visual overflow and zoom/reflow inspection in a rendered browser;
- end-to-end keyboard traversal and visible-focus sequence;
- automated accessibility scan and sampled screen-reader journey;
- lab LCP, INP and CLS measurement;
- field Core Web Vitals telemetry.

Artifact size is diagnostic evidence only. It is not a substitute for runtime performance measurement. No field-performance or commercial-ready claim is authorized.

## Acceptance matrix

| Surface | Semantic/static gate | Build/regression gate | Rendered visual/interaction gate |
|---|---|---|---|
| Shell / Portfolio | Pass | Pass | Pending |
| Channel Detail | Pass | Pass | Pending |
| Market Intelligence | Pass | Pass | Pending |
| Niche Discovery | Pass | Pass | Pending |
| Channel Studio | Pass | Pass | Pending |

Recovery behavior remains fail-closed: projection failures expose canonical-state unavailability and explicitly state that no demo/local fallback was substituted.

## Exact next action

When the approved preview/browser surface is reachable, resume Document 27 at the rendered evidence gates only. Test desktop, tablet and mobile; primary and recovery journeys; keyboard/focus; zoom/reflow; automated accessibility; sampled assistive technology; and lab performance. Repair only evidenced source defects, then rerun 29 boundaries, build/artifact validation and 95 tests.

## Protected scope

- No deploy, production/database mutation, provider request or dispatch.
- No production QA, migration, delete or command-authority expansion.
- Do not rerun already-passed semantic/static acceptance unless source changes.
- Do not claim commercial readiness while `COMMERCIAL_UI_REVIEW_PENDING` remains open.

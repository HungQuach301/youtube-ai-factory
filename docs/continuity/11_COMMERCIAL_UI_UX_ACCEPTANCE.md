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
- Preserved one screen-reader-visible H1 in the initial loading shell.
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
- User manual confirmation on 2026-08-15: responsive behavior is present.
- Commercial UI static contract: 14/14 automated checks; enforced by every verified build.
- Commercial client artifact budgets: pass; enforced by every verified build.
- Built-worker rendered contract: 4/4 commercial page routes return HTTP 200 HTML with language, title, one main landmark, skip-link target, one active navigation item, H1, assistive loading state, no positive tabindex and no duplicate IDs.
- Fail-closed recovery contract: 4/4 canonical APIs return HTTP 503 JSON, `no-store`, `fallback: false` and an explicit reason when canonical bindings are unavailable.
- Lab server-render budget: pass; slowest route `/` at 75.6 ms / 500 ms.
- Blank Suspense fallback scan across Intelligence, Niche Discovery and Channel Studio: zero.
- Largest shared client CSS: 52,973 bytes gzip / 60,000 budget.
- Largest page JavaScript chunk: 46,387 bytes gzip / 50,000 budget.
- Total client JavaScript and CSS: 283,383 bytes gzip / 300,000 budget.

## Evidence not yet available

The supervised preview was healthy, but the cloud-browser navigation timed out on the bounded attempts. This was classified as preview/browser infrastructure failure, not a verified Site defect. The user subsequently confirmed responsive behavior manually. The following gates remain open:

- screenshot-based visual regression evidence;
- zoom/reflow inspection in a rendered browser;
- end-to-end keyboard traversal and visible-focus sequence;
- automated accessibility scan and sampled screen-reader journey;
- lab LCP, INP and CLS measurement;
- field Core Web Vitals telemetry.

The initial server-rendered loading journey and missing-binding recovery APIs are now covered automatically. A hydrated primary journey backed by canonical data, browser interaction and visual output remains pending.

Artifact budgets prevent client-size regression but do not substitute for runtime performance measurement. No field-performance or commercial-ready claim is authorized.

## Acceptance matrix

| Surface | Semantic/static gate | Build/regression gate | Rendered visual/interaction gate |
|---|---|---|---|
| Shell / Portfolio | Pass, including loading SSR | Pass | Responsive pass; hydrated interaction evidence pending |
| Channel Detail | Pass | Pass | Responsive pass; canonical-data interaction evidence pending |
| Market Intelligence | Pass, including loading SSR | Pass | Responsive pass; hydrated interaction evidence pending |
| Niche Discovery | Pass, including loading SSR | Pass | Responsive pass; hydrated interaction evidence pending |
| Channel Studio | Pass, including loading SSR | Pass | Responsive pass; hydrated interaction evidence pending |

Recovery behavior remains fail-closed: projection failures expose canonical-state unavailability and explicitly state that no demo/local fallback was substituted.

## Exact next action

When the approved preview/browser surface is reachable, resume Document 27 at the remaining browser evidence gates only. Test a hydrated canonical-data primary journey, browser recovery presentation, keyboard/focus, zoom/reflow, automated accessibility, sampled assistive technology, screenshot regression and Web Vitals. Do not repeat responsive verification unless responsive source changes. Repair only evidenced source defects, then rerun 29 boundaries, the 14-point commercial UI contract, rendered contract, build/artifact/performance budgets and 95 tests.

## Protected scope

- No deploy, production/database mutation, provider request or dispatch.
- No production QA, migration, delete or command-authority expansion.
- Do not rerun already-passed semantic/static acceptance unless source changes.
- Do not claim commercial readiness while `COMMERCIAL_UI_REVIEW_PENDING` remains open.

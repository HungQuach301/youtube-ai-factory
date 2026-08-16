# Commercial UI/UX Acceptance — Multi-Channel Slices

**Acceptance contract:** Document 27  
**Run date:** 2026-08-15 (Asia/Bangkok)  
**Source baseline:** Sites v289 / `87dae74fffc9d7388152e532efcbae6387cdaed5`  
**Status:** `SUPERSEDED_FOR_INTELLIGENCE_NICHE_BY_DOCUMENT_26`
**Deployment:** Sites v293 / `f61dc062617ab7107a5de5cd9e900c09d35220ae` / succeeded

## Scope

This is the original site-wide baseline across multiple surfaces. Document 26 is authoritative for the later, scoped Intelligence–Niche production FE closure. That closure does not assert site-wide commercial readiness for unrelated Portfolio, Channel Detail or production-engine journeys.

1. Canonical Shell / Portfolio.
2. Channel Detail.
3. Market Intelligence and Niche Discovery.
4. Channel Studio.

The protected V7/V23 Video Production Engine was not redesigned. The only added authority is the zero-spend, SIWC-authenticated niche expert-decision command.

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
- Replaced divergent candidate/workflow readiness labels with one authoritative seven-criterion evidence assessment and visible typed gaps.

## Evidence passed

- Targeted ESLint on changed TypeScript/TSX: pass.
- Async API error boundaries: 31/31.
- Production build: pass.
- Sites artifact validation: pass.
- Full regression suite: 95/95.
- User manual confirmation on 2026-08-15: responsive behavior is present.
- Commercial UI static contract: 26/26 automated checks; enforced by every verified build.
- Canonical-data primary projection contract: pass for Portfolio, Channel Detail, Discovery and Channel Studio; enforced by every verified build.
- The primary projection gate verifies structured data mapping, missing-channel errors, recommendation versus expert-decision separation and blocked production command authority.
- Commercial client artifact budgets: pass; enforced by every verified build.
- Built-worker rendered contract: 4/4 commercial page routes return HTTP 200 HTML with language, title, one main landmark, skip-link target, one active navigation item, H1, assistive loading state, no positive tabindex and no duplicate IDs.
- Fail-closed recovery contract: 4/4 canonical APIs return HTTP 503 JSON, `no-store`, `fallback: false` and an explicit reason when canonical bindings are unavailable.
- SIWC command recovery contract: missing identity returns typed HTTP 401, `no-store`, provider requests `0` and spend USD `0`.
- Lab server-render budget: pass; slowest route `/` at 55.3 ms / 500 ms on the v291 checkpoint build.
- Blank Suspense fallback scan across Intelligence, Niche Discovery and Channel Studio: zero.
- Largest shared client CSS: 53,621 bytes gzip / 60,000 budget.
- Largest page JavaScript chunk: 46,388 bytes gzip / 50,000 budget.
- Total client JavaScript and CSS: 285,814 bytes gzip / 300,000 budget.

## Evidence not yet available

The supervised preview was reachable and the hydrated fail-closed canonical-D1 recovery surface rendered truthfully without demo fallback. Read-only production reconciliation showed that canonical channel data is currently `INSUFFICIENT_EVIDENCE`; therefore the decision form is not authorized to render and was not fabricated for visual acceptance. Document 15 records and repairs the previously divergent candidate/workflow labels. The user previously confirmed responsive behavior manually. The following gates remain open:

Production v293 exposes the exact result: 6/7 readiness criteria pass and `CONTRADICTIONS_REVIEWED` is the sole missing fact. Candidate labels now agree with the workflow and the downstream gate remains fail closed.

- screenshot-based visual regression evidence;
- zoom/reflow inspection in a rendered browser;
- end-to-end keyboard traversal and visible-focus sequence;
- automated accessibility scan and sampled screen-reader journey;
- lab LCP, INP and CLS measurement;
- field Core Web Vitals telemetry.

The initial server-rendered loading journey, canonical-data projection mapping and missing-binding recovery APIs are now covered automatically. Browser hydration, interaction and visual output remain pending.

Artifact budgets prevent client-size regression but do not substitute for runtime performance measurement. No field-performance or commercial-ready claim is authorized.

## Acceptance matrix

| Surface | Semantic/static gate | Build/regression gate | Rendered visual/interaction gate |
|---|---|---|---|
| Shell / Portfolio | Pass, including loading SSR and canonical projection | Pass | Responsive pass; browser hydration/interaction pending |
| Channel Detail | Pass, including canonical projection | Pass | Responsive pass; browser hydration/interaction pending |
| Market Intelligence | Pass, including loading SSR and canonical projection | Pass | Responsive pass; browser hydration/interaction pending |
| Niche Discovery | Pass, including loading SSR and canonical projection | Pass | Responsive pass; browser hydration/interaction pending |
| Channel Studio | Pass, including loading SSR and canonical projection | Pass | Responsive pass; browser hydration/interaction pending |

Recovery behavior remains fail-closed: projection failures expose canonical-state unavailability and explicitly state that no demo/local fallback was substituted.

## Exact next action

Niche Portfolio V2 Slice 2 now adds a commercial comparison matrix and expandable evidence dossiers under Document 17. Its static, build, render, performance and regression gates pass. The approved cloud-browser surface again timed out before reaching the healthy agent preview, so this does not close the existing browser/hydration, keyboard/assistive, visual-regression or Web Vitals evidence gaps.

Slice 3 adds the commercial expert-hypothesis form and a dedicated assumption-versus-evidence dossier under Document 18. Responsive/static/build/render/performance gates pass; the same browser-access timeout means interactive and assistive evidence remains open rather than inferred.

Reconcile the seven-criterion assessment in canonical production and resolve only the owning-stage evidence gap through a valid typed fact. Once canonical state authorizes the form, resume Document 27 at the remaining browser evidence gates: decision form, keyboard/focus, zoom/reflow, automated accessibility, sampled assistive technology, screenshot regression and Web Vitals. Do not fabricate demo data or weaken readiness thresholds.

## Protected scope

- No production command beyond the bounded expert-decision append; no provider request or dispatch.
- No production QA, additional migration, delete or command-authority expansion.
- Do not rerun already-passed semantic/static acceptance unless source changes.
- Do not use this historical gate to reopen the scoped Intelligence–Niche decision path accepted by Document 26. Any site-wide commercial-readiness claim for unrelated surfaces still requires its own current evidence.

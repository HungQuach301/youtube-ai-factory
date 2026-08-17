# YouTube AI Factory

This repository is the executable source for a multi-channel YouTube operating system. The product flow is:

`Market/User/Competitor Intelligence → Niche Discovery → Channel Strategy → Content System & Planning → Video Production Engine → Publishing/Distribution → Learning & Optimization → Portfolio Governance`

V7/V23 remains the protected Video Production Engine beneath this portfolio architecture; it is not the top-level product shell.

## Current implementation checkpoint

- Production functional baseline: the 15 Production Engine V2 masters were owner-rejected for perceived quality on 2026-08-16. The active replacement is the V7 → V23.4 → V281 sequential control: exactly one video may produce or spend at a time, and the next video remains blocked until the current master is owner-ready.
- Sequential implementation specification: Documents 30–31 define the 18-stage architecture, prior-work reconciliation, data eligibility, storage, stage techniques and tools. Document 34 is authoritative for Video Excellence, content-route playbooks and M0–M4 enforcement. The operator UI remains English-only for now; multilingual localization is deferred.
- Product slices: Intelligence–Niche and Channel Strategy are production-closed; Content System & Planning is production-active across all eight slices: authority, content system, backlog, editorial plan, brief compiler, orchestrator, production FE and production QA.
- Boundaries: all projections remain no-store/fail-closed with no demo fallback; activation is a separate zero-spend command that consumes only the latest active committed niche and never reruns or rewrites Slices 1–7.
- Decision authority: SIWC identity, server allowlist, idempotency, optimistic concurrency, append-only activation/audit/lineage. It creates the canonical Channel Strategy binding without mutating legacy `channels.niche` or any upstream decision fact.
- Verification: 40/40 async API boundaries, 69/69 commercial UI contracts, build/artifact/render/performance validation, 10/10 Niche V2 groups, 8 Intelligence/Niche lifecycle paths and 96/96 regressions.
- Readiness truth: candidate labels, workflow authority and decision-command visibility now share one seven-criterion evidence assessment with explicit typed gaps.
- Niche Portfolio V2 Slice 1: the executable contract now requires a comparable list of opportunities, symmetric system/expert hypothesis validation, independent Market Attractiveness / Ability to Win / Evidence Confidence axes, hard prerequisites and explicit Conditions to Win. All V2 commands remain unrouted and zero-spend.
- Niche Portfolio V2 Slice 2: `/niche-discovery` provides a side-by-side portfolio matrix and expandable market, audience, competitor, evidence and Conditions to Win dossiers. Missing V2 facts remain explicitly `Not recorded`; no legacy score is silently converted into a V2 axis.
- Niche Portfolio V2 Slice 3: an authorized expert can append a niche hypothesis with explicit rationale, audience/demand assumptions, known competitors and winning thesis. It enters the portfolio unranked and research-required; the command is identity-bound, versioned, idempotent, audited, zero-spend and cannot set priority, select, commit or activate Channel Strategy.
- Slice 3.1 identity repair: Niche Discovery now accepts only typed `NICHE_OPPORTUNITY` records. Legacy V1 video topics are excluded from niche ranking and preserved in Channel Studio/Content Planning with explicit provenance.
- Slice 4: every typed niche dossier owns an append-only evidence workspace for a balanced versioned research plan, a bounded `APPROVED_NOT_DISPATCHED` validation envelope and expert evidence review. System-discovered and expert-seeded niches share the same support/contradiction/unknown path. Slice 4 actual provider requests/spend remain zero and it cannot grant score, rank, priority, selection, commitment or activation.
- Slice 5: an authorized expert records a latest-evidence-bound assessment with independent Market Attractiveness, Ability to Win and Evidence Confidence, assessed prerequisites and winning criteria. The server computes sufficiency and ranks sufficient opportunities lexicographically without a total score. Expert priority, selection, commitment and Channel Strategy activation remain blocked for Slices 6–8.
- Slice 6: an authorized expert records one atomic, append-only ordering of every current comparable opportunity with portfolio and opportunity rationales. Each priority version binds the current program/evidence/scoring versions; changed Slice 5 facts make the set stale instead of rewriting it. System rank, axes, sufficiency and eligibility remain unchanged. Selection, commitment and Channel Strategy activation remain blocked for Slices 7–8.
- Slice 7: selection and commitment are separate append-only ledgers. Selection requires an active Slice 6 set and an eligible niche; commitment requires the latest active selection. Direct priority-to-commitment is forbidden. Upstream changes project governance facts as stale, and neither command mutates rank, evidence, eligibility, `channels.niche` or Channel Strategy.
- Slice 8: `ACTIVATE_CHANNEL_STRATEGY` appends a versioned binding only from the latest active commitment. It freezes commitment/selection/priority/program/evidence/scoring lineage, projects stale instead of rewriting history, and makes Channel Studio consume the active binding while preserving the legacy compatibility field.
- Product roadmap: Slices 4–8 are permanent product capabilities—Evidence Intelligence & Validation, Portfolio Comparison, Expert Prioritization, Niche Commitment & Governance, and Channel Strategy Activation—not one-time delivery tasks.
- Content Autopilot production state: `FULL_AUTOPILOT` policy v5, run v5, 4 pillars, 8 series, 8 opportunities, 15 editorial items and 15 production-ready briefs; exact cadence reconciliation passed with zero planning spend. Publishing remains closed.
- Production Engine V2 checkpoints 1–4 remain historical execution evidence only. Their 15 masters are now `REJECTED_QUALITY`, their artifacts and USD 79.28 ledger remain immutable, and none has publishing or reuse authority. Automatic publishing remains disabled.
- Video #1 quality correction: Stage 00–10 remain historically `FROZEN`, but Stage 11 is operationally paused by `VIDEO_PRODUCTION_QUALITY_STANDARD_V2`. The 84-shot revision covers only 0–600 seconds against 704.446958 seconds of narration; current motion/audio evidence is not yet Video Excellence eligible. No provider dispatch, stage reopen or production mutation is authorized by the documentation checkpoint.

Read `AGENTS.md`, `docs/continuity/09_CHAT_ROLLOVER_CAPSULE.md` and Documents 16–27 before continuing in a new chat.

## Runtime foundation

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

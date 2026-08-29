# Repository Agent Instructions

## Scope

- Repository: HungQuach301/youtube-ai-factory
- Production Site: youtube-ai-factory.quach-hung.chatgpt.site
- Excluded repository: HungQuach301/youtube-ai-factory-v2
- Never access, inspect, modify, synchronize, or infer from the excluded repository.

## Source of truth

- GitHub main is the sole code and documentation SSOT.
- Sites is a deployment target, not a source-authoring surface.
- Start every change from current GitHub main.
- Never copy a newer Sites source state back into GitHub except the explicitly
  authorized one-time M0-00 reconciliation.

## Work package contract

- One work package per branch and pull request.
- Branch names use wp/<id>-<slug>.
- Do not push directly to main.
- Read only the files needed for the current work package.
- Preserve existing architecture, package manager, lockfile, hosting manifest,
  D1/R2 binding names, and unrelated user changes.
- Do not create new documentation, migrations, gates, tables, or authorities
  unless the work package explicitly requires them.

## Required order

1. Read this file and the work package inputs.
2. Confirm protected scope and excluded repository.
3. Create a feature branch from current main.
4. Implement the smallest coherent change.
5. Run relevant focused tests, full tests, production build, and documentation checks.
6. Open a pull request and read GitHub Actions.
7. Repair the cause of failures; never weaken checks to obtain green.
8. Merge only after required checks pass.
9. Deploy the exact merged source tree to Sites.
10. Verify deployment status and runtime evidence.

## Security and authority

- Every route requires explicit application-layer authentication or an exact
  documented public allowlist entry.
- Write handlers require authorization in addition to authentication.
- An AGENT actor cannot execute CERTIFY, APPROVE, ACTIVATE, COMMIT, RELEASE,
  PUBLISH, or equivalent business-authority commands unless the work package
  supplies a separate owner-authorized command contract.
- Secrets belong only in Sites environment or approved GitHub Actions secrets.
- Never print, commit, document, upload, or persist secret values elsewhere.
- Provider calls and spend require typed requests, current entitlement,
  current rights, an active cost envelope, exact reservation, idempotency, and
  dispatch authority.

## Data and migrations

- Migrations are append-only and forward-only.
- Never rename, edit, delete, reorder, squash, or reuse identifiers of applied
  migrations in the canonical repository.
- Every mutation needs idempotency and read-back evidence.
- Code rollback is not a database rollback. Use a forward-fix plan when data or
  schema may already have changed.

## Completion

A work package is complete only when:

- the pull request is merged;
- required checks passed for the merged source;
- Sites deployed the matching source tree;
- production verification passed;
- temporary flags and credentials were removed;
- a deployment receipt records GitHub SHA, Git tree SHA, Sites version, and
  schema version.

If blocked, stop safely and report completed work, remaining work, root cause,
impact, and the exact next action. Never wait silently and never switch targets.


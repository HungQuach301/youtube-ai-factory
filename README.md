# YouTube AI Factory

YouTube AI Factory is a multi-channel operating system for:

```text
Market intelligence -> Niche portfolio -> Channel strategy
-> Content planning -> Video production -> Assurance
-> Release/publication -> Measurement and learning
```

The Video Engine is one subsystem, not the entire product.

## Single source of truth

This Git repository is the sole engineering and knowledge SSOT. Start with [`docs/README.md`](docs/README.md). Active documents are separate from the read-only [`docs/archive`](docs/archive/README.md).

```text
canonical branch: main
Sites mirror: origin/main
personal mirror: github/main (HungQuach301/youtube-ai-factory)
excluded repository: HungQuach301/youtube-ai-factory-v2
```

The personal GitHub mirror was initialized from the complete Sites Git history and exact-SHA equality was verified on 2026-08-25. A later material checkpoint is complete only after local `HEAD`, `origin/main` and `github/main` are again verified as the same exact commit.

## Current checkpoint

- R21 exact master `3f968794…` is immutable: English/en-US audio PASS 95; visual FAIL 67.
- R22 is design-only and has not been dispatched.
- Browser, owner freeze, release, publication and auto-publish remain blocked.
- Architecture/documentation is complete for the approved design scope.
- Phase 45 runtime/contracts and capability qualification must pass before R22.

See [`docs/continuity/03_CURRENT_STATE.md`](docs/continuity/03_CURRENT_STATE.md), [`docs/governance/MASTER_ISSUE_REGISTRY.md`](docs/governance/MASTER_ISSUE_REGISTRY.md) and [`docs/roadmap/MASTER_ROADMAP.md`](docs/roadmap/MASTER_ROADMAP.md).

## Local verification

Prerequisite: Node.js `>=22.13.0`.

```bash
npm run check:docs
npm run build
npm test
```

Use the Sites lifecycle for hosted checkpoints. Do not store credentials, provider keys or deployment tokens in Git configuration, remote URLs, documents or logs.

## Runtime shape

- Vinext/React application under `app/`.
- Cloudflare D1 operational metadata and receipts.
- Cloudflare R2 active media/evidence bytes.
- Drizzle schema and append-only migrations under `db/`.
- Typed production, assurance and provider services under `lib/`.
- Verification and bounded executors under `scripts/` and `tests/`.
- Google Drive is `USER_CONTROLLED_RECOVERY_ARCHIVE`, not code/docs or transactional SSOT.

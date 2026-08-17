# Chat Rollover Source Capsule

**Policy version:** `SOURCE_CONTINUITY_CAPSULE_V1`
**Current source classification:** `PRODUCTION_ACTIVE_V1`
**Production-active functional baseline:** Sites v313 / `f7a125c2f101c3ee3dca23e6d4a080f747142c46`; final FE asset repair and acceptance ledger: Sites v314

**Latest Video Excellence runtime:** Sites v359 / source checkpoint `41a28ef3edb778b0961fdc00d110d07065d47791`; Stage 08 is frozen at 98 adaptive shots over `704.4469583333333` seconds, but golden revision 2 is `REPAIR_REQUIRED` after a 46/100 independent audit with five P1 findings. The bounded plan consumed `40/40` provider requests and `12.471527595833333/20 USD`. Document 35 is the authoritative execution, audit and next-action ledger. Do not dispatch request 41 without new explicit authority; keep Stage 11 blocked.

Chat transcripts and project memory are discovery aids, not executable source control. A rollover is ready only when the active assistant has created and independently recovery-tested a source capsule.

## Required capsule

Each material checkpoint contains:

- a local Git commit containing all intended tracked source and durable instructions;
- a binary diff against the recorded baseline;
- a self-contained Git bundle;
- a tracked-source `.tar.gz` archive;
- `CAPSULE_MANIFEST.md` with baseline, HEAD, verification and protected scope;
- `SHA256SUMS` covering every artifact;
- a clean-checkout recovery report;
- a Library copy of the capsule files and current checkpoint/handoff documents.

## Gate order

1. Verify source path, baseline, HEAD and worktree.
2. Run async boundaries, targeted lint, production build/artifact validation and full tests.
3. Commit locally and ensure intended source is tracked.
4. Generate patch, bundle, archive, manifest and checksums.
5. Verify checksums and `git bundle verify`.
6. Clone the bundle into a clean temporary checkout and rerun boundary/build/tests.
7. Save artifacts and documents to Library and read back their identities/versions.
8. Only then report `ROLLOVER READY` and provide the exact next action.

If any gate fails, report `ROLLOVER BLOCKED`. Do not ask the user to locate an old diff or authorize speculative reconstruction. Keep the current worktree and capsule inputs intact until the failed gate is repaired.

## Recovery order in a new chat

1. Read `AGENTS.md`, this file and the capsule manifest.
   For Niche Discovery, Channel Strategy or Content Planning work, also read Documents 16–27.
2. Verify Library/download checksums.
3. Clone the bundle or apply the binary patch to the exact baseline.
4. Verify recovered HEAD and clean worktree.
5. Run the manifest’s recovery commands.
6. Continue only the manifest’s exact next action and protected scope.

Project memory may connect related chats, but future chats must be able to continue from this repository and capsule without relying on the previous transcript.

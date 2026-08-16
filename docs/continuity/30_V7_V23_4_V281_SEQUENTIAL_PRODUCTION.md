# V7 → V23.4 → V281 Sequential Production Control

Status: implemented for production checkpoint; provider dispatch remains gated by the active video contract.

## Quality incident

The owner rejected all 15 Production Engine V2 masters because technical validity and a shallow three-frame visual check did not represent finished-video content and perceived quality. Those masters and their QA records are preserved as immutable historical evidence, but their package state is `REJECTED_QUALITY`. They have no publishing, reuse or release authority.

## Composed architecture

- **V7** owns the program contract, 18 per-video stages (00–16 including 07A/07B), evidence lifecycle, rights/provenance, provider/cost ledger, stop/resume and root-stage repair.
- **V23.4** owns deterministic pre-production, typed scene programs, SOURCE/MAKE/HYBRID routing, bounded idempotent jobs, stored bytes/pixels and ENTRY–MIDPOINT–EXIT motion proof. Generic render fallback is forbidden.
- **V281** names the latest owner-requested release standard. It is implemented from the verified eight-critic full-master controls already present in source: full playback, three temporal samples per editorial shot, measured audio, semantic/visual/competitive review and fail-closed perceived-quality adjudication.

The implementation does not restore the legacy workspace as a command center. Only verified contracts and controls are composed into the current multi-channel Factory.

## Exclusive sequential governor

Exactly one queue item may be active. Video 1 begins at Stage 00; videos 2–15 remain `BLOCKED_PREVIOUS_VIDEO`. The next queue item cannot receive a provider lease, spend budget, render or enter QA until the current item reaches `OWNER_READY`.

Release requires all of the following:

- overall score at least 92;
- critical score at least 90;
- every dimension at least 86;
- P0 = 0 and unresolved material P1 = 0;
- full uninterrupted playback;
- three temporal samples for every editorial shot;
- eight independent critic results;
- immutable master checksum, rights, provenance and cost reconciliation;
- no more than two root-cause repair loops;
- owner-ready gate; publishing remains a separate authority and is OFF.

## Data controls

Migration 0042 creates an append-only sequential program, 15-item queue, per-video stage runs, release assessments and audit events. It changes prior package release state to `REJECTED_QUALITY` without deleting or overwriting any prior artifact, QA record, provider request or cost evidence.

## Exact next action

Compile and freeze the complete Stage 00–07B design and evidence package for video 1. No provider dispatch or video 2 activity may start before the video-1 contract permits it.

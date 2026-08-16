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

## Reconciliation of the 18 stages

The operator surface separates **prior work history** from **current-video completion**. Prior work never marks a stage complete for the rebuild and no old dataset is needed to make that distinction.

- Stage 00–08: the earlier V7/V23.4 chain had performed the equivalent work and reached the Stage 08 semantic-shot freeze. Reuse is limited to process design, output standards, control contracts and verified lessons. Video 1 must create a new artifact bundle for every stage.
- Stage 09: partially executed but never frozen; pixel/motion and material work exposed systemic quality failures. Reuse is limited to the failure taxonomy, bounded-job design, rights/checksum controls and three-state proof. All media bytes, frames, bindings and hashes must be new.
- Stage 10–13: audio, editing, technical checks and master render were executed in the rejected pipeline. Those outputs are rejected and cannot be reused or rescored. The replacement video creates new stems, timeline, pre-master evidence and master revision.
- Stage 14: not performed to V281 standard. The previous shallow visual/technical review does not substitute for full playback, three temporal samples per editorial shot and eight independent critics.
- Stage 15: not achieved. The owner rejected all prior masters; none is owner-ready.
- Stage 16: not started because no conforming video has been separately approved and published.

The UI summarizes this as 10 stages with reusable foundations, 5 stages previously executed but requiring a full rebuild, 2 final gates not achieved and 1 post-publish stage not started.

## Data leverage and storage design

Five eligibility classes are explicit in the projection and owner UI:

1. `CURRENT_BUSINESS_FACTS`: the active committed niche, Channel Strategy, audience definition and canonical content briefs may be consumed only after version/hash snapshot and recompilation into a new episode package.
2. `REUSABLE_KNOWLEDGE`: V7/V23.4/V281 controls, failure taxonomy, quality thresholds, provider/cost controls, rights and provenance rules are reusable as versioned policies and rubrics—not as production data.
3. `NEW_EPISODE_ARTIFACTS`: research, claim graph, script, storyboard, shot contracts, media/audio, edit, master and release QA are newly created for each video. Only these artifacts can complete a stage.
4. `AUDIT_ONLY`: old masters, QA, provider attempts, costs and failure evidence remain immutable for audit, reconciliation and learning. They have no candidate or release eligibility.
5. `PROHIBITED_INPUTS`: old bytes, frame/asset hashes, templates, bindings, stale storyboards and old QA PASS are blocked by the legacy dependency firewall.

Storage responsibility remains separated:

- D1 is the structured source of truth for queue/stage state, artifact metadata, revision, lineage, rights, provider/cost ledger, QA and audit events.
- R2 stores the actual image, video, audio, evidence and master bytes. Read-back checksum is required before a binding can advance downstream.
- Google Drive stores the user-owned archive copy and evidence manifest. It does not replace D1 state or independently authorize runtime reuse.

The lineage is `active business facts → new episode package → new stage artifacts → verified/frozen bindings → new master/release evidence → post-publish learning`. Every repair creates a new immutable revision; no overwrite or legacy fallback is permitted.

## Exact next action

Compile and freeze the complete Stage 00–07B design and evidence package for video 1. No provider dispatch or video 2 activity may start before the video-1 contract permits it.

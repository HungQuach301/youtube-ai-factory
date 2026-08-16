# Stage 11–16 Implementation Plan

Status: approved next-plan specification; no Stage 11–16 production command has been executed by this document.

## Delivery principle

Continue video #1 only. Every slice must first implement its executor and deterministic gates, pass local regression/build, deploy, then advance production by the five typed commands. Video #2 stays locked until Stage 15 reaches `OWNER_READY`. UI remains English; localization is a later, separate contract.

## Ordered delivery slices

| Slice | Runtime work | Production execution | Exit evidence |
|---|---|---|---|
| A — Stage 11 clean edit | Build an edit-decision-list schema and deterministic compositor over the 84 frozen shot contracts/assets; add 48 kHz audio resample/mix, narration ducking, caption and safe-zone rules | `START_STAGE(11)`; compose a 600-second audience render; produce picture lock, duplicate scan and clean audience render; verify/freeze | all 84 shots bound; no missing media; no debug/template residue; duplicate visual content ≤2%; no unjustified static section >7 s; measured 48 kHz mix; stored render bytes/read-back |
| B — Stage 12 pre-master QA | Bind FFmpeg/ffprobe detectors for black/freeze/silence/clipping, stream shape, frame timing and sync; add mobile 25% legibility review | scan the complete Stage 11 render, not samples; route any defect to its root stage | full timeline scan; zero black/drop/freeze/clipping defect; A/V sync ≤120 ms; caption/safe-zone/mobile checks PASS |
| C — Stage 13 master | Implement bounded 1920×1080, 30 fps, Rec.709, 48 kHz render; immutable R2 key; Drive archive manifest and checksum reconciliation | render once from the frozen Stage 11/12 inputs; probe and read back both copies | master bytes; SHA-256; technical probe; duration within ±1 frame; runtime/archive checksums equal |
| D — Stage 14 V281 assurance | Implement eight isolated critic requests, full-playback evidence, three temporal samples per editorial shot and deterministic adjudication | all critics evaluate the same Stage 13 checksum; no critic sees another result before writing | 252 shot samples; eight critic records; overall ≥92; each critic ≥90; each dimension ≥86; P0=0; unresolved material P1=0 |
| E — repair router | Map every Stage 12/14 failure to the owning root stage and enforce maximum two repair loops | only `REOPEN_ROOT_STAGE` may reopen; downstream becomes blocked; revisions append | root-cause reason, superseded revision, new attempt namespace, no overwritten bytes, re-run evidence |
| F — Stage 15 owner-ready | Implement identity-bound owner-ready assessment and complete rights/cost/checksum reconciliation; keep publish separate | owner reviews evidence and issues the owner-ready command | all Stage 00–14 frozen; 0 active requests; 0 exceptions; rights/cost reconciled; owner identity/evidence hash stored; publish still OFF |
| G — Stage 16 learning | Implement only after separate publication authorization and an actual YouTube video ID exists | ingest YouTube Analytics bound to exact master and strategy versions | actual metrics only; no simulation; immutable baseline; recommendations cannot silently mutate strategy/policy |

## Stage 11 implementation detail

1. Compile an immutable edit decision list from the 84 Stage 08 shot contracts and the 84 Stage 09 asset bindings.
2. Validate complete 0–600 second coverage, exact shot order, transition bounds and narration ranges before rendering.
3. Decode every selected asset and fail closed on missing bytes, mismatched checksum, invalid rights or a route mismatch.
4. Create motion for MAKE assets from the declared ENTRY/MIDPOINT/EXIT states; SOURCE/HYBRID visuals may use only their frozen licensed bytes and declared overlay program.
5. Resample Stage 10 stems to 48 kHz, place narration against the timeline, duck music, cap SFX, and measure the final mix. A 24 kHz Stage 10 mezzanine may not be mislabeled as 48 kHz.
6. Render a clean audience preview with no IDs, debug labels, bounding boxes, watermarks or template residue.
7. Run deterministic duplicate, static-section, caption-density and binding-completeness checks before the three Stage 11 artifacts can verify.

## Stage 12–14 quality control chain

Stage 12 owns technical timeline defects; Stage 14 owns independent perceived-quality assurance. Neither stage repairs its own findings. A black frame, A/V drift or caption defect routes to Stage 11/12 ownership; weak story structure routes to Stage 05/06; weak visual grammar or asset choice routes to Stage 07B/09; narration defects route to Stage 07A/10. The repair command preserves all failed evidence and blocks every downstream stage until the new root revision is frozen.

## Cost and rights gates

- Before any new paid provider call in Stage 14, approve a new versioned cost/rights plan with provider, request and spend ceilings.
- Stage 11–13 should prefer deterministic internal execution; external dispatch is forbidden unless added to the active Stage Contract and approved plan.
- Reconcile OpenAI estimates, provider-reported usage and billing evidence separately.
- Every Stage 09 source license and every Stage 10 commercial voice fact must remain reachable from the Stage 13 master lineage.
- No YouTube publication or analytics call is authorized by completion of Stage 15 alone.

## Definition of done for the next milestone

The next milestone is not “a render exists.” It is complete only when Stage 11–14 are frozen against one immutable master checksum, the full V281 assurance floors pass, Stage 15 records an owner-ready decision, active provider requests are zero, costs/rights reconcile, and video #2 becomes eligible without being automatically started.


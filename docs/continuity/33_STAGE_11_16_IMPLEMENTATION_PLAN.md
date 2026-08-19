# Stage 11–16 Implementation Plan

Status: revised on 2026-08-19. The former direct Stage 11 plan is superseded by Documents 34 and 37. Document 37 adds mandatory first-pass capability qualification, production preflight, truthful operator projection and a one-confirmation independent-assurance policy before this plan may continue. No Stage 11–16 production command has been executed by this document, and Stage 11 remains operationally paused.

## Delivery principle

Continue video #1 only after its lineage becomes Video Excellence eligible. Every slice must implement its executor and evidence gates, pass local regression/build and a separately authorized deployment before any typed production command. Video #2 stays locked until Stage 15 reaches `OWNER_READY`. UI remains English; localization is a later, separate contract.

## Ordered delivery slices

| Slice | Runtime work | Production execution | Exit evidence |
|---|---|---|---|
| 0 — Standard Registry | Implement Document 34 scopes, M0–M4 enforcement, triggers, ownership, evidence and failure actions | none | inheritance and conflict tests; no hard-coded shot/asset count authority |
| 1 — Truthful projection/UI | Project `controlState`, `qualityEligibility`, evidence gaps and `nextValidAction` from one source of truth | none | Stage 00–10 history preserved; Stage 11 visibly blocked; no stale design/provider/media claims |
| 2 — Voice and audio qualification | Implement section-bounded TTS, forced alignment, pronunciation, WPM, pause, pitch/prosody, seam, corruption, production music/SFX, cue sheet and full mix measurement | no provider until a new cost/rights plan is approved | actual take audio and perceptual evidence; no placeholder waveform eligibility; full-duration mix contract |
| 3 — Temporal visual proof | Render and decode ENTRY/MIDPOINT/EXIT states and semantic onset; enforce route playbooks and mobile proof | no provider until approved | actual temporal pixels/video, hashes, semantic timing and rights lineage |
| 4 — Adaptive Stage 08 repair | Compile exact `0–704.446958` narration coverage; derive editorial shots, visual events and asset needs | separately authorized `REOPEN_ROOT_STAGE(08)` then bounded production | zero gaps/overlaps; no fixed count; complete inherited standard bindings |
| 5 — Golden sequence | Build the hardest 60–90 second institutional-chain sequence with final-grade voice, music, SFX, motion and mix | bounded, separately approved execution only | all Document 34 critical dimensions pass on real playback and representative devices |
| A — Stage 11 clean edit | Build a deterministic compositor from the new eligible lineage; add 48 kHz mix, captions and safe-zone rules | only after Slice 5 PASS: `START_STAGE(11)` and typed artifact lifecycle | complete canonical-duration coverage; no missing media/debug residue; adaptive pacing; measured 48 kHz mix; stored render/read-back |
| B — Stage 12 pre-master QA | Bind FFmpeg/ffprobe detectors for black/freeze/silence/clipping, stream shape, frame timing and sync; add mobile 25% legibility review | scan the complete Stage 11 render, not samples; route any defect to its root stage | full timeline scan; zero black/drop/freeze/clipping defect; A/V sync ≤120 ms; caption/safe-zone/mobile checks PASS |
| C — Stage 13 master | Implement bounded 1920×1080, 30 fps, Rec.709, 48 kHz render; immutable R2 key; Drive archive manifest and checksum reconciliation | render once from the frozen Stage 11/12 inputs; probe and read back both copies | master bytes; SHA-256; technical probe; duration within ±1 frame; runtime/archive checksums equal |
| D — Stage 14 V281 assurance | Implement eight isolated critic requests, uninterrupted full playback and samples at every editorial shot plus meaningful-event boundary | all critics evaluate the same Stage 13 checksum; no critic sees another result before writing | sample count derived from the active timeline; Document 34 critical floors; P0=0; critical P1=0 |
| E — repair router | Map every Stage 12/14 failure to the owning root stage and enforce maximum two repair loops | only `REOPEN_ROOT_STAGE` may reopen; downstream becomes blocked; revisions append | root-cause reason, superseded revision, new attempt namespace, no overwritten bytes, re-run evidence |
| F — Stage 15 owner-ready | Implement identity-bound owner-ready assessment and complete rights/cost/checksum reconciliation; keep publish separate | owner reviews evidence and issues the owner-ready command | all Stage 00–14 frozen; 0 active requests; 0 exceptions; rights/cost reconciled; owner identity/evidence hash stored; publish still OFF |
| G — Stage 16 learning | Implement only after separate publication authorization and an actual YouTube video ID exists | ingest YouTube Analytics bound to exact master and strategy versions | actual metrics only; no simulation; immutable baseline; recommendations cannot silently mutate strategy/policy |

## Stage 11 implementation detail

1. Compile an immutable edit decision list from the current eligible Stage 08/09/10 revisions; do not infer count equality between shots and assets.
2. Validate complete `0–704.446958` second coverage, exact shot order, transition bounds and narration ranges before rendering.
3. Decode every selected asset and fail closed on missing bytes, mismatched checksum, invalid rights or a route mismatch.
4. Use only motion products with decoded temporal proof; declared ENTRY/MIDPOINT/EXIT text alone is not compositing evidence.
5. Resample eligible mezzanine stems to 48 kHz, place section-aligned narration and the full cue sheet, duck music, cap SFX, and measure the actual final mix. A 24 kHz mezzanine may not be mislabeled as 48 kHz.
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

The immediate milestone is not Stage 11 and not “a render exists.” It is complete when the Standard Registry and truthful projection are implemented, the affected Stage 08–10 evidence is repaired through typed commands, and one final-grade 60–90 second golden sequence passes Document 34 on real playback. Only then may Stage 11–15 proceed against one immutable master checksum. Video #2 becomes eligible only after owner-ready and must not start automatically.

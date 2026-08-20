# Expert Assessment Reconciliation

**State:** `ACTIVE_RECONCILIATION`
**Date:** 2026-08-20
**Raw detailed assessment:** [`2026-08-20_VIDEO_ENGINE_DETAILED_IMPROVEMENT_SPEC.md`](2026-08-20_VIDEO_ENGINE_DETAILED_IMPROVEMENT_SPEC.md)
**Raw assessment SHA-256:** `4cc45dd5f786e8714c7363cc851e03c8e2cb12a0ca7fea30e8f1410715255b5f`

## Sources reconciled

This record combines all expert review layers received for the current Video Engine program:

1. The A–G issue ledger, described as 45 issues but containing 47 enumerated items: 9 P0, 28 P1 and 10 P2.
2. The detailed Stage 00–16 technical and tool specification.
3. The whole-system review covering learning-loop gaps, Packaging & Publishing and work packages WP1–WP7.
4. Independent repository and production reconciliation against the FP3 checkpoint.

The expert sources are advisory inputs. Their reconciled dispositions are binding only through the tracked issue registry, decisions, roadmap and standards.

## Overall disposition

The central conclusion is accepted: the current runtime is a high-control, single-video quality machine and is not yet a multi-channel operating system with a closed learning loop.

The assessments are used in four ways:

- Confirmed findings become mandatory work and fail-closed gates.
- Sound architectural directions become versioned target contracts.
- Numeric thresholds and tool choices become calibration candidates.
- Incorrect, obsolete or overstated claims are corrected and retained as historical reasoning.

## Confirmed foundational findings

- Sequential artifacts still use non-canonical `JSON.stringify` hashing in material paths.
- The current sequential lease has expiry but no fencing token or heartbeat.
- Budget approval exists but atomic cost reservation is absent.
- Registry capability aliases and settings require a complete version/supersede process.
- Immutability and quality eligibility are not fully independent in the stored lifecycle.
- Assurance lacks a qualified, labelled ground-truth corpus.
- Upstream content design does not yet own every downstream assurance criterion.
- Packaging, prediction, learning promotion and experiment discipline are absent from the authoritative end-to-end path.
- VP9/Opus is currently treated as the immutable master capability and must be separated from an archival/mezzanine source of truth.

## Accepted target architecture

- Channel-level versioned identity inherited by videos.
- Packaging as a parallel track beginning at Stage 04.
- Prediction assembled before production and sealed at Stage 11.
- Animatic gate before actual-pixel Stage 09 work.
- Failure corpus converted into a verified regression suite.
- Owner-authorized learning promotion creating new versions.
- Qualified reusable asset library distinct from rejected-work quarantine.
- Platform compliance, portfolio concurrency and owner-attention planes.

## Calibration required

The following are candidates, not hard standards, until benchmarked against labelled fixtures:

- n-gram, embedding and thumbnail similarity thresholds;
- champion score 95 and critic floor margins;
- shot-duration, hook, loop and entity-density thresholds;
- pHash, optical-flow, SSIM and near-static boundaries;
- forced-alignment error floors and phoneme thresholds;
- A/V sync tolerance by archetype;
- critic rerun, sampling and experiment sample-size rules;
- FFV1 versus ProRes or another archival/mezzanine choice;
- chunk and context sizes for long-form TTS.

## Corrections to the expert material

- JCS preserves Unicode strings as supplied. NFC may be an explicit input-normalization policy, but it is not JCS behavior.
- `V281` is a contract/version label, not evidence of 281 assurance iterations.
- An 80.252-second, eight-shot qualification fixture cannot be linearly extrapolated into a production shot-count floor.
- A sorted non-overlapping timeline can be verified in linear time; an interval tree is optional, not required.
- OpenTimelineIO may be an interchange/export adapter; it must not replace the internal typed semantic timeline without a separate architecture decision.
- Provider model snapshot IDs and sampling parameters must be discovered from actual provider capability; placeholder version names are forbidden.
- Google Drive binary files may expose SHA-256 metadata; the assessment's multipart-hash statement must not become policy.
- YouTube reach reports use their actual API/reporting field names rather than the informal `impressions` labels in the proposal.
- Five to eight videos are insufficient evidence for an unconstrained retention regression model.
- Storing raw provider request/response bodies requires redaction, access control, encryption and retention policy.

## Ordering correction

The assessment's final sequence placed upstream Stage 04–06 alignment and the animatic after FP4/FP5 and before Video #2. That is superseded. Learning-ready schemas and the animatic interface must exist before the Video #1 Stage 09–11 rebuild; otherwise the first video can repeat the same expensive late discovery.

The active order is defined by [`../roadmap/MASTER_ROADMAP.md`](../roadmap/MASTER_ROADMAP.md).

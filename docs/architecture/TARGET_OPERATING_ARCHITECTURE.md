# Target Operating Architecture

**State:** `ACTIVE_TARGET_ARCHITECTURE`
**Effective:** 2026-08-20

## Product boundary

YouTube AI Factory is a multi-channel operating system. The Video Engine is one execution subsystem, not the whole product.

```text
Portfolio
  -> Market / Audience / Competitor Intelligence
  -> Niche Portfolio and Expert Commitment
  -> Channel Strategy and Identity
  -> Content System and Planning
  -> Packaging Promise and Production Design
  -> Video Production Engine
  -> Packaging, Publishing and Distribution
  -> Measurement, Experiments and Learning
  -> Versioned Strategy / Standard Promotion
```

## Operating planes

| Plane | Primary responsibility | Canonical outputs |
|---|---|---|
| Portfolio | Channel portfolio, priority, capacity, spend and scale policy | Portfolio plan, budget envelope, channel queue |
| Intelligence & Strategy | Market, audience, competition, niche, channel and content strategy | Evidence dossiers, commitment, Channel Strategy |
| Channel Identity | Stable voice, visual, music, terminology and editorial identity | `ChannelIdentityContract@version` |
| Content Design | Research, route, story, script and executable shot/cue intent | Claim graph, champion, story clock, script, ShotCueProgram |
| Packaging & Publishing | Promise, title, thumbnail, metadata, schedule and release | Packaging contract, variants, metadata, publishing contract |
| Media Production | Visuals, narration, soundscape, edit and master | Qualified media, archival master, distribution render |
| Quality & Assurance | Deterministic verification, independent assurance and owner gate | Gate evidence, assurance verdict, owner-ready receipt |
| Measurement & Learning | Prediction, analytics, experiments and owner-authorized promotion | Prediction, actuals, learning candidate, promoted version |

## Cross-cutting control planes

- Governance, typed commands and immutable lineage.
- Capability qualification and supersede rules.
- Cost reservation, settlement and portfolio arbitration.
- Rights, platform compliance and asset eligibility.
- Observability, tracing, reconciliation and incident evidence.
- Owner attention, escalation and sampling policy.

## Video Engine mapping

| Stage | Owning responsibility | Required learning-ready extension |
|---|---|---|
| 00 | Authorization and lineage | Independent immutability and eligibility state |
| 01–03 | Intelligence and truth | Fresh evidence, authority ladder, claim and safety lint |
| 04 | Creative tournament | Packaging promise and differentiation hypothesis |
| 05 | Story architecture | Predicted retention and beat-level risk |
| 06 | Script | Numeric, terminology, pronunciation and comprehension controls |
| 07A/07B | Production design | Inherit versioned Channel Identity |
| 08 | Semantic compiler | Executable assertions and animatic contract |
| 09–10 | Media production | Qualified visual/audio dispatch only |
| 11 | Edit | Reconcile timing and seal final prediction |
| 12 | Deterministic QA | Full decode and measured technical gates |
| 13 | Master | Archival/mezzanine plus derived distribution render |
| 14 | Independent assurance | Qualified critics and packaging assurance |
| 15 | Owner-ready and publishing | Compliance and identity-bound release authority |
| 16 | Measurement and learning | Actual-versus-predicted, experiment and promotion candidate |

## Learning loop

1. Record a versioned hypothesis before production.
2. Seal a `PredictedPerformanceArtifact` before master assurance.
3. Publish only through an owner-authorized contract.
4. Bind actual performance to the exact strategy, identity, packaging, capability and master versions.
5. Classify evidence as sufficient or insufficient; never infer knowledge from one noisy result.
6. Promote a learning only through an owner-authorized typed command that creates a new version.
7. Preserve the prior version and all videos produced under it.

## Pilot and scale boundary

Pilot remains one channel, one active video, no automatic publishing and no concurrent paid production. A second channel requires portfolio-scoped budget arbitration, channel-scoped leases, cross-channel isolation, attention-budget policy and defined sampling/escalation gates.

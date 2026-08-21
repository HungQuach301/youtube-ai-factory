# Learning-ready Contract Pack

**Class:** `NORMATIVE`

**Version:** `LEARNING_READY_CONTRACT_PACK_V1`

**Effective source date:** 2026-08-21

**Runtime status:** source implemented; production migration not applied

## Purpose

The Learning-ready Contract Pack closes the structural gaps between channel strategy, packaging, production, measurement and owner-authorized learning before paid media production resumes. It defines artifact boundaries, lineage, fail-closed validation and zero-dispatch persistence. It does not create Video #1 content, qualify a capability, evaluate M0 Safety Scope, authorize provider work, publish a video or activate a learning command in production.

## Invariants

1. The pack contains exactly eight active contract definitions under one version.
2. Every definition has an owner plane, stage bindings, parent artifact types and explicit exit evidence.
3. Contract-pack installation has a provider request budget of `0` and spend budget of `$0`.
4. A schema row or UI label never proves that a video-specific artifact exists, is sealed or is eligible.
5. Channel identity is channel-scoped and versioned. Stages 07A/07B inherit it; they do not silently redesign it per video.
6. Packaging promise binds at Stage 04 and is checked against content before paid media work.
7. Performance prediction is composed across Stages 04, 05, 08 and 11 and is useful to Stage 16 only after sealing.
8. One experiment tests one variable. Underpowered learning remains `INSUFFICIENT_EVIDENCE`.
9. `PROMOTE_LEARNING_V1` is owner-identity-bound and creates a higher strategy or production-standard version. In-place mutation is forbidden.
10. Rights and platform compliance fail closed until commercial rights, Content ID and platform states pass.
11. The animatic gate precedes Stage 09 media production.
12. The archival master is separate from, and is the recorded parent of, the distribution render.

## Contract registry

| Key | Artifact type | Owner plane | Stage bindings | Minimum outcome |
|---|---|---|---|---|
| `CHANNEL_IDENTITY` | `CHANNEL_IDENTITY_CONTRACT` | Channel Identity | 00, 07A, 07B | Versioned channel voice, visual grammar, music policy and terminology lineage |
| `PACKAGING_PROMISE` | `PACKAGING_PROMISE_CONTRACT` | Packaging & Publishing | 04, 06, 14, 15 | Title variants, thumbnail concept, audience promise, claim bindings and mobile legibility |
| `PREDICTED_PERFORMANCE` | `PREDICTED_PERFORMANCE_ARTIFACT` | Measurement & Learning | 04, 05, 08, 11, 16 | Baseline, ordered retention curve, beat risks, CTR interval and stage lineage |
| `EXPERIMENT_DEFINITION` | `EXPERIMENT_DEFINITION` | Measurement & Learning | 04, 15, 16 | One tested variable, held constants, minimum sample and decision criterion |
| `LEARNING_CANDIDATE` | `LEARNING_CANDIDATE` | Measurement & Learning | 16 | Actual-versus-predicted evidence and explicit sufficiency state |
| `RIGHTS_COMPLIANCE` | `RIGHTS_COMPLIANCE_MANIFEST` | Rights & Compliance | 04, 07A, 07B, 09, 10, 13, 15 | Licence window, commercial eligibility, Content ID and platform disclosures |
| `ANIMATIC` | `ANIMATIC_CONTRACT` | Content Design | 08, 09 | Timed draft, duration match, promise-to-content and story/retention PASS |
| `MASTER_DELIVERY` | `MASTER_DELIVERY_CONTRACT` | Media Production | 11, 12, 13, 15 | FFV1 or ProRes 422 HQ archival master, PCM 48 kHz, derived distribution and storage reconciliation |

## Promotion authorization

`PROMOTE_LEARNING_V1` may authorize a transition only when all of the following are true:

- the candidate is `PROMOTION_ELIGIBLE`;
- evidence includes at least two distinct video IDs;
- observed sample size meets the experiment minimum;
- the measured direction is consistent;
- an owner identity is bound to the receipt;
- the evidence hash is valid;
- the result creates a higher version of `CHANNEL_STRATEGY` or `PRODUCTION_STANDARD`.

The source validator and database receipt constraints encode these conditions, but no production route currently executes this command. Runtime command activation belongs to the Learning Closure wave.

## Persistence and lifecycle

Migration `0051_learning_ready_contract_pack.sql` adds the registry and nine artifact/receipt tables. It seeds only eight `SCHEMA_DEFINED` registry definitions. It does not seed channel identity, packaging, prediction, experiment, learning, rights, animatic, master or promotion evidence.

Artifact lifecycles remain append-only by version. Drafts do not satisfy stage gates. Sealing requires the artifact-specific validator and later runtime authorization. Superseded versions remain evidence and cannot be rewritten into the active version.

## Acceptance gates

- all migrations replay from zero through `0051`;
- exactly eight registry definitions exist;
- all registry rows report zero provider requests and zero spend;
- malformed, unevaluated or underpowered examples fail closed;
- promotion receipts reject unbound owners and non-incrementing versions;
- the operator projection reports source contract readiness without unlocking Golden r10, Stage 11, FP4/FP5, Videos 2–15 or auto-publish.

## Next boundary

After an explicitly authorized production checkpoint applies `0051` and zero-dispatch read-back proves the same invariants, Wave 3 may build the WP7 Evaluation Foundation. Paid provider work remains separately gated.

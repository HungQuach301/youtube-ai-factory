# FP3 Executable Stage 07B/08 — execution record

Date: 2026-08-20  
Standard: `FIRST_PASS_QUALITY_V1`  
Scope: deterministic mixed-treatment grammar and canonical `ShotCueProgram` only  
Provider calls/spend: `0 / $0`  
Golden revision created: none

## Outcome

FP3 converts frozen Stage 06 narration/claim intent, Stage 07A sound intent and Stage 07B visual intent into instructions that downstream workers can execute without guessing. The compiler is internal and deterministic; it does not call OpenAI or any media/audio provider.

The sealed hardest fixture is a complete `80.252`-second Golden contract with eight contiguous shots and eight visual-treatment families. Every shot binds narration clause, claims, exact start/midpoint/end, narrative job, visual route and archetype, actors/objects/action, three temporal states, source query where required, at least three layers, mobile text constraints, music/ambience/SFX/silence/ducking functions, required/prohibited evidence, rights and resolved Standard Registry IDs.

```text
PROGRAM_VERSION = SHOT_CUE_PROGRAM_V1
COMPILER_VERSION = DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0
DURATION_SECONDS = 80.252
SHOTS = 8
TREATMENT_FAMILIES = 8
TIMELINE_GAPS = 0
TIMELINE_OVERLAPS = 0
SCHEMA_GAPS = 0
FALLBACK_ALLOWED = FALSE
PROVIDER_REQUESTS = 0
SPEND_USD = 0
CONTENT_HASH = 7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629
```

## Runtime records

Migration `0049_first_pass_shot_cue_program.sql` adds:

- `v7_first_pass_visual_grammars` for mixed-treatment grammar identity and route policy;
- `v7_first_pass_shot_cue_programs` for exact-duration sealed contract identity and frozen parents;
- `v7_first_pass_shot_cues` for all typed shot, visual, audio, evidence, rights and acceptance-test bindings; and
- `v7_first_pass_contract_lints` for exact timeline, schema, treatment, request and spend evidence.

The migration qualifies only `FPC-SHOT-CUE-COMPILER` v1.1.0 against `FPA-SHOT-CUE`. The fixture is explicitly `QUALIFICATION_FIXTURE`; it is not a Stage 09 asset, production master or Golden r10. The remaining 21 capability–archetype bindings stay unqualified and the shared dispatch firewall stays closed.

## Fail-closed compiler

`lib/first-pass-shot-cue-program.ts` rejects:

1. duration outside 60–90 seconds;
2. a timeline gap, overlap or non-zero final-duration difference;
3. missing narration, claim, visual route/archetype or actor/object/action bindings;
4. missing entry, midpoint or exit states and acceptance tests;
5. SOURCE/HYBRID without a source query;
6. fewer than three executable layers per shot or fewer than three treatment families;
7. mobile text below 32 px or over 12 words per line;
8. missing audio functions, evidence constraints, rights or Standard Registry bindings;
9. any generic fallback; or
10. any non-zero provider-request or spend budget.

The negative regression deliberately introduces timing, quality-binding, source-query and fallback defects and confirms that lint fails closed.

## Verification

- production build and Sites artifact validation: `PASS`;
- async API boundary audit: `47/47` routes;
- commercial UI static contract: `82/82`;
- full regression: `128/128`;
- targeted FP3/Video Engine lint: `0` errors (`1` pre-existing unused-helper warning); repository-wide lint remains red on `24` pre-existing legacy-route errors outside this slice;
- client performance budgets: CSS `60,965/62,000`, page JS `46,388/50,000`, total `309,907/310,000` gzip bytes; and
- migration 0048 + 0049 replay in a clean in-memory SQLite database: `PASS` with one qualified ShotCue binding and zero lint gaps.

## Operator projection

Video Engine now reports FP3 as implemented and shows the sealed contract evidence. The next visible milestone is FP4 visual capability qualification. `Golden r10 eligible` remains false even though one control capability binding is now qualified.

## Protected scope

- Do not render replacement visual media or audio during FP3.
- Do not create Golden r10 before FP4 and FP5 pass.
- Do not reuse Golden r9 visual/audio bytes, settings or assurance verdicts.
- Do not start video #2 or enable auto-publish.
- Do not reinterpret the qualification fixture as a production output.

## Next authorized action

Implement FP4 under a separately bounded provider plan: qualify the eight visual archetypes hardest-first using real licensed source windows, layered scene graphs, decoded entry/midpoint/exit pixels, semantic-motion proof, mobile legibility and zero generic fallback. Golden r10 remains blocked.

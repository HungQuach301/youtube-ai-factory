# QA and Eval Registry

Every finding includes severity, exact evidence, affected artifact/hash, root stage, repair action, acceptance test, confidence and status.

## Stage 09 material gates — CONTROLLED_RELEASE_GATE_V1

- Standard: overall ≥92; every dimension ≥90; P0/P1 = 0.
- Controlled: overall ≥88; Semantic Fit ≥82; every other dimension ≥88; P0 = 0; semantic P1 = 0; presentation P1 ≤1.
- Controlled scale uses a 25% independent QA sample; deterministic and per-unit terminal gates still apply to every unit.
- Scores 84–87 are internal-only. Overall <84 or Semantic Fit <82 is blocked.
- Missing, duplicate or unknown-rights assets = 0.
- Entry, midpoint and exit are materially distinct for MAKE/HYBRID evidence.
- Audience pixels contain no URLs, filenames, provider names, debug labels or production instructions.
- Composite tournament pass does not substitute for motion or sequence proof.

Rubrics and thresholds cannot be changed after failure without a new decision record.

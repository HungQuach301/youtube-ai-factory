# Factory Browser QA Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policy:** `FACTORY_BROWSER_QA_POLICY_V1`

**Source state:** `SOURCE_READY__BROWSER_FIXTURE_PASS__PRODUCTION_ACTIVATION_PENDING`

## Outcome

The 47 temporal/audio candidates left by Factory-first image triage now have a separate exact-byte Browser execution lane. This lane is corpus evaluation evidence only. It is deliberately separate from `BROWSER_ASSURANCE_GATE_V1`, which remains an exact-Golden-master release gate.

Migration `0065_factory_browser_qa.sql` derives one task from each immutable Factory receipt whose review surface is `BROWSER_REQUIRED`. It preserves the original Factory receipt and candidate, binds the exact candidate SHA-256, and accepts exactly one immutable Browser receipt per task.

## Executable contract

- The server re-reads the full R2 object and recomputes SHA-256 before exposing a pending task.
- Only `audio/*` and `video/*` candidates are eligible.
- Playback must load metadata, become playable, progress, cover at least 98%, reach `ENDED`, remain visible and emit the required `LOADED_METADATA -> PLAY -> PAUSE -> PLAY -> SEEKED -> ENDED` sequence.
- Audio presence, meaningful video motion, keyboard focus, mobile/zoom reflow and zero page-console errors are mandatory evidence.
- Every media-observable defect family must receive `PRESENT`, `ABSENT` or `UNCERTAIN` with a rationale.
- `UNCERTAIN` and P0 findings route to owner attention; no uncertainty is silently converted to clean.
- Receipts use `INDEPENDENT_REVIEW_ONLY`, add zero provider request/spend and cannot write `OWNER_CONFIRMED`, gold, dataset, assurance qualification or release eligibility.

## Browser qualification

The controlled 1920×1080 VP9/Opus fixture rendered in agent preview with the expected exact fixture hash. Browser playback decoded at 1920×1080, exercised play/pause/resume/seek and reached the end. The Vietnamese task hierarchy, technical checks, three-state defect controls and summary field were all operable. The final fixture result was:

```text
Fixture đã hoàn tất ở Browser · không ghi production receipt.
```

The fixture carries no production or release authority. A Browser interaction quirk required keyboard activation of the final button during qualification; the application handler itself completed and returned the expected result. No production receipt was created.

## Source verification

- Evaluation Foundation target tests: 22/22 PASS.
- Full regression: 168/168 PASS.
- Verified production build: PASS.
- Browser fixture: PASS.
- Provider requests: 0.
- Spend: $0.

## Next protected action

Checkpoint and deploy the exact source, confirm migration `0065`, read back the 47-task modality split and run the bounded Browser queue. Browser receipts remain evaluation evidence; they do not close the separately open 63 rights tasks and cannot open Golden r10, Stage 11, FP4 or FP5.

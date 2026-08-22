# Factory Browser QA Execution Record

**Class:** `EXECUTION_EVIDENCE`

**Policies:** `FACTORY_BROWSER_QA_POLICY_V1`, `FACTORY_QA_ROUTING_ADJUDICATION_V1`

**Production state:** `ACTIVE__FIXTURE_PASS__NO_ELIGIBLE_MEDIA_TASKS`

## Outcome

The exact-byte Factory Browser execution lane is deployed and qualified for future `audio/*` and `video/*` corpus candidates. Production reconciliation found zero eligible media tasks.

The 47 legacy Factory receipts previously reported as temporal/audio were all `application/json`: 15 `FULL_VIDEO_MANIFEST`, 15 `FULL_VIDEO_QA1_EVIDENCE`, 15 `FULL_VIDEO_QA2_EVIDENCE`, one `PILOT_MANIFEST` and one `PILOT_QA_EVIDENCE`. The legacy dispatcher had treated every non-image MIME as Browser-required. Migration `0066_factory_qa_routing_adjudication.sql` preserves those immutable receipts and adds immutable superseding adjudications with corrected surface `STRUCTURED_EVIDENCE_ONLY`. JSON is not rendered as video and no Browser receipt is fabricated.

Production read-back after Sites v430:

- Factory tasks: 82 total, zero pending.
- Independent image outcomes: 37 likely-defect receipts including the four preserved calibration receipts; 33 are non-anchor primaries.
- Legacy JSON routing adjudicated: 47 `STRUCTURED_EVIDENCE_ONLY`.
- Open Factory Browser tasks: 0.
- Factory Browser provider requests/spend: 0 / $0.
- Factory-first cumulative provider requests/spend: 37 / $0.4314096.
- Recent production Worker errors: 0.

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

## Verification

- Evaluation Foundation target tests: 23/23 PASS.
- Full regression: 169/169 PASS.
- Verified production build: PASS.
- Browser fixture: PASS.
- Sites production version: v430.
- Source commit: `9f129087d030392d56e3bb9eedfe8890785ca141`.
- Provider requests/spend added by routing correction and Browser layer: 0 / $0.

## Next protected action

Use the 33 independent visual defect receipts as regression/failure-corpus evidence while keeping the 47 structured JSON artifacts outside perceptual QA. The separately open 63 rights tasks, M0 Safety Scope, gold-set qualification, Golden r10, Stage 11, FP4 and FP5 remain blocked. Future real audio/video evaluation candidates must automatically enter the qualified Browser lane.

# Autonomous Clean A/V Browser QA

**Class:** `NORMATIVE` plus production execution evidence  
**Date:** 2026-08-23  
**Scope:** original YouTube AI Factory only; Production V2 is excluded and untouched.

## Purpose

`CLEAN_AV_AUTONOMOUS_BROWSER_QA_V1` supplies the missing real-browser execution lane for the exact `cfp-v1-13` distribution master. It does not lower `CLEAN_AV_BROWSER_QA_V1` and does not grant owner, dataset, assurance, release or publication authority.

## Contract

- The runner binds the immutable materialization receipt and distribution SHA-256 before media playback.
- At most three append-only infrastructure/observation attempts may exist. Only one run may be active and only one final Browser receipt may ever exist.
- A likely-clean result requires a mobile Chromium viewport between 320 and 480 CSS pixels, at least 98% played-range coverage, pause/resume, backward seek, natural `ended`, decoded audio track plus RMS at or above `0.002`, four cue samples with at least three distinct pixel hashes and two meaningful cross-cue changes, four mobile frames with contrast/edge evidence, focus/reflow PASS and zero page/media errors. `requestVideoFrameCallback` must be observed, but its callback rate is not treated as playback frame rate because remote browsers may throttle callbacks while preserving decoded media time.
- Required event order is `loadedmetadata → play → pause → play → seeked → ended`.
- Four cue frames are JPEG-bounded, SHA-256 sealed, written to R2 and read back before the final receipt. The canonical telemetry/frame manifest becomes an exact evidence-bundle hash.
- An incomplete run is stored as `FAILED`; Browser QA remains `PENDING` and no receipt is consumed. The runner cannot manufacture a PASS from missing evidence.
- A complete run may append the existing `CLEAN_AV_BROWSER_QA_V1` receipt and its evidence link. Only the pre-existing conjunction of Factory `LIKELY_CLEAN` plus Browser `LIKELY_CLEAN` may open the separate non-delegable owner task.

## Source implementation

Migration `0082` adds the immutable automation policy, bounded runs, R2 evidence-object ledger and receipt-to-evidence link. The evaluation route exposes two browser-token-scoped commands, `START_AUTONOMOUS_CLEAN_AV_BROWSER_QA` and `FINALIZE_AUTONOMOUS_CLEAN_AV_BROWSER_QA`, plus a same-origin mobile runner surface. The surface plays the exact production media in real time and performs the required interactions and measurements inside the browser.

Sites v474 from source `237210850aaa9ad01a15ed47e7adf793666e294f` is production-active. Attempt 1 completed full playback but was append-only `FAILED` because a throttled callback-rate proxy could not prove motion; it created no Browser receipt. The corrected cross-cue method passed attempt 2 with playback 100%, maximum decoded audio RMS 0.1328, four meaningful motion samples, four of four mobile frames, focus/reflow PASS and zero page errors. Start/finalize requests `a2f93b66dd1f5708` and `a2f93cd109a55708` returned 201 with Worker outcome `ok`. The exact evidence bundle and its four JPEG objects passed R2 read-back before the sole `LIKELY_CLEAN` receipt was sealed. Production UI read-back shows Browser motion/mobile PASS and owner truth `REVIEW_REQUIRED`. Full regression passes 184/184 and the documentation SSOT check passes.

## Protected scope

Do not use a run row, screenshot, telemetry field, source test or UI success label as a Browser receipt. Do not complete the owner task through automation. Do not seal a dataset, qualify assurance, render Golden r10, reopen Stage 11, release, publish or mutate Production V2 from this gate.

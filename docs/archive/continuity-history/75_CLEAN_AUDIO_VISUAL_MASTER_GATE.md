# Clean Audio-Visual Master Gate

**Class:** `NORMATIVE` plus source execution evidence  
**Date:** 2026-08-23  
**Scope:** original YouTube AI Factory only; Production V2 is excluded and untouched.

## Purpose

`CLEAN_AV_MASTER_MATERIALIZATION_V1` turns the exact Rights-PASS, Factory-reviewed and owner-confirmed clean-audio control into one `cfp-v1-13` clean audio-visual master. It does not create a gold item by implication. Technical materialization, independent Factory review, independent Browser review and owner ground truth are four distinct authorities.

## Fixed contract

- Exactly one task and one materialization receipt may exist.
- The source audio is re-read from R2 and must match every sealed parent hash and byte count.
- The authored visual separates authorization, clearing and settlement with at least four cues, three treatment families, continuous motion and critical text of at least 32 px at archival size.
- Archival is 1920×1080; distribution is 1280×720; both are VP9/Opus, 30 fps and 48 kHz.
- Full decode must produce at least 900 frames, black-frame ratio at most 1%, maximum freeze at most 3.5 seconds, decoded motion coverage at least 95%, A/V start delta at most 20 ms and A/V end delta at most 80 ms.
- Visual manifest, both renditions, contact sheet and technical evidence are SHA-256 sealed and read back from R2 before the immutable receipt is written.
- Materialization grants only `CLEAN_AV_TECHNICAL_MATERIALIZATION_ONLY`; dataset, qualification, release and publication authority remain false.

## Independent review

`CLEAN_AV_FACTORY_QA_V1` permits one `gpt-5.6` contact-sheet review under a USD 0.50 reserved ceiling. It binds the exact distribution hash, contact-sheet hash and source-audio QA receipt. `LIKELY_CLEAN` requires overall at least 92, every dimension at least 90 and P0/P1 both zero. Exact provider response bytes, usage and calculated spend must pass R2 read-back.

`CLEAN_AV_BROWSER_QA_V1` is a separately scoped exact-master observation. A likely-clean receipt requires at least 98% playback plus pause/resume, seek, ended, audible audio, meaningful motion, mobile legibility, keyboard focus/reflow and zero page/media errors. The preview workbench stores nothing and cannot issue a receipt.

Only when both independent receipts are likely-clean may the system open one `CLEAN_AV_OWNER_GROUND_TRUTH_V1` task. The Factory must never complete that task or claim the owner watched or heard the master.

## Production execution

Sites v465–v469 deployed migration `0081`, the runtime, three exact-action credentials, deterministic FFmpeg executor, staged-chunk transport and the preview-only Browser workbench. The first technical render stopped before upload because decoded motion coverage was only 43.66% and maximum freeze was 10 seconds. The corrected frame-evaluated compositor then passed with 100% decoded motion coverage. Two whole-request upload attempts were rejected with HTTP 413 before API receipt or master mutation; v468 replaced that transport with independently hashed, R2-read-back chunks and an atomic exact-hash assembly. The first chunk commit correctly failed before receipt because the JSON boundary discarded already-parsed objects; v469 preserves parsed objects and adds a regression assertion.

The production run then recorded the sole materialization receipt `clean-av-master-materialization-receipt-5a0c0db2-a7e0-4fcd-b7d6-5591e7e3c602`. The archival hash is `84abd75c0848aa55b68a595f40ccd7618bb5efca4e0400a5fa18f800a3dca469`; the distribution hash is `db65f24a28252757901ab5c16fac8711dd6f4ca8e83bd5963ebb6e80c666781c`; the contact-sheet hash is `ed0c47b9e6b62edf241b04a9e5c522c1e71b463e1323d5cfd0125bbea785e06d`. An independent production download of the 612,485-byte distribution rendition reproduced the exact distribution hash.

Both renditions decode to 1,072 frames at 30 fps with VP9 video and 48 kHz Opus audio. Measured audio duration is 35.781 seconds, video duration 35.733 seconds, start delta 7 ms, end delta −41 ms, black-frame ratio zero, maximum freeze 0.467 seconds and decoded motion coverage 100%. Technical QA and source rights are PASS; release eligibility remains false.

The single bounded Factory request recorded `clean-av-factory-qa-receipt-573e211a-28c0-46c1-97d6-57c4b5474998` as `LIKELY_CLEAN`, 95/100, P0=0, P1=0, with actual spend USD 0.032484. The cloud browser could not reach the healthy agent preview and returned `ERR_BLOCKED_BY_CLIENT` for both the scoped path and required preview root. No Browser receipt was manufactured. Browser QA remains `PENDING`, the owner task remains unopened and recent production Worker error logs are empty.

## Protected downstream scope

Do not seal a dataset, qualify assurance, render Golden r10, reopen Stage 11, process Videos 2–15, release, publish or mutate Production V2 from this gate.

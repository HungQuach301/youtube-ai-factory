# Browser Assurance Gate Execution Record

**Class:** `EXECUTION_EVIDENCE`  
**Date:** 2026-08-21 (Asia/Bangkok)  
**Policy:** `BROWSER_ASSURANCE_GATE_V1`

## Purpose

Make browser-rendered, user-like playback assurance a mandatory release gate rather than an informal operator check. Automated/static media evidence, Browser assurance and owner semantic judgment remain separate evidence lanes; none may impersonate another.

## Mandatory contract

`VQ-M1-GOLDEN-PLAYBACK` can pass only from an append-only Browser assurance receipt that is bound to the exact Golden revision, master artifact ID and master SHA-256. The receipt must prove:

1. at least 98% continuous playback coverage of the exact master;
2. browser events for metadata load, play, pause, resume, seek and ended in monotonic order;
3. visible playback with no hidden-playback incident;
4. perceptible picture motion and audible program audio;
5. keyboard focus visibility and zoom/reflow usability;
6. zero browser console errors; and
7. a recorded viewport and user-agent.

Legacy self-attested playback submission is retired. A fixture is visually marked `QUALIFICATION FIXTURE — NO RELEASE AUTHORITY` and can test the mechanism, but it can never update a production Golden or create release eligibility. A failed Browser receipt records evidence and keeps the Golden blocked; it does not authorize output patching. Repair must occur in the owning specification, compiler, compositor, capability or production rule, followed by regression and complete reproduction.

## Source implementation

- Migration `0060_browser_assurance_gate.sql` creates exact-master tasks and immutable receipts with zero-provider/zero-spend constraints.
- `validateBrowserAssurance` fails closed on missing event, insufficient coverage, hidden playback, console error, audio/motion/focus/reflow failure or mismatched gate/session/master binding.
- The quality route creates a pending task only after a master is complete and accepts `SUBMIT_GOLDEN_BROWSER_ASSURANCE` only for that exact pending task.
- The Video Engine embeds a server-rendered Browser assurance surface. Keeping it server-rendered preserves the production performance budget.
- A six-second 1920×1080 VP9/Opus fixture exercises the Browser path without release authority.

## Independent Browser QA

The Browser opened the agent-preview fixture and exercised it as a user:

- exact fixture loaded at 1920×1080 with `readyState=4` and duration `6.008s`;
- full playback reached `ended`;
- pause, resume and seek worked;
- visible motion was observed;
- keyboard navigation moved focus between controls and displayed a visible 3px focus outline;
- an initial runtime defect, `crypto.randomUUID is not a function`, was discovered by Browser QA and fixed at the source;
- audio perception could not be honestly established because the Browser agent has no hearing channel;
- zoom/reflow could not be established because the cloud Browser did not apply the zoom shortcut.

The fixture therefore returned `PLAYBACK_AUDIO_MISSING` and `BROWSER_ZOOM_REFLOW_FAILED`. Overall Browser qualification is `BLOCKED`; no PASS receipt, production release evidence or provider request was created. This is the intended fail-closed outcome. The owner may supplement only the two observations that require human senses/runtime support: audible audio and zoom/reflow.

## Verification

- Golden contract and migration tests: PASS.
- Sequential runtime contract tests: PASS.
- Full regression: `164/164 PASS`.
- Lint: PASS.
- Production build: PASS.
- Performance budgets: CSS `60,980/62,000`, page JavaScript `46,387/50,000`, total `309,908/310,000`; no budget was raised.
- Provider requests: zero.
- Slice spend: `$0`.
- Owner receipts: zero.
- Browser assurance PASS receipts: zero.

## Production activation

Sites v414 deployed source commit `3cfc3d9ddd8d99175eee112e5943029106559256` and migration `0060`. The immutable deployment status is `succeeded` at the canonical Production URL. Version provenance read-back matches the exact source commit, and the post-deployment Worker error query returned zero events. Activation created no Browser PASS receipt and did not alter provider request/spend authority, Golden eligibility or Stage 11 state.

## Next gate

Have the owner supplement audible-audio and zoom/reflow observations on the first eligible exact master. Golden r10 and Stage 11 remain blocked until every Browser criterion and all other M0/M1 gates pass.

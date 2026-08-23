# ElevenLabs commercial-entitlement hardening

**Policy:** `ELEVENLABS_COMMERCIAL_ENTITLEMENT_V1`

**Scope:** active V7 clean-fixture, Stage 10 and Golden-audio synthesis gates in the original YouTube AI Factory repository.

## Root cause

The active synthesis paths treated every active ElevenLabs tier other than the literal string `free` as commercially eligible. The generation-time clean-audio snapshot returned `payg · active`, so the old predicate admitted synthesis even though it did not prove an underlying paid subscription plan.

Authoritative ElevenLabs sources distinguish those facts:

- the non-EEA Terms allow commercial use for a Paid User and restrict a Free User to non-commercial use;
- the publishing help article says content generated during a paid subscription may be used commercially, subject to the applicable terms and non-Beta restriction;
- the PAYG administration documentation says PAYG is available on all self-serve tiers, including Free.

Therefore `payg` is a payment/credit state, not sufficient base-plan evidence.

## Corrective control

`lib/elevenlabs-commercial-entitlement.ts` is now the single V7 classification boundary. It permits synthesis only when:

- subscription status is exactly `active`; and
- the tier is one of the explicit paid base plans: `starter`, `creator`, `pro`, `scale`, `business`, or `enterprise`.

`payg`, `free`, inactive and unknown tiers fail closed. The controlled-fixture materializer, Stage 10 media path and Golden-audio path all call the same evaluator. New cost-rights plans explicitly state `PAYG_ALONE_INELIGIBLE`.

## Evidence and limits

- targeted entitlement and V7 route regressions: 24/24 PASS;
- full regression and verified production build: 179/179 PASS;
- production deployment: Sites v451 from source `d59842961082845793c912328ff57fc8312699b9`;
- provider requests: 0;
- provider generation requests: 0;
- spend: USD 0;
- current clean-audio fixture rights state: unchanged at `PROVIDER_TERMS_RECEIPT_REQUIRED`;
- Factory-first audio QA, owner clean label, dataset membership, assurance qualification and release: blocked.

This correction does not delete or relabel the exact existing audio bytes. If authoritative evidence later proves that a paid base plan covered the original generation timestamp, a separate append-only adjudication may evaluate that receipt. Otherwise the correct path is to activate an explicit paid base plan and generate a new clean fixture under the hardened gate.

## Next protected action

Obtain generation-time explicit paid-base-plan evidence or regenerate the clean fixture after the owner activates a paid base plan. Do not run Factory-first audio QA against the current rights-pending fixture.

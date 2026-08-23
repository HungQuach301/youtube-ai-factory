# Factory Audio QA response-contract recovery

**Policy:** `FACTORY_AUDIO_QA_RECOVERY_V1`

**Scope:** one malformed-response failure after the successful commercial clean-audio replacement in the original YouTube AI Factory. The separate V2 project is excluded and untouched.

## Production evidence

Sites v455 activated migration `0076` from source `1dfcdfe9c3d0b938d3921092fe07f2d5ea6108cb`. The owner invoked the authorized pre-TTS recovery. Production request `a2f71fdb9f51a8af` returned HTTP 201 after 16.442 seconds and created one append-only replacement:

- ElevenLabs entitlement `starter · active`;
- exact subscription and audio bytes sealed with R2 read-back PASS;
- provider-native request ID captured;
- commercial rights PASS;
- Factory Audio QA pending;
- owner ground truth `NOT_EVALUATED`;
- dataset, assurance and release authority all false.

The owner then invoked the original Factory Audio QA. Production request `a2f72a7cbf21a8bb` returned HTTP 502 after 6.302 seconds with `FACTORY_AUDIO_QA_RESPONSE_INVALID`. The provider accepted exactly one request, but the response did not contain the required JSON evidence. No QA receipt was written and no downstream authority changed.

The failed run recorded one provider request but could not seal the original response bytes or returned usage before parsing failed. Its actual spend is therefore not asserted as zero. The Factory conservatively marks it `UNVERIFIED_RESERVED_AT_0_20` and retains the full USD 0.20 reservation as exposure evidence.

## Root cause and correction

The original runtime requested free-form JSON in `message.content`. OpenAI documents `gpt-audio-1.5` as a Chat Completions audio model that supports function calling but does not support Structured Outputs. Relying on free-form JSON therefore left the evidence contract weaker than the model's supported function-call interface.

Migration `0077_factory_audio_qa_response_recovery.sql` adds one conditional, append-only authorization only for the exact failed signature: original QA run failed, one provider request was dispatched, failure code is `FACTORY_AUDIO_QA_RESPONSE_INVALID`, and no QA receipt exists. `FORCED_FUNCTION_CALL_V1` then:

- forces the single `record_factory_audio_qa` tool;
- permits at most one additional provider request;
- captures the exact successful provider response bytes in R2 before parsing;
- seals response SHA-256, R2 read-back, provider request identity, usage and calculated actual spend;
- validates every score, defect count, finding and decision server-side;
- writes a separate recovery receipt without rewriting the failed run.

The additional reserved ceiling is USD 0.20, making cumulative reserved exposure USD 0.40 across original plus recovery. A successful receipt remains `INDEPENDENT_REVIEW_ONLY`; it cannot set owner truth or grant dataset, assurance or release authority.

## Source verification

```text
MIGRATION = 0077_FACTORY_AUDIO_QA_RESPONSE_RECOVERY
OUTPUT_CONTRACT = FORCED_FUNCTION_CALL_V1
FAILED_REQUEST_ID = a2f72a7cbf21a8bb
FAILED_HTTP_STATUS = 502
FAILED_PROVIDER_REQUESTS = 1
FAILED_ACTUAL_SPEND = UNVERIFIED_RESERVED_AT_0_20
RECOVERY_AUTHORIZATIONS_MAX = 1
ADDITIONAL_PROVIDER_REQUESTS_MAX = 1
ADDITIONAL_RESERVED_SPEND_USD = 0.20
CUMULATIVE_RESERVED_SPEND_USD = 0.40
TARGETED_REGRESSION = 52_OF_52_PASS
FULL_REGRESSION = 182_OF_182_PASS__VERIFIED_BUILD_PASS
REPLACEMENT_RIGHTS = PASS
FACTORY_AUDIO_QA = FAILED_RESPONSE_CONTRACT__RECOVERY_SOURCE_READY
OWNER_GROUND_TRUTH = NOT_EVALUATED
DATASET_ASSURANCE_RELEASE_AUTHORITY = FALSE_FALSE_FALSE
PRODUCTION_STATE = SOURCE_READY__DEPLOYMENT_PENDING
```

## Production recovery acceptance

Sites v456 activated migration `0077` from source checkpoint `bd87521ef439d786640aa81d1693ee1ff510c4e8`. The owner invoked the single authorized recovery. Production request `a2f758a3dc59a8ba` returned HTTP 201 after 8.816 seconds. The resulting append-only evidence reports:

```text
RECOVERY_RUN = COMPLETE
PROVIDER_REQUESTS = 1
OUTPUT_CONTRACT = FORCED_FUNCTION_CALL_V1
EXACT_PROVIDER_RESPONSE_R2 = SEALED_AND_READ_BACK
USAGE_AND_ACTUAL_SPEND = MEASURED_AND_SEALED_IN_RECOVERY_RECEIPT
DECISION = LIKELY_CLEAN
OVERALL_SCORE = 95_OF_100
P0_P1 = 0_0
OWNER_ATTENTION = NO_IMMEDIATE_OWNER_ACTION
REPLACEMENT_RIGHTS = PASS
OWNER_GROUND_TRUTH = NOT_EVALUATED
DATASET_ASSURANCE_RELEASE_AUTHORITY = FALSE_FALSE_FALSE
POST_RUN_WORKER_ERRORS = 0
```

The independent rationale reports natural human-like delivery, perfect pronunciation, seamless continuity, practically no noise and clear distinction among authorization, clearing and settlement. It also notes a slightly instructional tone and possible mild listener fatigue from dense information; these are observations, not P0/P1 defects. The old malformed response and its unverified USD 0.20 reservation remain preserved. The recovery request's exact response, usage and calculated actual spend are sealed separately; the Factory does not merge them with or rewrite the failed attempt.

## Next protected action

Route this exact replacement audio to one separate owner-ground-truth decision. The owner must listen to the exact bytes before confirming clean or rejecting with observed defects; the Factory receipt cannot impersonate that decision. Only after owner confirmation may the controlled-fixture lane evaluate gold eligibility and isolated defect derivatives. Dataset sealing, assurance qualification, Golden r10, Stage 11, Videos 2–15 and publishing remain locked.

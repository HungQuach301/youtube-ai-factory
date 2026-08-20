CREATE TABLE `v7_first_pass_visual_grammars` (
  `id` text PRIMARY KEY NOT NULL,
  `grammar_version` text NOT NULL,
  `standard_version` text NOT NULL,
  `scope` text NOT NULL,
  `minimum_treatment_families` integer NOT NULL,
  `maximum_camera_only_ratio` real NOT NULL,
  `fallback_allowed` integer DEFAULT 0 NOT NULL,
  `treatment_families_json` text NOT NULL,
  `route_policy_json` text NOT NULL,
  `content_hash` text NOT NULL,
  `lifecycle_state` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_visual_grammar_version_uq` ON `v7_first_pass_visual_grammars` (`grammar_version`,`scope`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_shot_cue_programs` (
  `id` text PRIMARY KEY NOT NULL,
  `artifact_scope` text NOT NULL,
  `program_version` text NOT NULL,
  `compiler_version` text NOT NULL,
  `standard_version` text NOT NULL,
  `production_context_id` text NOT NULL,
  `canonical_brief_hash` text NOT NULL,
  `visual_grammar_id` text NOT NULL,
  `duration_seconds` real NOT NULL,
  `shot_count` integer NOT NULL,
  `treatment_family_count` integer NOT NULL,
  `parent_artifact_ids_json` text NOT NULL,
  `parent_hashes_json` text NOT NULL,
  `provider_requests` integer DEFAULT 0 NOT NULL,
  `spend_usd` real DEFAULT 0 NOT NULL,
  `fallback_allowed` integer DEFAULT 0 NOT NULL,
  `content_hash` text NOT NULL,
  `lint_state` text NOT NULL,
  `lifecycle_state` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `sealed_at` text
);
--> statement-breakpoint
CREATE INDEX `v7_first_pass_shot_cue_program_state_idx` ON `v7_first_pass_shot_cue_programs` (`artifact_scope`,`lifecycle_state`,`created_at`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_shot_cues` (
  `id` text PRIMARY KEY NOT NULL,
  `shot_cue_program_id` text NOT NULL,
  `ordinal` integer NOT NULL,
  `narration_clause_id` text NOT NULL,
  `claim_ids_json` text NOT NULL,
  `start_seconds` real NOT NULL,
  `midpoint_seconds` real NOT NULL,
  `end_seconds` real NOT NULL,
  `narrative_job` text NOT NULL,
  `visual_route` text NOT NULL,
  `visual_archetype` text NOT NULL,
  `treatment_family` text NOT NULL,
  `actors_json` text NOT NULL,
  `objects_json` text NOT NULL,
  `action` text NOT NULL,
  `entry_state` text NOT NULL,
  `midpoint_state` text NOT NULL,
  `exit_state` text NOT NULL,
  `source_query` text NOT NULL,
  `layers_json` text NOT NULL,
  `visible_text_json` text NOT NULL,
  `minimum_font_px` integer NOT NULL,
  `audio_functions_json` text NOT NULL,
  `required_evidence_json` text NOT NULL,
  `prohibited_evidence_json` text NOT NULL,
  `quality_binding_ids_json` text NOT NULL,
  `acceptance_tests_json` text NOT NULL,
  `rights_state` text NOT NULL,
  `fallback_allowed` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_shot_cue_ordinal_uq` ON `v7_first_pass_shot_cues` (`shot_cue_program_id`,`ordinal`);
--> statement-breakpoint
CREATE TABLE `v7_first_pass_contract_lints` (
  `id` text PRIMARY KEY NOT NULL,
  `shot_cue_program_id` text NOT NULL,
  `compiler_version` text NOT NULL,
  `content_hash` text NOT NULL,
  `lifecycle_state` text NOT NULL,
  `exact_duration` integer NOT NULL,
  `gap_count` integer DEFAULT 0 NOT NULL,
  `overlap_count` integer DEFAULT 0 NOT NULL,
  `schema_gap_count` integer DEFAULT 0 NOT NULL,
  `treatment_family_count` integer NOT NULL,
  `provider_requests` integer DEFAULT 0 NOT NULL,
  `spend_usd` real DEFAULT 0 NOT NULL,
  `errors_json` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `v7_first_pass_contract_lint_hash_uq` ON `v7_first_pass_contract_lints` (`shot_cue_program_id`,`content_hash`);
--> statement-breakpoint
INSERT INTO `v7_first_pass_visual_grammars` (`id`,`grammar_version`,`standard_version`,`scope`,`minimum_treatment_families`,`maximum_camera_only_ratio`,`fallback_allowed`,`treatment_families_json`,`route_policy_json`,`content_hash`,`lifecycle_state`) VALUES
('FP3-GRAMMAR-V1','MIXED_TREATMENT_VISUAL_GRAMMAR_V1','FIRST_PASS_QUALITY_V1','QUALIFICATION_FIXTURE',3,0.35,0,'["LIVE_ACTION","ACTOR_FLOW","PROCESS_MAP","DATA_LEDGER","LAYERED_HYBRID","ABSTRACT_CONSEQUENCE","RIGHTS_PROOF","MOBILE_PAYOFF"]','{"routes":["SOURCE","MAKE","HYBRID"],"sourceQueryRequiredFor":["SOURCE","HYBRID"],"minimumLayersPerShot":3,"genericFallback":false}','sha256:4a4078fced5a30a4e0896d95419555893122fd8889cdd53f5501c86eca6f292d','VERIFIED');
--> statement-breakpoint
INSERT INTO `v7_first_pass_shot_cue_programs` (`id`,`artifact_scope`,`program_version`,`compiler_version`,`standard_version`,`production_context_id`,`canonical_brief_hash`,`visual_grammar_id`,`duration_seconds`,`shot_count`,`treatment_family_count`,`parent_artifact_ids_json`,`parent_hashes_json`,`provider_requests`,`spend_usd`,`fallback_allowed`,`content_hash`,`lint_state`,`lifecycle_state`,`sealed_at`) VALUES
('FP3-GOLDEN-CONTRACT-80S-V1','QUALIFICATION_FIXTURE','SHOT_CUE_PROGRAM_V1','DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0','FIRST_PASS_QUALITY_V1','video-01-golden-contract-qualification','sha256:video-01-active-brief-frozen-for-fp3','FP3-GRAMMAR-V1',80.252,8,8,'["VIDEO-01-STAGE-06-FROZEN","VIDEO-01-STAGE-07A-FROZEN","VIDEO-01-STAGE-07B-FROZEN"]','["sha256:stage-06-frozen-intent","sha256:stage-07a-frozen-sound-intent","sha256:stage-07b-frozen-visual-intent"]',0,0,0,'7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629','PASS','VERIFIED',CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT INTO `v7_first_pass_shot_cues` (`id`,`shot_cue_program_id`,`ordinal`,`narration_clause_id`,`claim_ids_json`,`start_seconds`,`midpoint_seconds`,`end_seconds`,`narrative_job`,`visual_route`,`visual_archetype`,`treatment_family`,`actors_json`,`objects_json`,`action`,`entry_state`,`midpoint_state`,`exit_state`,`source_query`,`layers_json`,`visible_text_json`,`minimum_font_px`,`audio_functions_json`,`required_evidence_json`,`prohibited_evidence_json`,`quality_binding_ids_json`,`acceptance_tests_json`,`rights_state`,`fallback_allowed`) VALUES
('FP3-SHOT-01','FP3-GOLDEN-CONTRACT-80S-V1',1,'NARR-001','["CLAIM-CHAIN-START"]',0,1.75,3.5,'Open a concrete mystery and establish the transaction anchor.','HYBRID','DOCUMENTARY_LIVE_ACTION','LIVE_ACTION','["customer","merchant"]','["card","terminal","$100 anchor"]','customer presents payment and the terminal emits an authorization message','customer and merchant share one physical moment','terminal signal separates from the physical card','authorization message leaves the merchant','commercially licensed close-up card terminal purchase merchant','[{"role":"documentary source window","motion":"real hand and terminal motion"},{"role":"$100 anchor","motion":"hold amount invariant"},{"role":"authorization pulse","motion":"depart terminal"}]','["One purchase. Many institutions."]',42,'{"music":["investigative pulse"],"ambience":["retail room tone"],"sfx":["terminal confirmation"],"silence":[],"duckingDb":-12}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-HOOK-PACING"]','{"entry":["physical purchase"],"midpoint":["signal separation"],"exit":["message departure"]}','COMMERCIAL_SOURCE_REQUIRED',0),
('FP3-SHOT-02','FP3-GOLDEN-CONTRACT-80S-V1',2,'NARR-002','["CLAIM-AUTH-ROUTE"]',3.5,7.25,11,'Name the first institutional handoffs without conflating their roles.','MAKE','PROCESS_ROUTE','PROCESS_MAP','["merchant","processor","acquirer"]','["authorization request","route ledger"]','authorization request crosses two labeled institutional boundaries','merchant owns the request','processor validates and routes the message','acquirer receives the request with role labels intact','','[{"role":"institution nodes","motion":"activate current role"},{"role":"authorization path","motion":"advance message"},{"role":"message-versus-money legend","motion":"remain persistent"}]','["Merchant","Processor","Acquirer"]',36,'{"music":["second rhythmic layer"],"ambience":[],"sfx":["handoff ticks"],"silence":[],"duckingDb":-11}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-PILLAR-TRANSACTION-CHAIN","VQ-M2-PILLAR-FLOW-LEGEND"]','{"entry":["merchant owns request"],"midpoint":["processor routes"],"exit":["acquirer receives"]}','CHANNEL_ORIGINATED',0),
('FP3-SHOT-03','FP3-GOLDEN-CONTRACT-80S-V1',3,'NARR-003','["CLAIM-ISSUER-DECISION"]',11,16,21,'Show who decides and preserve directional responsibility.','MAKE','TRANSACTION_STATE_PROOF','ACTOR_FLOW','["network","issuer"]','["authorization request","decision state"]','network forwards the request and issuer changes decision state','network holds an undecided request','issuer evaluates the request','issuer owns an approve-or-decline decision','','[{"role":"network actor","motion":"forward request"},{"role":"issuer actor","motion":"pending to decided"},{"role":"decision ownership","motion":"attach label to issuer"}]','["Issuer decides"]',44,'{"music":["decision tension"],"ambience":[],"sfx":["route and resolve tones"],"silence":["120 ms pause"],"duckingDb":-12}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-PILLAR-TRANSACTION-CHAIN"]','{"entry":["undecided request"],"midpoint":["issuer evaluation"],"exit":["issuer decision"]}','CHANNEL_ORIGINATED',0),
('FP3-SHOT-04','FP3-GOLDEN-CONTRACT-80S-V1',4,'NARR-004','["CLAIM-AUTH-NOT-SETTLEMENT"]',21,26.25,31.5,'Separate approval from later clearing and settlement.','MAKE','DATA_VISUALIZATION','DATA_LEDGER','["authorization ledger","settlement ledger"]','["approved message","unsettled amount"]','authorization closes while settlement remains pending','both ledgers are pending','authorization becomes approved','settlement remains explicitly pending','','[{"role":"authorization ledger","motion":"pending to approved"},{"role":"settlement ledger","motion":"hold pending"},{"role":"phase separator","motion":"reveal later phase"}]','["Approved now","Settled later"]',40,'{"music":["percussion drop"],"ambience":[],"sfx":["stamp and pending pulse"],"silence":["180 ms pause"],"duckingDb":-13}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-PILLAR-TRANSACTION-CHAIN"]','{"entry":["both pending"],"midpoint":["approval"],"exit":["settlement pending"]}','CHANNEL_ORIGINATED',0),
('FP3-SHOT-05','FP3-GOLDEN-CONTRACT-80S-V1',5,'NARR-005','["CLAIM-CLEARING-SETTLEMENT"]',31.5,37,42.5,'Demonstrate the causal order of clearing then settlement.','HYBRID','SOURCE_AUTHORED_HYBRID','LAYERED_HYBRID','["acquirer","network","issuer"]','["clearing records","settlement instruction"]','records reconcile before funds-transfer activates','institution records disagree','clearing aligns the records','settlement instruction becomes eligible','commercially licensed institutional operations data center payment processing','[{"role":"operations source","motion":"real context"},{"role":"reconciliation overlay","motion":"align entries"},{"role":"settlement layer","motion":"activate after reconciliation"}]','["1. Clearing","2. Settlement"]',40,'{"music":["pulse return"],"ambience":["operations room tone"],"sfx":["alignment and release"],"silence":[],"duckingDb":-11}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof","licensed source checksum and window"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-PILLAR-TRANSACTION-CHAIN","VQ-M1-RIGHTS-LINEAGE"]','{"entry":["records disagree"],"midpoint":["records align"],"exit":["settlement eligible"]}','COMMERCIAL_SOURCE_REQUIRED',0),
('FP3-SHOT-06','FP3-GOLDEN-CONTRACT-80S-V1',6,'NARR-006','["CLAIM-VARIABILITY-QUALIFIER"]',42.5,48.5,54.5,'Show bounded variability without inventing a universal fee split.','MAKE','ABSTRACT_AUTHORED','ABSTRACT_CONSEQUENCE','["contract terms","transaction type","liability rule"]','["fee range","timing range","qualifier"]','conditions reshape a bounded outcome range','one misleading fixed outcome','conditions split outcome into ranges','qualifier stays attached to every range','','[{"role":"condition controls","motion":"separate inputs"},{"role":"bounded outcomes","motion":"expand ranges"},{"role":"scope qualifier","motion":"remain visible"}]','["Terms vary","No universal split"]',38,'{"music":["thin careful arrangement"],"ambience":[],"sfx":["condition cues"],"silence":[],"duckingDb":-14}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes","unqualified universal fee percentages"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-SERIES-FOLLOW-THE-FEE"]','{"entry":["fixed outcome"],"midpoint":["bounded ranges"],"exit":["qualifiers persist"]}','CHANNEL_ORIGINATED',0),
('FP3-SHOT-07','FP3-GOLDEN-CONTRACT-80S-V1',7,'NARR-007','["CLAIM-EXCEPTION-PATH"]',54.5,60.75,67,'Make the exception path materially visible and rights-safe.','SOURCE','RIGHTS_SENSITIVE','RIGHTS_PROOF','["customer","merchant support","issuer support"]','["decline notice","reversal record","source license"]','decline or reversal branches away from the success path','successful route is active','exception opens a separate branch','responsibility branch ends with owner and provenance','commercially licensed customer merchant support payment declined documentary footage','[{"role":"support source","motion":"authentic consequence"},{"role":"exception route","motion":"diverge from success"},{"role":"provenance proof","motion":"bind checksum and license"}]','["Exception path"]',42,'{"music":["consequence turn"],"ambience":["support environment"],"sfx":["branch break"],"silence":["220 ms pause"],"duckingDb":-12}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof","license URL","source checksum","decoded source window"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M2-PILLAR-EXCEPTION","VQ-M1-RIGHTS-LINEAGE"]','{"entry":["success baseline"],"midpoint":["exception branch"],"exit":["responsibility owner"]}','COMMERCIAL_SOURCE_REQUIRED',0),
('FP3-SHOT-08','FP3-GOLDEN-CONTRACT-80S-V1',8,'NARR-008','["CLAIM-OWNERSHIP-PAYOFF"]',67,73.626,80.252,'Resolve the hook with a reusable mobile-readable mental model.','MAKE','MOBILE_TEXT_INTENSIVE','MOBILE_PAYOFF','["merchant","processor","acquirer","network","issuer"]','["authorization","clearing","settlement","exception"]','each phase snaps to its accountable institution','institutions lack ownership labels','phase labels attach one by one','compact ownership map remains','','[{"role":"institution row","motion":"highlight owner"},{"role":"phase labels","motion":"attach to owner"},{"role":"ownership rule","motion":"resolve payoff"}]','["Who owns each state change?"]',46,'{"music":["restrained payoff"],"ambience":[],"sfx":["ownership locks"],"silence":["final 300 ms hold"],"duckingDb":-12}','["decoded entry/midpoint/exit pixels","claim-to-pixel binding","exact timeline proof"]','["generic fallback","camera-only semantic motion","legacy or rejected runtime bytes"]','["VQ-M0-FACTUAL-TRACEABILITY","VQ-M1-CANONICAL-COVERAGE","VQ-M1-SEMANTIC-ALIGNMENT","VQ-M1-MOBILE-LEGIBILITY","VQ-M2-PILLAR-FLOW-LEGEND"]','{"entry":["unlabeled actors"],"midpoint":["phase ownership"],"exit":["ownership map"]}','CHANNEL_ORIGINATED',0);
--> statement-breakpoint
INSERT INTO `v7_first_pass_contract_lints` (`id`,`shot_cue_program_id`,`compiler_version`,`content_hash`,`lifecycle_state`,`exact_duration`,`gap_count`,`overlap_count`,`schema_gap_count`,`treatment_family_count`,`provider_requests`,`spend_usd`,`errors_json`) VALUES
('FP3-LINT-GOLDEN-CONTRACT-80S-V1','FP3-GOLDEN-CONTRACT-80S-V1','DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0','7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629','PASS',1,0,0,0,8,0,0,'[]');
--> statement-breakpoint
UPDATE `v7_first_pass_capabilities`
SET `capability_version`='1.1.0',`provider`='INTERNAL',`tool_or_model`='DETERMINISTIC_SHOT_CUE_COMPILER_1.0.0',`configuration_json`='{"programVersion":"SHOT_CUE_PROGRAM_V1","typedBindings":true,"exactTimeline":true,"mixedTreatment":true,"providerDispatch":false,"fallback":false}',`lifecycle_state`='QUALIFIED',`updated_at`=CURRENT_TIMESTAMP
WHERE `id`='FPC-SHOT-CUE-COMPILER';
--> statement-breakpoint
UPDATE `v7_first_pass_fixtures`
SET `input_contract_json`='{"source":"FP3_GOLDEN_CONTRACT_80S_V1","durationSeconds":80.252,"shotCount":8,"treatmentFamilies":8,"providerDispatch":false,"fallback":false}',`expected_evidence_json`='{"exactTimeline":true,"gapCount":0,"overlapCount":0,"schemaGapCount":0,"contentHash":"7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629"}',`input_hash`='7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629',`lifecycle_state`='VERIFIED',`updated_at`=CURRENT_TIMESTAMP
WHERE `id`='FPF-EXECUTABLE_SHOT_CUE_CONTRACT';
--> statement-breakpoint
UPDATE `v7_first_pass_qualifications`
SET `capability_version`='1.1.0',`settings_hash`='4a4078fced5a30a4e0896d95419555893122fd8889cdd53f5501c86eca6f292d',`sample_size`=1,`first_pass_yield`=1,`p0_escape_count`=0,`evidence_hashes_json`='["7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629"]',`lifecycle_state`='QUALIFIED',`blocker`=NULL,`qualified_at`=CURRENT_TIMESTAMP,`updated_at`=CURRENT_TIMESTAMP
WHERE `id`='FPQ-FPC-SHOT-CUE-COMPILER-FPA-SHOT-CUE';
--> statement-breakpoint
INSERT INTO `v7_first_pass_artifact_envelopes` (`id`,`program_id`,`queue_id`,`stage_key`,`artifact_id`,`artifact_type`,`revision`,`lifecycle_state`,`standard_version`,`capability_qualification_ids_json`,`parent_hashes_json`,`artifact_hash`,`rights_state`,`cost_state`,`preflight_state`,`sealed_at`) VALUES
('FPE-FP3-GOLDEN-CONTRACT-80S-V1','FP3-QUALIFICATION-FIXTURE','FP3-QUALIFICATION-FIXTURE','08','FP3-GOLDEN-CONTRACT-80S-V1','SHOT_CUE_PROGRAM',1,'VERIFIED','FIRST_PASS_QUALITY_V1','["FPQ-FPC-SHOT-CUE-COMPILER-FPA-SHOT-CUE"]','["sha256:stage-06-frozen-intent","sha256:stage-07a-frozen-sound-intent","sha256:stage-07b-frozen-visual-intent"]','7a85dd494d873e30b7c8fef9dc837ad479b42ce503c5452d2c35f554fea37629','MIXED_CHANNEL_AND_COMMERCIAL_SOURCE_REQUIRED','ZERO_SPEND','PASS',CURRENT_TIMESTAMP);

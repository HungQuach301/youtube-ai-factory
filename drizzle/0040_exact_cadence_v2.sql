-- Production reconciliation for the already-authorized channel-hidden-systems
-- policy v5 (monthly target 15). This appends one SYSTEM_AUTOPILOT V2 run and
-- preserves every V1 policy/run/plan/brief as immutable history.
INSERT INTO content_planning_runs (
  id,channel_id,run_version,policy_id,policy_version,strategy_activation_id,strategy_version,
  lifecycle_state,horizon_days,pillar_count,series_count,opportunity_count,plan_item_count,
  brief_count,exception_count,provider_requests,spend_usd,actor_type,policy_snapshot_json,
  idempotency_key,request_hash,created_at
)
SELECT
  'content-run:channel-hidden-systems:v5',
  p.channel_id,
  5,
  p.id,
  p.policy_version,
  p.strategy_activation_id,
  p.strategy_version,
  'COMPLETE',
  30,
  4,
  8,
  8,
  15,
  15,
  0,
  0,
  0,
  'SYSTEM_AUTOPILOT',
  '{"modelVersion":"V2_EPISODE_CONCEPTS","mode":"FULL_AUTOPILOT","lifecycleState":"ACTIVE","budgets":{"daily":25,"monthly":500,"perVideo":40,"projected":293},"cadencePerMonth":15,"repairLimit":1,"riskTolerance":"LOW","autoProduction":true,"autoPublish":false,"escalationRules":["Material strategy change","Evidence contradiction or readiness below policy","Legal, safety or unsupported-claim risk","Cost above the per-video ceiling","Repair limit exhausted","Publishing outside approved boundaries"]}',
  'prod.hidden-systems.content-run.v5.cadence-v2',
  '8dff7fe00f7c631b0f7d0b575c5ee5b46abc3d3c008242597c47bdc1b2de0175',
  CURRENT_TIMESTAMP
FROM content_automation_policies p
WHERE p.id='content-policy:channel-hidden-systems:v5'
  AND p.lifecycle_state='ACTIVE'
  AND p.cadence_per_month=15
  AND p.auto_production=1
  AND p.auto_publish=0
  AND NOT EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');
--> statement-breakpoint
INSERT INTO content_pillars (
  id,run_id,channel_id,position,title,purpose,audience_need,differentiation,
  evidence_requirement,winning_criteria_json,lifecycle_state,content_hash,created_at
)
SELECT
  replace(id,'content-run:channel-hidden-systems:v4','content-run:channel-hidden-systems:v5'),
  'content-run:channel-hidden-systems:v5',channel_id,position,title,purpose,audience_need,
  differentiation,evidence_requirement,winning_criteria_json,lifecycle_state,content_hash,CURRENT_TIMESTAMP
FROM content_pillars
WHERE run_id='content-run:channel-hidden-systems:v4'
  AND EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');
--> statement-breakpoint
INSERT INTO content_series (
  id,run_id,pillar_id,channel_id,position,title,format,repeatable_promise,cadence_weight,
  lifecycle_state,content_hash,created_at
)
SELECT
  replace(id,'content-run:channel-hidden-systems:v4','content-run:channel-hidden-systems:v5'),
  'content-run:channel-hidden-systems:v5',
  replace(pillar_id,'content-run:channel-hidden-systems:v4','content-run:channel-hidden-systems:v5'),
  channel_id,position,title,format,repeatable_promise,cadence_weight,lifecycle_state,content_hash,CURRENT_TIMESTAMP
FROM content_series
WHERE run_id='content-run:channel-hidden-systems:v4'
  AND EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');
--> statement-breakpoint
INSERT INTO content_opportunities (
  id,run_id,series_id,channel_id,system_rank,title,audience_problem,core_question,
  evidence_refs_json,strategy_fit,audience_demand,differentiation,evidence_readiness,
  production_complexity,estimated_cost_usd,lifecycle_state,rationale,content_hash,created_at
)
SELECT
  replace(id,'content-run:channel-hidden-systems:v4','content-run:channel-hidden-systems:v5'),
  'content-run:channel-hidden-systems:v5',
  replace(series_id,'content-run:channel-hidden-systems:v4','content-run:channel-hidden-systems:v5'),
  channel_id,system_rank,title,audience_problem,core_question,evidence_refs_json,strategy_fit,
  audience_demand,differentiation,evidence_readiness,production_complexity,estimated_cost_usd,
  lifecycle_state,rationale,content_hash,CURRENT_TIMESTAMP
FROM content_opportunities
WHERE run_id='content-run:channel-hidden-systems:v4'
  AND EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');
--> statement-breakpoint
INSERT INTO editorial_plans (
  id,run_id,channel_id,plan_version,horizon_days,cadence_per_month,lifecycle_state,rationale,
  content_hash,created_at
)
SELECT
  'content-run:channel-hidden-systems:v5:plan',
  'content-run:channel-hidden-systems:v5',
  'channel-hidden-systems',
  5,
  30,
  15,
  'AUTO_APPROVED',
  'Automation balances the active strategy across four pillars and creates one distinct, evidence-bound episode concept for every monthly publishing slot.',
  printf('%064x',5005),
  CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');
--> statement-breakpoint
WITH seed(sequence,system_rank,title,angle,cost) AS (
  VALUES
    (1,1,'What Really Happens to a $100 Card Purchase?','CORE_MECHANISM: Core mechanism',18),
    (2,2,'Why the Price Changes Between Search and Checkout','CORE_MECHANISM: Core mechanism',18),
    (3,3,'The Hidden Economics of Credit-Card Rewards','CORE_MECHANISM: Core mechanism',25),
    (4,4,'Inside a Chargeback: Who Holds the Loss?','CORE_MECHANISM: Core mechanism',25),
    (5,5,'The Files That Quietly Decide Your Financial Life','CORE_MECHANISM: Core mechanism',18),
    (6,6,'Why Subscription Cancellation Is Designed as a Maze','CORE_MECHANISM: Core mechanism',12),
    (7,7,'Where Unused Gift-Card Money Goes','CORE_MECHANISM: Core mechanism',18),
    (8,8,'The Retirement Plan Decisions Made Before You Arrive','CORE_MECHANISM: Core mechanism',25),
    (9,1,'Follow the Money Through a $100 Card Purchase','MONEY_FLOW: Money flow',18),
    (10,2,'Follow the Money Through the Checkout Price','MONEY_FLOW: Money flow',18),
    (11,3,'Follow the Money Through Credit-Card Rewards','MONEY_FLOW: Money flow',25),
    (12,4,'Follow the Money Through a Chargeback','MONEY_FLOW: Money flow',25),
    (13,5,'Follow the Money Through Specialty Consumer Reports','MONEY_FLOW: Money flow',18),
    (14,6,'Follow the Money Through Subscription Cancellation','MONEY_FLOW: Money flow',12),
    (15,7,'Follow the Money Through Unused Gift-Card Value','MONEY_FLOW: Money flow',18)
)
INSERT INTO content_episode_concepts_v2 (
  id,run_id,opportunity_id,series_id,channel_id,sequence,title,core_question,angle,
  evidence_refs_json,estimated_cost_usd,lifecycle_state,content_hash,created_at
)
SELECT
  'content-run:channel-hidden-systems:v5:episode:' || seed.sequence,
  'content-run:channel-hidden-systems:v5',
  opportunity.id,
  opportunity.series_id,
  'channel-hidden-systems',
  seed.sequence,
  seed.title,
  opportunity.core_question,
  seed.angle,
  opportunity.evidence_refs_json,
  seed.cost,
  'APPROVED_FOR_PLAN',
  printf('%064x',seed.sequence),
  CURRENT_TIMESTAMP
FROM seed
JOIN content_opportunities opportunity
  ON opportunity.run_id='content-run:channel-hidden-systems:v5'
 AND opportunity.system_rank=seed.system_rank
WHERE EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');
--> statement-breakpoint
INSERT INTO editorial_plan_items_v2 (
  id,plan_id,episode_concept_id,sequence,publish_offset_days,lifecycle_state,created_at
)
SELECT
  'content-run:channel-hidden-systems:v5:plan:item:' || sequence,
  'content-run:channel-hidden-systems:v5:plan',
  id,
  sequence,
  CAST(((sequence - 1) * 30) / 15 AS INTEGER),
  'PLANNED',
  CURRENT_TIMESTAMP
FROM content_episode_concepts_v2
WHERE run_id='content-run:channel-hidden-systems:v5';
--> statement-breakpoint
INSERT INTO production_briefs_v2 (
  id,run_id,plan_item_id,episode_concept_id,brief_version,viewer_payoff,hook,
  narrative_structure_json,claims_json,evidence_requirements_json,visual_opportunities_json,
  risk_controls_json,target_duration_seconds,cost_ceiling_usd,lifecycle_state,content_hash,created_at
)
SELECT
  'content-run:channel-hidden-systems:v5:brief:' || concept.sequence,
  'content-run:channel-hidden-systems:v5',
  item.id,
  concept.id,
  1,
  'The viewer can explain ' || lower(concept.core_question) || ' without relying on personal-finance advice.',
  'A familiar financial action looks simple—until its hidden system becomes visible.',
  '["Audience-facing problem","Institutional handoff map","Concrete money or data flow","Counterevidence and scope boundary","Durable viewer mental model"]',
  '["The episode must answer the bound core question.","Every material mechanism must bind dated evidence and preserve uncertainty."]',
  concept.evidence_refs_json,
  '["System flow map","Institution role separation","Unit economics or decision trail","Evidence qualification card"]',
  '["No personalized financial advice","No unsupported company accusations","Preserve evidence scope and uncertainty"]',
  720,
  concept.estimated_cost_usd,
  'READY_FOR_PRODUCTION',
  printf('%064x',100 + concept.sequence),
  CURRENT_TIMESTAMP
FROM content_episode_concepts_v2 concept
JOIN editorial_plan_items_v2 item ON item.episode_concept_id=concept.id
WHERE concept.run_id='content-run:channel-hidden-systems:v5';
--> statement-breakpoint
INSERT INTO content_planning_audits (
  id,channel_id,entity_type,entity_id,event_type,actor_type,actor_email,policy_version,
  strategy_version,idempotency_key,request_hash,detail_json,created_at
)
SELECT
  'content-run:channel-hidden-systems:v5:audit',
  'channel-hidden-systems',
  'CONTENT_PLANNING_RUN',
  'content-run:channel-hidden-systems:v5',
  'CONTENT_AUTOPILOT_COMPLETED',
  'SYSTEM_AUTOPILOT',
  NULL,
  5,
  1,
  'prod.hidden-systems.content-run.v5.cadence-v2',
  '8dff7fe00f7c631b0f7d0b575c5ee5b46abc3d3c008242597c47bdc1b2de0175',
  '{"modelVersion":"V2_EPISODE_CONCEPTS","pillars":4,"series":8,"opportunities":8,"episodeConcepts":15,"planned":15,"briefs":15,"projectedCostUsd":293,"providerRequests":0,"spendUsd":0}',
  CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM content_planning_runs WHERE id='content-run:channel-hidden-systems:v5');

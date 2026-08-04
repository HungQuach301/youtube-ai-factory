import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  market: text("market").notNull().default("US"),
  language: text("language").notNull().default("en-US"),
  niche: text("niche").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const videoProjects = sqliteTable("video_projects", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  title: text("title").notNull(),
  pillar: text("pillar").notNull(),
  status: text("status").notNull().default("OPPORTUNITY_REVIEW"),
  opportunityScore: integer("opportunity_score").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  budgetUsd: real("budget_usd").notNull().default(0),
  spentUsd: real("spent_usd").notNull().default(0),
  nextAction: text("next_action").notNull().default("Review opportunity"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workflowEvents = sqliteTable("workflow_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contentBriefs = sqliteTable("content_briefs", {
  projectId: text("project_id").primaryKey(),
  targetViewer: text("target_viewer").notNull(),
  centralQuestion: text("central_question").notNull(),
  viewerPromise: text("viewer_promise").notNull(),
  uniqueAngle: text("unique_angle").notNull(),
  format: text("format").notNull(),
  riskNote: text("risk_note").notNull(),
  status: text("status").notNull().default("DRAFT"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const researchSources = sqliteTable("research_sources", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url").notNull(),
  authority: text("authority").notNull(),
  freshness: text("freshness").notNull(),
  status: text("status").notNull().default("VERIFIED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const researchClaims = sqliteTable("research_claims", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  claimText: text("claim_text").notNull(),
  riskLevel: text("risk_level").notNull(),
  status: text("status").notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scriptVersions = sqliteTable("script_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("DRAFT"),
  criticScore: integer("critic_score"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const criticEvaluations = sqliteTable("critic_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  scriptVersionId: text("script_version_id").notNull(),
  criticType: text("critic_type").notNull(),
  score: integer("score").notNull(),
  decision: text("decision").notNull(),
  findings: text("findings").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const voiceProfiles = sqliteTable("voice_profiles", {
  projectId: text("project_id").primaryKey(),
  provider: text("provider").notNull().default("ELEVENLABS"),
  voiceId: text("voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  modelId: text("model_id").notNull().default("eleven_multilingual_v2"),
  stability: real("stability").notNull().default(0.55),
  similarityBoost: real("similarity_boost").notNull().default(0.78),
  style: real("style").notNull().default(0.2),
  speed: real("speed").notNull().default(0.96),
  status: text("status").notNull().default("CANDIDATE"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const narrationSegments = sqliteTable("narration_segments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  scriptVersionId: text("script_version_id").notNull(),
  position: integer("position").notNull(),
  label: text("label").notNull(),
  text: text("text").notNull(),
  characterCount: integer("character_count").notNull(),
  status: text("status").notNull().default("READY"),
  durationSeconds: real("duration_seconds"),
  audioKey: text("audio_key"),
  alignment: text("alignment"),
  takeNumber: integer("take_number").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pronunciationRules = sqliteTable("pronunciation_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  term: text("term").notNull(),
  pronunciation: text("pronunciation").notNull(),
  ruleType: text("rule_type").notNull().default("ALIAS"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const voiceEvaluations = sqliteTable("voice_evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  segmentId: text("segment_id").notNull(),
  takeNumber: integer("take_number").notNull(),
  pronunciationScore: integer("pronunciation_score").notNull(),
  paceScore: integer("pace_score").notNull(),
  consistencyScore: integer("consistency_score").notNull(),
  decision: text("decision").notNull(),
  findings: text("findings").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const AI_USAGE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS v7_ai_usage_events (
  id text PRIMARY KEY NOT NULL,
  program_id text NOT NULL,
  run_id text NOT NULL,
  stage_key text NOT NULL,
  provider text DEFAULT 'OPENAI' NOT NULL,
  model_id text NOT NULL,
  provider_response_id text NOT NULL UNIQUE,
  provider_status text NOT NULL,
  input_tokens integer DEFAULT 0 NOT NULL,
  cached_input_tokens integer DEFAULT 0 NOT NULL,
  output_tokens integer DEFAULT 0 NOT NULL,
  reasoning_tokens integer DEFAULT 0 NOT NULL,
  total_tokens integer DEFAULT 0 NOT NULL,
  web_search_calls integer DEFAULT 0 NOT NULL,
  input_rate_per_million real DEFAULT 0 NOT NULL,
  cached_input_rate_per_million real DEFAULT 0 NOT NULL,
  output_rate_per_million real DEFAULT 0 NOT NULL,
  web_search_rate_per_thousand real DEFAULT 0 NOT NULL,
  token_cost_usd real DEFAULT 0 NOT NULL,
  tool_cost_usd real DEFAULT 0 NOT NULL,
  actual_usd real DEFAULT 0 NOT NULL,
  pricing_status text DEFAULT 'MEASURED' NOT NULL,
  pricing_source text NOT NULL,
  usage_json text NOT NULL,
  measured_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

type Statement = {
  bind: (...values: unknown[]) => Statement;
  run: () => Promise<unknown>;
};

export type UsageDatabase = {
  prepare: (sql: string) => Statement;
  batch: (statements: Statement[]) => Promise<unknown>;
};

type UsageRecord = Record<string, unknown>;

const PRICING_SOURCE = "https://developers.openai.com/api/docs/pricing";

function object(value: unknown): UsageRecord {
  return value && typeof value === "object" ? value as UsageRecord : {};
}

function integer(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function countWebSearchCalls(payload: UsageRecord) {
  return (Array.isArray(payload.output) ? payload.output : []).filter((item) => {
    const type = String(object(item).type || "");
    return type === "web_search_call" || type === "web_search";
  }).length;
}

function ratesFor(model: string) {
  if (model.startsWith("gpt-5.6")) {
    return { input: 5, cachedInput: 0.5, output: 30, known: true };
  }
  return { input: 0, cachedInput: 0, output: 0, known: false };
}

export function measureOpenAIUsage(payload: UsageRecord, fallbackModel = "gpt-5.6") {
  const usage = object(payload.usage);
  const inputDetails = object(usage.input_tokens_details);
  const outputDetails = object(usage.output_tokens_details);
  const model = String(payload.model || fallbackModel);
  const inputTokens = integer(usage.input_tokens);
  const cachedInputTokens = Math.min(inputTokens, integer(inputDetails.cached_tokens));
  const outputTokens = integer(usage.output_tokens);
  const reasoningTokens = Math.min(outputTokens, integer(outputDetails.reasoning_tokens));
  const totalTokens = integer(usage.total_tokens) || inputTokens + outputTokens;
  const webSearchCalls = countWebSearchCalls(payload);
  const rates = ratesFor(model);
  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const tokenCostUsd = rates.known
    ? (uncachedInputTokens * rates.input + cachedInputTokens * rates.cachedInput + outputTokens * rates.output) / 1_000_000
    : 0;
  const webSearchRatePerThousand = 10;
  const toolCostUsd = webSearchCalls * webSearchRatePerThousand / 1_000;
  return {
    model,
    providerResponseId: String(payload.id || ""),
    providerStatus: String(payload.status || "unknown"),
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    webSearchCalls,
    inputRatePerMillion: rates.input,
    cachedInputRatePerMillion: rates.cachedInput,
    outputRatePerMillion: rates.output,
    webSearchRatePerThousand,
    tokenCostUsd,
    toolCostUsd,
    actualUsd: tokenCostUsd + toolCostUsd,
    pricingStatus: rates.known ? "MEASURED" : "MODEL_RATE_REQUIRED",
    pricingSource: PRICING_SOURCE,
    usageJson: JSON.stringify({
      usage,
      incompleteDetails: object(payload.incomplete_details),
      error: object(payload.error),
    }),
  };
}

export async function recordOpenAIUsage(args: {
  db: UsageDatabase;
  programId: string;
  runId: string;
  stageKey: string;
  costType: string;
  payload: UsageRecord;
  fallbackModel?: string;
}) {
  const usage = measureOpenAIUsage(args.payload, args.fallbackModel);
  if (!usage.providerResponseId) throw new Error("OpenAI usage cannot be recorded without a response ID");
  const now = new Date().toISOString();
  const eventId = `${usage.providerResponseId}-USAGE`;
  // One immutable cost event per provider response. A run-level key would
  // overwrite earlier requests and make the Cost Center under-report spend.
  const costEventId = `${usage.providerResponseId}-COST`;
  const note = usage.pricingStatus === "MEASURED"
    ? `${usage.model} · ${usage.inputTokens.toLocaleString()} input (${usage.cachedInputTokens.toLocaleString()} cached) · ${usage.outputTokens.toLocaleString()} output (${usage.reasoningTokens.toLocaleString()} reasoning) · ${usage.webSearchCalls} web searches`
    : `${usage.model} usage captured; add a verified model rate to calculate USD`;
  await args.db.batch([
    args.db.prepare(`INSERT INTO v7_ai_usage_events (
      id,program_id,run_id,stage_key,provider,model_id,provider_response_id,provider_status,
      input_tokens,cached_input_tokens,output_tokens,reasoning_tokens,total_tokens,web_search_calls,
      input_rate_per_million,cached_input_rate_per_million,output_rate_per_million,web_search_rate_per_thousand,
      token_cost_usd,tool_cost_usd,actual_usd,pricing_status,pricing_source,usage_json,measured_at,updated_at
    ) VALUES (?,?,?,?,'OPENAI',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(provider_response_id) DO UPDATE SET
      provider_status=excluded.provider_status,input_tokens=excluded.input_tokens,cached_input_tokens=excluded.cached_input_tokens,
      output_tokens=excluded.output_tokens,reasoning_tokens=excluded.reasoning_tokens,total_tokens=excluded.total_tokens,
      web_search_calls=excluded.web_search_calls,token_cost_usd=excluded.token_cost_usd,tool_cost_usd=excluded.tool_cost_usd,
      actual_usd=excluded.actual_usd,pricing_status=excluded.pricing_status,usage_json=excluded.usage_json,
      measured_at=excluded.measured_at,updated_at=excluded.updated_at`).bind(
      eventId, args.programId, args.runId, args.stageKey, usage.model, usage.providerResponseId, usage.providerStatus,
      usage.inputTokens, usage.cachedInputTokens, usage.outputTokens, usage.reasoningTokens, usage.totalTokens, usage.webSearchCalls,
      usage.inputRatePerMillion, usage.cachedInputRatePerMillion, usage.outputRatePerMillion, usage.webSearchRatePerThousand,
      usage.tokenCostUsd, usage.toolCostUsd, usage.actualUsd, usage.pricingStatus, usage.pricingSource, usage.usageJson, now, now,
    ),
    args.db.prepare(`INSERT INTO v7_cost_events (
      id,program_id,stage_key,provider,cost_class,cost_type,status,estimated_usd,actual_usd,note,updated_at
    ) VALUES (?,?,?,'OPENAI','VARIABLE',?,?,?, ?,?,?)
    ON CONFLICT(id) DO UPDATE SET status=excluded.status,estimated_usd=excluded.estimated_usd,
      actual_usd=excluded.actual_usd,note=excluded.note,updated_at=excluded.updated_at`).bind(
      costEventId, args.programId, args.stageKey, args.costType, usage.pricingStatus, usage.actualUsd, usage.actualUsd, note, now,
    ),
  ]);
  return usage;
}

import { readDriveConnection, verifyDriveConnection } from "../../../../lib/google-drive";

type RuntimeEnv = {
  DB?: unknown; BUCKET?: unknown;
  ELEVENLABS_API_KEY?: string; OPENAI_API_KEY?: string; YOUTUBE_API_KEY?: string;
  PEXELS_API_KEY?: string; PIXABAY_API_KEY?: string;
  SHUTTERSTOCK_CONSUMER_KEY?: string; SHUTTERSTOCK_CONSUMER_SECRET?: string;
  GOOGLE_DRIVE_CLIENT_ID?: string; GOOGLE_DRIVE_CLIENT_SECRET?: string; GOOGLE_DRIVE_TOKEN_KEY?: string;
  MEDIA_EXECUTOR_SHARED_SECRET?: string;
};

type ConnectionStatus = "CONNECTED" | "KEY_REQUIRED" | "CONFIG_REQUIRED" | "OAUTH_SETUP" | "BLOCKED";

type FactoryConnection = {
  id: string; name: string; group: "AI_GENERATION" | "VOICE_SOUND" | "MEDIA_SOURCING" | "MEDIA_EXECUTION" | "STORAGE_LIBRARY" | "DISTRIBUTION_ANALYTICS";
  status: ConnectionStatus; capability: string; requiredKeys: string[]; securityModel: string; nextAction: string;
};

async function runtimeEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

function configured(value: string | undefined) { return Boolean(value && value.trim()); }

async function connectionCatalog() {
  const env = await runtimeEnv();
  const driveConnection = await readDriveConnection().catch(() => null);
  const driveConfigured = configured(env.GOOGLE_DRIVE_CLIENT_ID) && configured(env.GOOGLE_DRIVE_CLIENT_SECRET) && configured(env.GOOGLE_DRIVE_TOKEN_KEY);
  const connections: FactoryConnection[] = [
    { id: "openai", name: "OpenAI", group: "AI_GENERATION", status: configured(env.OPENAI_API_KEY) ? "CONNECTED" : "KEY_REQUIRED", capability: "Research synthesis, script development, critics and image generation adapters.", requiredKeys: ["OPENAI_API_KEY"], securityModel: "Protected server secret · capability-based routing", nextAction: configured(env.OPENAI_API_KEY) ? "Ready for server-side adapters" : "Add OPENAI_API_KEY" },
    { id: "elevenlabs", name: "ElevenLabs", group: "VOICE_SOUND", status: configured(env.ELEVENLABS_API_KEY) ? "CONNECTED" : "KEY_REQUIRED", capability: "Locked narrator identity, segment generation, timing and pronunciation QA.", requiredKeys: ["ELEVENLABS_API_KEY"], securityModel: "Protected server secret · one immutable voice signature per master", nextAction: configured(env.ELEVENLABS_API_KEY) ? "Connected · Authorization voice locked" : "Add ELEVENLABS_API_KEY" },
    { id: "openverse", name: "Openverse", group: "MEDIA_SOURCING", status: "CONNECTED", capability: "Commercially reusable image discovery with creator and license metadata.", requiredKeys: [], securityModel: "Public API · license metadata retained", nextAction: "Ready · no key required" },
    { id: "pexels", name: "Pexels", group: "MEDIA_SOURCING", status: configured(env.PEXELS_API_KEY) ? "CONNECTED" : "KEY_REQUIRED", capability: "Landscape photo and video discovery for visual beat candidates.", requiredKeys: ["PEXELS_API_KEY"], securityModel: "Protected server secret · source license retained", nextAction: configured(env.PEXELS_API_KEY) ? "Ready for unified search" : "Add PEXELS_API_KEY" },
    { id: "pixabay", name: "Pixabay", group: "MEDIA_SOURCING", status: configured(env.PIXABAY_API_KEY) ? "CONNECTED" : "KEY_REQUIRED", capability: "Photo and footage discovery with commercial-use license references.", requiredKeys: ["PIXABAY_API_KEY"], securityModel: "Protected server secret · source license retained", nextAction: configured(env.PIXABAY_API_KEY) ? "Ready for unified search" : "Add PIXABAY_API_KEY" },
    { id: "shutterstock", name: "Shutterstock", group: "MEDIA_SOURCING", status: configured(env.SHUTTERSTOCK_CONSUMER_KEY) && configured(env.SHUTTERSTOCK_CONSUMER_SECRET) ? "CONNECTED" : "KEY_REQUIRED", capability: "Paid image and footage search with a separate purchase and rights-evidence gate.", requiredKeys: ["SHUTTERSTOCK_CONSUMER_KEY", "SHUTTERSTOCK_CONSUMER_SECRET"], securityModel: "Protected server secrets · license proof required before use", nextAction: configured(env.SHUTTERSTOCK_CONSUMER_KEY) && configured(env.SHUTTERSTOCK_CONSUMER_SECRET) ? "Search ready · license handoff retained" : "Add consumer key + secret" },
    { id: "media_executor", name: "Media Execution Worker", group: "MEDIA_EXECUTION", status: configured(env.MEDIA_EXECUTOR_SHARED_SECRET) ? "CONNECTED" : "KEY_REQUIRED", capability: "Queue-backed ffprobe, ffmpeg frame extraction, source-hash verification and bounded media transforms.", requiredKeys: ["MEDIA_EXECUTOR_SHARED_SECRET"], securityModel: "Protected shared secret + per-job lease token · no AI authority", nextAction: configured(env.MEDIA_EXECUTOR_SHARED_SECRET) ? "Worker authentication ready · start executor heartbeat" : "Add a strong random executor secret" },
    { id: "database", name: "Factory Database", group: "STORAGE_LIBRARY", status: env.DB ? "CONNECTED" : "BLOCKED", capability: "Projects, workflow state, evidence, gates, rights ledger and audit history.", requiredKeys: [], securityModel: "Factory-owned durable database", nextAction: env.DB ? "Connected · shared by every project" : "Database binding required" },
    { id: "owned_vault", name: "Owned Media Vault", group: "STORAGE_LIBRARY", status: env.BUCKET ? "CONNECTED" : "BLOCKED", capability: "Private personal images, footage, narration stems and rendered masters.", requiredKeys: [], securityModel: "Private object storage · per-asset provenance", nextAction: env.BUCKET ? "Connected · shared factory library" : "Storage binding required" },
    { id: "google_drive", name: "Google Drive", group: "STORAGE_LIBRARY", status: driveConfigured ? driveConnection?.status === "VERIFIED" ? "CONNECTED" : "OAUTH_SETUP" : "CONFIG_REQUIRED", capability: "Primary user-owned canonical archive for verified assets, rights evidence, masters and recovery.", requiredKeys: ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_TOKEN_KEY"], securityModel: "OAuth drive.file · AES-GCM token vault · round-trip evidence", nextAction: !driveConfigured ? "Add the three protected Drive values" : driveConnection?.status === "VERIFIED" ? "Canonical archive verified" : "Authorize Google Drive in Storage settings" },
    { id: "youtube", name: "YouTube Data & Analytics", group: "DISTRIBUTION_ANALYTICS", status: configured(env.YOUTUBE_API_KEY) ? "OAUTH_SETUP" : "CONFIG_REQUIRED", capability: "Reference discovery, publishing, performance ingestion and learning loops.", requiredKeys: ["YOUTUBE_API_KEY"], securityModel: "API key for public discovery · channel OAuth required for publishing/analytics", nextAction: configured(env.YOUTUBE_API_KEY) ? "Public discovery ready · channel OAuth remains" : "Add YouTube API key, then channel OAuth" },
  ];
  return { env, connections };
}

async function fetchChecked(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    const raw = await response.text().catch(() => ""); let code = `HTTP_${response.status}`; let detail = "";
    try {
      const parsed = JSON.parse(raw) as { detail?: string | { status?: string; message?: string }; message?: string };
      if (typeof parsed.detail === "string") detail = parsed.detail;
      else if (parsed.detail && typeof parsed.detail === "object") { code = parsed.detail.status || code; detail = parsed.detail.message || ""; }
      if (!detail && typeof parsed.message === "string") detail = parsed.message;
    } catch { detail = raw; }
    const normalized = `${code} ${detail}`.toLowerCase(); let action = detail.replace(/\s+/g, " ").slice(0, 180);
    if (/invalid.*api|api.*key|unauthor/.test(normalized)) action = "API key was rejected. Replace the protected key and retry.";
    else if (/permission|scope|forbidden/.test(normalized) || response.status === 403) action = "The key lacks the required scope or its IP allowlist blocks this server.";
    else if (/quota|credit|character limit/.test(normalized)) action = "The key or workspace credit limit has been reached.";
    throw new Error(`Provider ${code} · HTTP ${response.status}${action ? ` · ${action}` : ""}`);
  }
}

function shutterstockHeaders(env: RuntimeEnv) {
  return {
    Accept: "application/json",
    "User-Agent": "Frameflow-YouTube-Factory/1.0",
    Authorization: `Basic ${btoa(`${env.SHUTTERSTOCK_CONSUMER_KEY}:${env.SHUTTERSTOCK_CONSUMER_SECRET}`)}`,
  };
}

async function testConnection(provider: string) {
  const { env, connections } = await connectionCatalog();
  const connection = connections.find((item) => item.id === provider);
  if (!connection) return { provider, status: "UNKNOWN", latencyMs: 0, message: "Unknown factory connection" };
  if (connection.status !== "CONNECTED") return { provider, status: connection.status, latencyMs: 0, message: connection.nextAction };
  const startedAt = Date.now();
  try {
    if (provider === "openai") await fetchChecked("https://api.openai.com/v1/models", { Authorization: `Bearer ${env.OPENAI_API_KEY}` });
    else if (provider === "elevenlabs") await fetchChecked("https://api.elevenlabs.io/v1/models", { "content-type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY || "" });
    else if (provider === "openverse") await fetchChecked("https://api.openverse.org/v1/images/?q=money&page_size=1");
    else if (provider === "pexels") await fetchChecked("https://api.pexels.com/v1/curated?per_page=1", { Authorization: env.PEXELS_API_KEY || "" });
    else if (provider === "pixabay") await fetchChecked(`https://pixabay.com/api/?key=${encodeURIComponent(env.PIXABAY_API_KEY || "")}&q=money&per_page=3&safesearch=true`);
    else if (provider === "shutterstock") await fetchChecked("https://api.shutterstock.com/v2/images/search?query=money&page=1&per_page=5&view=minimal", shutterstockHeaders(env));
    else if (provider === "google_drive") await verifyDriveConnection();
    else if (provider === "media_executor") return { provider, status: "CONNECTED", latencyMs: Date.now() - startedAt, message: "Executor authentication is configured; Stage 09 heartbeat confirms runtime health" };
    else if (provider === "youtube") await fetchChecked(`https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${encodeURIComponent(env.YOUTUBE_API_KEY || "")}`);
    return { provider, status: "CONNECTED", latencyMs: Date.now() - startedAt, message: provider === "database" || provider === "owned_vault" ? "Factory binding is available" : provider === "elevenlabs" ? "ElevenLabs API key authenticated · Text-to-Speech remains protected server-side" : "Server-side connection test passed" };
  } catch (error) {
    return { provider, status: "FAILED", latencyMs: Date.now() - startedAt, message: error instanceof Error ? error.message : "Connection test failed" };
  }
}

export async function GET(request: Request) {
  try {
    const provider = new URL(request.url).searchParams.get("test");
    if (provider) return Response.json(await testConnection(provider));
    const { connections } = await connectionCatalog();
    const connected = connections.filter((connection) => connection.status === "CONNECTED").length;
    return Response.json({ scope: "FACTORY", connections, summary: { total: connections.length, connected, attention: connections.length - connected }, policy: { secretStorage: "PROTECTED_PRODUCTION_ENV", projectInheritance: "READ_ONLY", browserExposure: "DENIED", rightsGate: "REQUIRED_PER_ASSET" } });
  } catch (error) {
    console.error("Factory connections GET failed", error);
    return Response.json({ error: "Factory connections could not be loaded" }, { status: 500 });
  }
}

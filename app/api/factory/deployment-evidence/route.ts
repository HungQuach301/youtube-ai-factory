import { getChatGPTUser as getCurrentUser } from "../../../chatgpt-auth";
import {
  DeploymentReceiptError,
  readLatestDeploymentReceipt,
  recordDeploymentReceipt,
  type DeploymentReceiptDatabase,
} from "../../../../lib/deployment-receipt";

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 32 * 1024;

type RuntimeEnv = {
  DB?: DeploymentReceiptDatabase;
  FACTORY_EXPERT_EMAILS?: string;
};

function failure(error: DeploymentReceiptError) {
  return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: NO_STORE });
}

async function runtime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function authorize(env: RuntimeEnv) {
  const user = await getCurrentUser();
  if (!user) throw new DeploymentReceiptError("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before reading deployment evidence", 401);
  const ownerAllowlist = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!ownerAllowlist.size || !ownerAllowlist.has(user.email.trim().toLowerCase())) {
    throw new DeploymentReceiptError("OWNER_AUTHORIZATION_REQUIRED", "This identity is not authorized to access deployment evidence", 403);
  }
  return user;
}

async function readBoundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_TOO_LARGE", "Deployment receipt exceeds 32 KB", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_TOO_LARGE", "Deployment receipt exceeds 32 KB", 413);
  try { return JSON.parse(text); }
  catch { throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_JSON_INVALID", "Deployment receipt is not valid JSON", 400); }
}

export async function GET() {
  try {
    const env = await runtime();
    await authorize(env);
    if (!env.DB) throw new DeploymentReceiptError("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    return Response.json(await readLatestDeploymentReceipt(env.DB), { headers: NO_STORE });
  } catch (error) {
    return failure(error instanceof DeploymentReceiptError ? error : new DeploymentReceiptError("DEPLOYMENT_EVIDENCE_UNAVAILABLE", "Deployment evidence projection is unavailable", 503));
  }
}

export async function POST(request: Request) {
  try {
    const env = await runtime();
    const user = await authorize(env);
    if (!env.DB) throw new DeploymentReceiptError("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new DeploymentReceiptError("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    }
    const result = await recordDeploymentReceipt(env.DB, await readBoundedBody(request), user.email.toLowerCase());
    return Response.json(result, { status: result.idempotent ? 200 : 201, headers: NO_STORE });
  } catch (error) {
    return failure(error instanceof DeploymentReceiptError ? error : new DeploymentReceiptError("DEPLOYMENT_RECEIPT_WRITE_UNAVAILABLE", "Deployment receipt could not be recorded", 503));
  }
}

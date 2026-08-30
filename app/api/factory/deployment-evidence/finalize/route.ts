import { getChatGPTUser as getCurrentUser } from "../../../../chatgpt-auth";
import { authorizeDeploymentReceiptOwner } from "../../../../../lib/deployment-receipt-auth";
import { DeploymentReceiptError, type DeploymentReceiptDatabase } from "../../../../../lib/deployment-receipt";
import {
  assertOwnerSameOrigin,
  finalizeOwnerDeploymentReceipt,
} from "../../../../../lib/deployment-receipt-owner";

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 4 * 1024;

type RuntimeEnv = {
  DB?: DeploymentReceiptDatabase;
  FACTORY_EXPERT_EMAILS?: string;
  FACTORY_DEPLOYMENT_RECEIPT_EVIDENCE?: string;
};

function failure(error: DeploymentReceiptError) {
  return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: NO_STORE });
}

async function runtime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function requireOwnerAuth(env: RuntimeEnv) {
  const user = await getCurrentUser();
  if (!user) throw new DeploymentReceiptError("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before finalizing deployment evidence", 401);
  return authorizeDeploymentReceiptOwner(user, env.FACTORY_EXPERT_EMAILS);
}

async function readBoundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_TOO_LARGE", "Owner command exceeds 4 KB", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_TOO_LARGE", "Owner command exceeds 4 KB", 413);
  return text;
}

export async function POST(request: Request) {
  try {
    const env = await runtime();
    const owner = await requireOwnerAuth(env);
    assertOwnerSameOrigin(request);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new DeploymentReceiptError("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    }
    if (!env.DB) throw new DeploymentReceiptError("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const rawBody = await readBoundedBody(request);
    const result = await finalizeOwnerDeploymentReceipt(env.DB, rawBody, owner.email, env.FACTORY_DEPLOYMENT_RECEIPT_EVIDENCE, {
      builtSourceTree: __FACTORY_BUILD_SOURCE_TREE__,
    });
    return Response.json(result, { status: result.replay_state === "CREATED" ? 201 : 200, headers: NO_STORE });
  } catch (error) {
    return failure(error instanceof DeploymentReceiptError ? error : new DeploymentReceiptError("DEPLOYMENT_RECEIPT_WRITE_UNAVAILABLE", "Deployment receipt could not be finalized", 503));
  }
}

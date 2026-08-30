import { getChatGPTUser as getCurrentUser } from "../../../chatgpt-auth";
import {
  DeploymentReceiptError,
  recordAuthorizedDeploymentReceipt,
  type DeploymentReceiptDatabase,
} from "../../../../lib/deployment-receipt";
import {
  authorizeDeploymentReceiptOwner,
  verifyDeploymentReceiptAutomationAuth,
  type VerifiedDeploymentReceiptAutomationRequest,
} from "../../../../lib/deployment-receipt-auth";
import { readOwnerDeploymentReceiptState } from "../../../../lib/deployment-receipt-owner";

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 32 * 1024;

type RuntimeEnv = {
  DB?: DeploymentReceiptDatabase;
  FACTORY_EXPERT_EMAILS?: string;
  FACTORY_DEPLOYMENT_RECEIPT_AUTOMATION_SECRET?: string;
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
  if (!user) throw new DeploymentReceiptError("SIWC_AUTHENTICATION_REQUIRED", "Sign in with ChatGPT before reading deployment evidence", 401);
  return authorizeDeploymentReceiptOwner(user, env.FACTORY_EXPERT_EMAILS);
}

async function authorize(
  env: RuntimeEnv,
  request: Request,
  rawBody: string,
): Promise<VerifiedDeploymentReceiptAutomationRequest> {
  try {
    return await verifyDeploymentReceiptAutomationAuth(request, rawBody, env.FACTORY_DEPLOYMENT_RECEIPT_AUTOMATION_SECRET);
  } catch (error) {
    if (error instanceof DeploymentReceiptError) throw error;
    throw new DeploymentReceiptError("AUTOMATION_AUTHENTICATION_REQUIRED", "A valid scoped automation credential is required", 401);
  }
}

async function readBoundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_TOO_LARGE", "Deployment receipt exceeds 32 KB", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new DeploymentReceiptError("DEPLOYMENT_RECEIPT_BODY_TOO_LARGE", "Deployment receipt exceeds 32 KB", 413);
  return text;
}

export async function GET() {
  try {
    const env = await runtime();
    await requireOwnerAuth(env);
    if (!env.DB) throw new DeploymentReceiptError("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    return Response.json(await readOwnerDeploymentReceiptState(env.DB, env.FACTORY_DEPLOYMENT_RECEIPT_EVIDENCE, {
      builtSourceTree: __FACTORY_BUILD_SOURCE_TREE__,
    }), { headers: NO_STORE });
  } catch (error) {
    return failure(error instanceof DeploymentReceiptError ? error : new DeploymentReceiptError("DEPLOYMENT_EVIDENCE_UNAVAILABLE", "Deployment evidence projection is unavailable", 503));
  }
}

export async function POST(request: Request) {
  try {
    const env = await runtime();
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new DeploymentReceiptError("JSON_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415);
    }
    const rawBody = await readBoundedBody(request);
    const authorization = await authorize(env, request, rawBody);
    if (!env.DB) throw new DeploymentReceiptError("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    const result = await recordAuthorizedDeploymentReceipt(env.DB, authorization.body, authorization);
    return Response.json(result, { status: result.idempotent ? 200 : 201, headers: NO_STORE });
  } catch (error) {
    return failure(error instanceof DeploymentReceiptError ? error : new DeploymentReceiptError("DEPLOYMENT_RECEIPT_WRITE_UNAVAILABLE", "Deployment receipt could not be recorded", 503));
  }
}

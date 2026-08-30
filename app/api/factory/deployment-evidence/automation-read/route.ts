import { DeploymentReceiptError, readLatestDeploymentReceipt, type DeploymentReceiptDatabase } from "../../../../../lib/deployment-receipt";
import { verifyDeploymentReceiptAutomationReadAuth } from "../../../../../lib/deployment-receipt-auth";

const NO_STORE = { "cache-control": "no-store" };

type RuntimeEnv = {
  DB?: DeploymentReceiptDatabase;
  FACTORY_DEPLOYMENT_RECEIPT_AUTOMATION_SECRET?: string;
};

function failure(error: DeploymentReceiptError) {
  return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: NO_STORE });
}

async function runtime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function requireAutomationReadAuth(env: RuntimeEnv, request: Request) {
  try {
    return await verifyDeploymentReceiptAutomationReadAuth(request, env.FACTORY_DEPLOYMENT_RECEIPT_AUTOMATION_SECRET);
  } catch (error) {
    if (error instanceof DeploymentReceiptError) throw error;
    throw new DeploymentReceiptError("AUTOMATION_AUTHENTICATION_REQUIRED", "A valid scoped automation read credential is required", 401);
  }
}

export async function GET(request: Request) {
  try {
    const env = await runtime();
    await requireAutomationReadAuth(env, request);
    if (!env.DB) throw new DeploymentReceiptError("CANONICAL_DATABASE_UNAVAILABLE", "Canonical database binding is unavailable", 503);
    return Response.json(await readLatestDeploymentReceipt(env.DB), { headers: NO_STORE });
  } catch (error) {
    return failure(error instanceof DeploymentReceiptError ? error : new DeploymentReceiptError("DEPLOYMENT_EVIDENCE_UNAVAILABLE", "Deployment evidence projection is unavailable", 503));
  }
}

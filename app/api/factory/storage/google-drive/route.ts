import {
  createAuthorizationUrl,
  disconnectDrive,
  driveStatus,
  verifyDriveConnection,
} from "../../../../../lib/google-drive";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  appendWriteCommandAudit,
  hashActorSubject,
  type WriteCommandAuditDatabase,
  type WriteCommandAuditIdentity,
} from "../../../../../lib/write-command-audit";

const OWNER_HANDLER_IDENTITY = "app/api/factory/storage/google-drive/route.ts#POST";
const OWNER_ACTIONS = new Set(["VERIFY", "DISCONNECT"]);
const MAX_OWNER_BODY_BYTES = 16 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

type GoogleDriveOwnerAction = "VERIFY" | "DISCONNECT";
type GoogleDriveOwnerRuntimeEnv = {
  DB?: WriteCommandAuditDatabase;
  FACTORY_EXPERT_EMAILS?: string;
};

function ownerFailure(error: string, status: number) {
  return Response.json({ error }, { status });
}

function googleDriveOwnerSameOrigin(request: Request) {
  const url = new URL(request.url);
  return request.method === "POST"
    && url.pathname === "/api/factory/storage/google-drive"
    && url.search === ""
    && request.headers.get("origin") === url.origin
    && request.headers.get("sec-fetch-site") === "same-origin";
}

async function googleDriveOwnerRuntimeEnv(): Promise<GoogleDriveOwnerRuntimeEnv> {
  const { env } = await import("cloudflare:workers");
  return env as GoogleDriveOwnerRuntimeEnv;
}

async function authorizeGoogleDriveOwnerWrite(request: Request) {
  const user = await getChatGPTUser();
  if (!user?.email) return ownerFailure("SIWC_AUTHENTICATION_REQUIRED", 401);

  const env = await googleDriveOwnerRuntimeEnv();
  const normalizedEmail = user.email.trim().toLowerCase();
  const owners = String(env.FACTORY_EXPERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (owners.length === 0) return ownerFailure("OWNER_WRITE_ALLOWLIST_UNCONFIGURED", 503);
  if (!owners.includes(normalizedEmail)) return ownerFailure("OWNER_WRITE_AUTHORIZATION_REQUIRED", 403);
  if (!googleDriveOwnerSameOrigin(request)) return ownerFailure("OWNER_WRITE_SAME_ORIGIN_REQUIRED", 403);
  if (!env.DB) return ownerFailure("CANONICAL_DATABASE_UNAVAILABLE", 503);

  return { db: env.DB, normalizedEmail };
}

async function sha256RawBody(bytes: ArrayBuffer) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function readBoundedGoogleDriveOwnerBody(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return ownerFailure("JSON_CONTENT_TYPE_REQUIRED", 415);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_OWNER_BODY_BYTES) {
    return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_OWNER_BODY_BYTES) return ownerFailure("OWNER_WRITE_BODY_TOO_LARGE", 413);

  let parsed: unknown;
  try {
    const rawBody = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    parsed = JSON.parse(rawBody);
  } catch {
    return ownerFailure("OWNER_WRITE_JSON_INVALID", 400);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.action !== "string") return ownerFailure("OWNER_WRITE_COMMAND_INVALID", 400);
  if (Object.keys(record).some((key) => key !== "action")) {
    return ownerFailure("OWNER_WRITE_COMMAND_FIELD_FORBIDDEN", 400);
  }
  if (!OWNER_ACTIONS.has(record.action)) return ownerFailure("OWNER_WRITE_ACTION_FORBIDDEN", 403);

  return {
    action: record.action as GoogleDriveOwnerAction,
    bodySha256: await sha256RawBody(bytes),
  };
}

function googleDriveOwnerCorrelationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim() ?? "";
  return CORRELATION_ID_PATTERN.test(supplied) ? supplied : `google-drive-owner:${crypto.randomUUID()}`;
}

async function googleDriveOwnerAuditIdentity(
  request: Request,
  normalizedEmail: string,
  action: GoogleDriveOwnerAction,
  bodySha256: string,
): Promise<WriteCommandAuditIdentity> {
  return {
    handlerIdentity: OWNER_HANDLER_IDENTITY,
    actorType: "CHATGPT_OWNER",
    actorSubjectHash: await hashActorSubject("CHATGPT_OWNER", normalizedEmail),
    action,
    resourceScope: "factory:storage:google-drive",
    correlationId: googleDriveOwnerCorrelationId(request),
    requestHash: bodySha256,
  };
}

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProtocol || "https"}://${forwardedHost}`;
  return url.origin;
}

export async function GET(request: Request) {
  try {
    const origin = requestOrigin(request);
    const action = new URL(request.url).searchParams.get("action");
    if (action === "connect") {
      return Response.redirect(await createAuthorizationUrl(origin), 302);
    }
    return Response.json(await driveStatus(origin));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Google Drive status could not load" }, { status: 500 });
  }
}

async function executeGoogleDriveOwnerAction(request: Request, action: GoogleDriveOwnerAction) {
  if (action === "VERIFY") {
    await verifyDriveConnection();
    return Response.json(await driveStatus(requestOrigin(request)));
  }
  if (action === "DISCONNECT") {
    await disconnectDrive();
    return Response.json(await driveStatus(requestOrigin(request)));
  }
  return ownerFailure("OWNER_WRITE_ACTION_FORBIDDEN", 403);
}

async function runAuditedGoogleDriveOwnerAction(
  db: WriteCommandAuditDatabase,
  identity: WriteCommandAuditIdentity,
  execute: () => Promise<Response>,
) {
  await appendWriteCommandAudit(db, identity, "AUTHORIZED", null);

  let response: Response;
  try {
    response = await execute();
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }

  if (!response.ok) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    return response;
  }

  try {
    await appendWriteCommandAudit(db, identity, "SUCCEEDED", null);
    return response;
  } catch (error) {
    await appendWriteCommandAudit(db, identity, "FAILED", null);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeGoogleDriveOwnerWrite(request);
    if (authorization instanceof Response) return authorization;

    const body = await readBoundedGoogleDriveOwnerBody(request);
    if (body instanceof Response) return body;

    const auditIdentity = await googleDriveOwnerAuditIdentity(
      request,
      authorization.normalizedEmail,
      body.action,
      body.bodySha256,
    );
    return await runAuditedGoogleDriveOwnerAction(
      authorization.db,
      auditIdentity,
      () => executeGoogleDriveOwnerAction(request, body.action),
    );
  } catch (error) {
    console.error("Google Drive action failed", error);
    return ownerFailure("GOOGLE_DRIVE_ACTION_FAILED", 500);
  }
}

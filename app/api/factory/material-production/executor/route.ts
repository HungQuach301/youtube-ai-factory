import {
  executeAuthorizedMaterialExecutorCommand,
  MaterialExecutorError,
  authorizeMaterialExecutorRequest as verifyMaterialExecutorAuth,
} from "../../../../../lib/material-production-executor";

type Row = Record<string, unknown>;

async function authorizeExecutorCommand(request: Request, body: Row, rawBody: string) {
  const actorType = "INTERNAL_SYSTEM";
  const authorization = await verifyMaterialExecutorAuth(request, body, rawBody);
  if (!authorization || actorType !== "INTERNAL_SYSTEM") throw new Error("MEDIA_EXECUTOR_UNAUTHORIZED 401 FORBIDDEN 403");
  return authorization;
}

export async function POST(request: Request) {
  let action = "UNKNOWN";
  try {
    const rawBody = await request.text();
    let body: Row;
    try {
      body = JSON.parse(rawBody) as Row;
    } catch {
      return Response.json({ error: "EXECUTOR_COMMAND_JSON_INVALID" }, { status: 400 });
    }
    action = String(body.action || "").trim() || "UNKNOWN";
    const authorization = await authorizeExecutorCommand(request, body, rawBody);
    return await executeAuthorizedMaterialExecutorCommand(authorization);
  } catch (error) {
    const code = error instanceof MaterialExecutorError
      ? error.code
      : error instanceof Error
        ? error.message.split(" · ")[0]
        : "MEDIA_EXECUTOR_COMMAND_FAILED";
    const status = error instanceof MaterialExecutorError
      ? error.status
      : /UNAUTHORIZED/.test(code)
        ? 401
        : /FORBIDDEN/.test(code)
          ? 403
          : /LEASE|CONFLICT|MISMATCH|MISSING|INVALID|REQUIRED|BLOCKED/.test(code)
            ? 409
            : 500;
    console.error(JSON.stringify({ event: "MATERIAL_EXECUTOR_COMMAND_FAILED", action, code, at: new Date().toISOString() }));
    return Response.json({ error: code }, { status });
  }
}

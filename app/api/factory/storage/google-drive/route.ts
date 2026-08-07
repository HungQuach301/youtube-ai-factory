import {
  createAuthorizationUrl,
  disconnectDrive,
  driveStatus,
  verifyDriveConnection,
} from "../../../../../lib/google-drive";

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

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { action?: string };
    if (payload.action === "VERIFY") {
      await verifyDriveConnection();
      return Response.json(await driveStatus(requestOrigin(request)));
    }
    if (payload.action === "DISCONNECT") {
      await disconnectDrive();
      return Response.json(await driveStatus(requestOrigin(request)));
    }
    return Response.json({ error: "Unsupported Google Drive action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Google Drive action failed" }, { status: 500 });
  }
}

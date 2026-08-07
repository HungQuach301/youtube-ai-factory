import { completeAuthorization } from "../../../../../../lib/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  try {
    if (providerError) throw new Error(`Google authorization stopped: ${providerError}`);
    if (!code || !state) throw new Error("Google authorization response is incomplete");
    await completeAuthorization(code, state);
    return Response.redirect(new URL("/settings/storage?drive=connected", url.origin), 302);
  } catch (error) {
    const destination = new URL("/settings/storage", url.origin);
    destination.searchParams.set("drive", "error");
    destination.searchParams.set("reason", error instanceof Error ? error.message.slice(0, 180) : "Authorization failed");
    return Response.redirect(destination, 302);
  }
}

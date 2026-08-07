const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const CONNECTION_ID = "FACTORY_GOOGLE_DRIVE";
const PROGRAM_ID = "YTAF-V7-GREENFIELD";

type RuntimeEnv = {
  DB?: D1Database;
  GOOGLE_DRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_SECRET?: string;
  GOOGLE_DRIVE_TOKEN_KEY?: string;
};

type DriveConnectionRow = {
  id: string;
  status: string;
  refresh_token_ciphertext: string | null;
  refresh_token_iv: string | null;
  scope: string;
  root_folder_id: string | null;
  root_folder_name: string;
  audit_folder_id: string | null;
  marker_file_id: string | null;
  last_verified_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type DriveFile = { id: string; name: string; mimeType?: string; trashed?: boolean; webViewLink?: string };

const schema = [
  `CREATE TABLE IF NOT EXISTS v7_google_drive_connections (id text PRIMARY KEY NOT NULL, status text DEFAULT 'NOT_CONNECTED' NOT NULL, refresh_token_ciphertext text, refresh_token_iv text, scope text DEFAULT '${DRIVE_SCOPE}' NOT NULL, root_folder_id text, root_folder_name text DEFAULT 'Frameflow Factory' NOT NULL, audit_folder_id text, marker_file_id text, last_verified_at text, last_error text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_google_drive_oauth_states (id text PRIMARY KEY NOT NULL, redirect_uri text NOT NULL, return_to text DEFAULT '/settings/storage' NOT NULL, expires_at text NOT NULL, consumed_at text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS v7_storage_sync_events (id text PRIMARY KEY NOT NULL, storage_tier text NOT NULL, action text NOT NULL, status text NOT NULL, artifact_id text, content_hash text, evidence_json text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)`,
] as const;

function valueConfigured(value?: string) {
  return Boolean(value?.trim());
}

export async function driveRuntime() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

export async function ensureDriveSchema() {
  const env = await driveRuntime();
  if (!env.DB) throw new Error("Factory database binding is unavailable");
  await env.DB.batch(schema.map((statement) => env.DB!.prepare(statement)));
  return env.DB;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function encryptionKey(secret?: string) {
  if (!secret) throw new Error("GOOGLE_DRIVE_TOKEN_KEY is not configured");
  let bytes: Uint8Array;
  if (/^[a-f0-9]{64}$/i.test(secret)) {
    bytes = Uint8Array.from(secret.match(/.{2}/g) || [], (pair) => Number.parseInt(pair, 16));
  } else {
    bytes = base64ToBytes(secret);
  }
  if (bytes.byteLength !== 32) throw new Error("GOOGLE_DRIVE_TOKEN_KEY must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptToken(token: string, secret?: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(secret), new TextEncoder().encode(token));
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

async function decryptToken(ciphertext: string, iv: string, secret?: string) {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await encryptionKey(secret), base64ToBytes(ciphertext));
  return new TextDecoder().decode(decrypted);
}

async function driveRequest<T>(accessToken: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 260);
    throw new Error(`Google Drive HTTP ${response.status}${detail ? ` · ${detail}` : ""}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function createFolder(accessToken: string, name: string, parentId?: string) {
  const metadata: Record<string, unknown> = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) metadata.parents = [parentId];
  return driveRequest<DriveFile>(accessToken, "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

function escapeQuery(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function findFolder(accessToken: string, name: string, parentId?: string) {
  const clauses = [`name='${escapeQuery(name)}'`, "mimeType='application/vnd.google-apps.folder'", "trashed=false"];
  if (parentId) clauses.push(`'${escapeQuery(parentId)}' in parents`);
  const params = new URLSearchParams({ q: clauses.join(" and "), spaces: "drive", fields: "files(id,name,mimeType,webViewLink)", pageSize: "10" });
  const result = await driveRequest<{ files: DriveFile[] }>(accessToken, `https://www.googleapis.com/drive/v3/files?${params}`);
  return result.files[0] || null;
}

async function ensureFolder(accessToken: string, name: string, parentId?: string) {
  return (await findFolder(accessToken, name, parentId)) || createFolder(accessToken, name, parentId);
}

async function createJsonMarker(accessToken: string, parentId: string) {
  const boundary = `frameflow-${crypto.randomUUID()}`;
  const marker = JSON.stringify({ pipeline: "V7", purpose: "GOOGLE_DRIVE_ARCHIVE_VERIFICATION", verifiedAt: new Date().toISOString() }, null, 2);
  const metadata = JSON.stringify({ name: "frameflow-storage-verification.json", parents: [parentId], mimeType: "application/json" });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${marker}\r\n--${boundary}--`;
  return driveRequest<DriveFile>(accessToken, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

async function materializeArchive(accessToken: string) {
  const root = await ensureFolder(accessToken, "Frameflow Factory");
  const names = ["Channels", "Reusable Library", "Rights & Licenses", "Masters", "Publishing Packages", "Audit & Recovery"];
  const folders: Record<string, DriveFile> = {};
  for (const name of names) folders[name] = await ensureFolder(accessToken, name, root.id);
  const marker = await createJsonMarker(accessToken, folders["Audit & Recovery"].id);
  const verified = await driveRequest<DriveFile>(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(marker.id)}?fields=id,name,mimeType,trashed,webViewLink`);
  if (verified.trashed || verified.name !== "frameflow-storage-verification.json") throw new Error("Drive verification marker could not be read back");
  return { root, auditFolder: folders["Audit & Recovery"], marker: verified, folderCount: names.length + 1 };
}

async function exchangeCode(code: string, redirectUri: string, env: RuntimeEnv) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_DRIVE_CLIENT_ID || "",
      client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json() as { access_token?: string; refresh_token?: string; scope?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token || !payload.refresh_token) throw new Error(payload.error_description || payload.error || "Google did not return an offline refresh token");
  return payload;
}

async function refreshAccessToken(row: DriveConnectionRow, env: RuntimeEnv) {
  if (!row.refresh_token_ciphertext || !row.refresh_token_iv) throw new Error("Encrypted Google Drive refresh token is missing");
  const refreshToken = await decryptToken(row.refresh_token_ciphertext, row.refresh_token_iv, env.GOOGLE_DRIVE_TOKEN_KEY);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_DRIVE_CLIENT_ID || "",
      client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || "Google access token refresh failed");
  return { accessToken: payload.access_token, refreshToken };
}

export function driveConfiguration(env: RuntimeEnv) {
  const keys = {
    GOOGLE_DRIVE_CLIENT_ID: valueConfigured(env.GOOGLE_DRIVE_CLIENT_ID),
    GOOGLE_DRIVE_CLIENT_SECRET: valueConfigured(env.GOOGLE_DRIVE_CLIENT_SECRET),
    GOOGLE_DRIVE_TOKEN_KEY: valueConfigured(env.GOOGLE_DRIVE_TOKEN_KEY),
  };
  return { keys, ready: Object.values(keys).every(Boolean) };
}

export async function readDriveConnection() {
  const db = await ensureDriveSchema();
  return db.prepare("SELECT * FROM v7_google_drive_connections WHERE id = ?").bind(CONNECTION_ID).first<DriveConnectionRow>();
}

export async function driveStatus(origin: string) {
  const env = await driveRuntime();
  const configuration = driveConfiguration(env);
  const connection = await readDriveConnection();
  return {
    provider: "GOOGLE_DRIVE",
    priority: "PRIMARY_CANONICAL_ARCHIVE",
    configuration,
    callbackUrl: `${origin}/api/factory/storage/google-drive/callback`,
    connected: connection?.status === "VERIFIED",
    status: !configuration.ready ? "CONFIG_REQUIRED" : connection?.status || "AUTHORIZATION_REQUIRED",
    scope: DRIVE_SCOPE,
    rootFolder: connection?.root_folder_id ? {
      id: connection.root_folder_id,
      name: connection.root_folder_name,
      url: `https://drive.google.com/drive/folders/${connection.root_folder_id}`,
    } : null,
    lastVerifiedAt: connection?.last_verified_at || null,
    lastError: connection?.last_error || null,
    localSync: { requiredForProduction: false, status: "OPTIONAL_NOT_CONNECTED" },
  };
}

export async function createAuthorizationUrl(origin: string) {
  const env = await driveRuntime();
  const configuration = driveConfiguration(env);
  if (!configuration.ready) throw new Error("Configure all three protected Google Drive values before authorization");
  const db = await ensureDriveSchema();
  const state = bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const redirectUri = `${origin}/api/factory/storage/google-drive/callback`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare("INSERT INTO v7_google_drive_oauth_states (id, redirect_uri, return_to, expires_at) VALUES (?, ?, ?, ?)").bind(state, redirectUri, "/settings/storage", expiresAt).run();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_DRIVE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function completeAuthorization(code: string, state: string) {
  const env = await driveRuntime();
  const configuration = driveConfiguration(env);
  if (!configuration.ready) throw new Error("Google Drive protected configuration is incomplete");
  const db = await ensureDriveSchema();
  const oauthState = await db.prepare("SELECT id, redirect_uri, expires_at, consumed_at FROM v7_google_drive_oauth_states WHERE id = ?").bind(state).first<{ id: string; redirect_uri: string; expires_at: string; consumed_at: string | null }>();
  if (!oauthState || oauthState.consumed_at || Date.parse(oauthState.expires_at) < Date.now()) throw new Error("OAuth state is invalid or expired");
  await db.prepare("UPDATE v7_google_drive_oauth_states SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?").bind(state).run();
  const tokens = await exchangeCode(code, oauthState.redirect_uri, env);
  const encrypted = await encryptToken(tokens.refresh_token || "", env.GOOGLE_DRIVE_TOKEN_KEY);
  const archive = await materializeArchive(tokens.access_token || "");
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO v7_google_drive_connections (id, status, refresh_token_ciphertext, refresh_token_iv, scope, root_folder_id, root_folder_name, audit_folder_id, marker_file_id, last_verified_at, last_error, updated_at)
    VALUES (?, 'VERIFIED', ?, ?, ?, ?, ?, ?, ?, ?, null, ?)
    ON CONFLICT(id) DO UPDATE SET status='VERIFIED', refresh_token_ciphertext=excluded.refresh_token_ciphertext, refresh_token_iv=excluded.refresh_token_iv, scope=excluded.scope, root_folder_id=excluded.root_folder_id, root_folder_name=excluded.root_folder_name, audit_folder_id=excluded.audit_folder_id, marker_file_id=excluded.marker_file_id, last_verified_at=excluded.last_verified_at, last_error=null, updated_at=excluded.updated_at`)
    .bind(CONNECTION_ID, encrypted.ciphertext, encrypted.iv, tokens.scope || DRIVE_SCOPE, archive.root.id, archive.root.name, archive.auditFolder.id, archive.marker.id, now, now).run();
  await db.prepare("UPDATE v7_storage_contracts SET required_for_production = 1, verification_state = 'VERIFIED', last_verified_at = ?, evidence = ?, updated_at = ? WHERE id = ?")
    .bind(now, `Google Drive OAuth, ${archive.folderCount} folders and marker read-back verified`, now, `${PROGRAM_ID}-STORAGE-DRIVE`).run();
  await db.prepare("INSERT INTO v7_storage_sync_events (id, storage_tier, action, status, artifact_id, evidence_json) VALUES (?, 'GOOGLE_DRIVE_ARCHIVE', 'OAUTH_AND_MATERIALIZE', 'VERIFIED', ?, ?)")
    .bind(`DRIVE-SYNC-${Date.now()}`, archive.marker.id, JSON.stringify({ rootFolderId: archive.root.id, markerFileId: archive.marker.id, folderCount: archive.folderCount, verifiedAt: now })).run();
  return archive;
}

export async function verifyDriveConnection() {
  const env = await driveRuntime();
  const db = await ensureDriveSchema();
  const row = await readDriveConnection();
  if (!row) throw new Error("Google Drive has not been authorized");
  try {
    const { accessToken } = await refreshAccessToken(row, env);
    if (!row.root_folder_id) throw new Error("Google Drive root folder is missing");
    const root = await driveRequest<DriveFile>(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.root_folder_id)}?fields=id,name,mimeType,trashed,webViewLink`);
    if (root.trashed || root.mimeType !== "application/vnd.google-apps.folder") throw new Error("Google Drive root folder is unavailable");
    const auditFolder = await ensureFolder(accessToken, "Audit & Recovery", root.id);
    const marker = await createJsonMarker(accessToken, auditFolder.id);
    const readBack = await driveRequest<DriveFile>(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(marker.id)}?fields=id,name,trashed`);
    if (readBack.trashed) throw new Error("Verification marker read-back failed");
    const now = new Date().toISOString();
    await db.prepare("UPDATE v7_google_drive_connections SET status='VERIFIED', audit_folder_id=?, marker_file_id=?, last_verified_at=?, last_error=null, updated_at=? WHERE id=?")
      .bind(auditFolder.id, marker.id, now, now, CONNECTION_ID).run();
    await db.prepare("UPDATE v7_storage_contracts SET required_for_production=1, verification_state='VERIFIED', last_verified_at=?, evidence=?, updated_at=? WHERE id=?")
      .bind(now, "OAuth refresh, root folder read and marker round-trip passed", now, `${PROGRAM_ID}-STORAGE-DRIVE`).run();
    await db.prepare("INSERT INTO v7_storage_sync_events (id, storage_tier, action, status, artifact_id, evidence_json) VALUES (?, 'GOOGLE_DRIVE_ARCHIVE', 'ROUND_TRIP_AUDIT', 'VERIFIED', ?, ?)")
      .bind(`DRIVE-AUDIT-${Date.now()}`, marker.id, JSON.stringify({ rootFolderId: root.id, markerFileId: marker.id, verifiedAt: now })).run();
    return { root, marker, verifiedAt: now };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Drive verification failed";
    await db.prepare("UPDATE v7_google_drive_connections SET status='REPAIR_REQUIRED', last_error=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(message, CONNECTION_ID).run();
    await db.prepare("UPDATE v7_storage_contracts SET verification_state='REPAIR_REQUIRED', evidence=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(message, `${PROGRAM_ID}-STORAGE-DRIVE`).run();
    throw error;
  }
}

export async function disconnectDrive() {
  const env = await driveRuntime();
  const db = await ensureDriveSchema();
  const row = await readDriveConnection();
  if (row?.refresh_token_ciphertext && row.refresh_token_iv) {
    const token = await decryptToken(row.refresh_token_ciphertext, row.refresh_token_iv, env.GOOGLE_DRIVE_TOKEN_KEY);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", signal: AbortSignal.timeout(10000) }).catch(() => undefined);
  }
  await db.prepare("DELETE FROM v7_google_drive_connections WHERE id=?").bind(CONNECTION_ID).run();
  await db.prepare("UPDATE v7_storage_contracts SET verification_state='AUTHORIZATION_REQUIRED', last_verified_at=null, evidence='Google Drive authorization required', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(`${PROGRAM_ID}-STORAGE-DRIVE`).run();
  await db.prepare("UPDATE v7_program_contracts SET production_authorized=0, status='WAVE_1_IMPLEMENTED_EXTERNAL_BLOCKERS', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(PROGRAM_ID).run();
  await db.prepare("UPDATE v7_stage_states SET status='IMPLEMENTED_BLOCKED', blocker='Google Drive archive must be verified', frozen_at=null, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(`${PROGRAM_ID}-STAGE-00`).run();
}


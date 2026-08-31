import { storeDriveBinaryArtifact } from "./google-drive";

export type MaterialStatement = {
  bind: (...values: unknown[]) => MaterialStatement;
  run: () => Promise<unknown>;
};

export type MaterialDatabase = {
  prepare: (query: string) => MaterialStatement;
};

export type MaterialBucket = {
  put: (key: string, value: string | ArrayBuffer | Uint8Array, options?: Record<string, unknown>) => Promise<unknown>;
  head: (key: string) => Promise<unknown>;
};

export type MaterialStorageEnv = {
  BUCKET?: MaterialBucket;
};

export type MaterialRow = Record<string, unknown>;

export type MaterialRole =
  | "PRIMARY" | "OVERLAY" | "QA_PROXY" | "QA_ENTRY" | "QA_MIDPOINT" | "QA_EXIT"
  | "SOURCE_ENTRY" | "SOURCE_MIDPOINT" | "SOURCE_EXIT"
  | "COMPOSITE_A_ENTRY" | "COMPOSITE_A_MIDPOINT" | "COMPOSITE_A_EXIT"
  | "COMPOSITE_B_ENTRY" | "COMPOSITE_B_MIDPOINT" | "COMPOSITE_B_EXIT"
  | "COMPOSITE_C_ENTRY" | "COMPOSITE_C_MIDPOINT" | "COMPOSITE_C_EXIT"
  | "MOTION_PROOF" | "MOTION_ENTRY" | "MOTION_MIDPOINT" | "MOTION_EXIT"
  | "SEQUENCE_PROOF" | `SEQUENCE_SAMPLE_${number}`
  | "SEQUENCE_PRODUCT" | `SEQUENCE_PRODUCT_SAMPLE_${number}`
  | "CERT_ENTRY" | "CERT_MIDPOINT" | "CERT_EXIT";

export type StoreMaterialOptions = {
  role: MaterialRole;
  identity?: string;
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  sourceType: string;
  provider: string;
  providerAssetId?: string;
  sourceUrl?: string;
  landingUrl?: string;
  licenseCode: string;
  width: number;
  height: number;
  duration?: number;
  thumbnailUrl?: string;
  runtimeScope?: string;
  archiveFolder?: string;
};

const PROGRAM_ID = "YTAF-V7-GREENFIELD";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

async function shaBytes(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export async function storeMaterial(
  env: MaterialStorageEnv,
  db: MaterialDatabase,
  authorization: MaterialRow,
  briefRow: MaterialRow,
  options: StoreMaterialOptions,
) {
  if (!env.BUCKET) throw new Error("R2 material storage is unavailable");
  const identity = clean(options.identity).replace(/[^a-zA-Z0-9_-]/g, "").slice(-48);
  const suffix = identity ? `${identity}-` : "";
  const runtimeScope = clean(options.runtimeScope || "pilot").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "pilot";
  const archiveFolder = clean(options.archiveFolder || "Pilot 10").replace(/[\\/]/g, "-").slice(0, 96) || "Pilot 10";
  const id = `${briefRow.id}-${suffix}${options.role}`;
  const hash = await shaBytes(options.bytes);
  const key = `v7/material-production/${authorization.run_id}/${runtimeScope}/${clean(briefRow.id).split("-").at(-1)}-${suffix}${options.role.toLowerCase()}.${options.extension}`;
  await env.BUCKET.put(key, options.bytes, {
    httpMetadata: { contentType: options.mimeType },
    customMetadata: { sha256: hash, briefId: String(briefRow.id), role: options.role, provider: options.provider, licenseCode: options.licenseCode },
  });
  if (!(await env.BUCKET.head(key))) throw new Error("R2_MATERIAL_READ_BACK_FAILED");
  const drive = await storeDriveBinaryArtifact({
    folderPath: ["Channels", "Hidden Systems", "Projects", "V7 Greenfield Pilot", "Material Production", archiveFolder],
    fileName: `${clean(briefRow.id).split("-").at(-1)}-${suffix}${options.role.toLowerCase()}.${options.extension}`,
    content: options.bytes,
    mimeType: options.mimeType,
    artifactId: id,
    contentHash: hash,
  });
  await db.prepare("INSERT INTO v7_material_files (id,program_id,run_id,authorization_id,brief_id,asset_role,source_type,provider,provider_asset_id,source_url,landing_url,license_code,mime_type,width,height,duration_seconds,byte_size,content_hash,runtime_key,drive_file_id,thumbnail_url,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'STORED_VERIFIED') ON CONFLICT(id) DO UPDATE SET source_type=excluded.source_type,provider=excluded.provider,provider_asset_id=excluded.provider_asset_id,source_url=excluded.source_url,landing_url=excluded.landing_url,license_code=excluded.license_code,mime_type=excluded.mime_type,width=excluded.width,height=excluded.height,duration_seconds=excluded.duration_seconds,byte_size=excluded.byte_size,content_hash=excluded.content_hash,runtime_key=excluded.runtime_key,drive_file_id=excluded.drive_file_id,thumbnail_url=excluded.thumbnail_url,status='STORED_VERIFIED'")
    .bind(id, PROGRAM_ID, authorization.run_id, authorization.id, briefRow.id, options.role, options.sourceType, options.provider, options.providerAssetId || null, options.sourceUrl || null, options.landingUrl || null, options.licenseCode, options.mimeType, options.width, options.height, options.duration || 0, options.bytes.byteLength, hash, key, drive.id, options.thumbnailUrl || null)
    .run();
  return id;
}

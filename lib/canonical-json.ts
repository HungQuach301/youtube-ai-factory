export const CANONICALIZATION_VERSION = "JCS_NFC_V1" as const;

export class CanonicalizationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

function normalizedString(value: string) {
  return value.normalize("NFC");
}

function canonicalNumber(value: number) {
  if (!Number.isFinite(value)) throw new CanonicalizationError("NON_FINITE_NUMBER", "Canonical JSON does not allow NaN or Infinity");
  if (Object.is(value, -0)) return "0";
  return JSON.stringify(value);
}

function serialize(value: unknown, path: string, seen: WeakSet<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(normalizedString(value));
  if (typeof value === "number") return canonicalNumber(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (["undefined", "bigint", "function", "symbol"].includes(typeof value)) {
    throw new CanonicalizationError("UNSUPPORTED_JSON_VALUE", `${path} contains ${typeof value}, which is not canonical JSON`);
  }
  if (typeof value !== "object") throw new CanonicalizationError("UNSUPPORTED_JSON_VALUE", `${path} is not canonical JSON`);
  if (seen.has(value as object)) throw new CanonicalizationError("CYCLIC_JSON_VALUE", `${path} contains a cycle`);
  seen.add(value as object);
  try {
    if (Array.isArray(value)) return `[${value.map((item, index) => serialize(item, `${path}[${index}]`, seen)).join(",")}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CanonicalizationError("NON_PLAIN_OBJECT", `${path} must be a plain JSON object`);
    }
    const normalizedKeys = new Map<string, string>();
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const normalized = normalizedString(key);
      if (normalizedKeys.has(normalized)) throw new CanonicalizationError("DUPLICATE_NORMALIZED_KEY", `${path} contains keys that collide after NFC normalization`);
      normalizedKeys.set(normalized, key);
    }
    return `{${[...normalizedKeys.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([normalized, original]) => `${JSON.stringify(normalized)}:${serialize((value as Record<string, unknown>)[original], `${path}.${normalized}`, seen)}`).join(",")}}`;
  } finally {
    seen.delete(value as object);
  }
}

export function canonicalStringify(value: unknown) {
  return serialize(value, "$", new WeakSet());
}

export async function sha256Hex(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", input))].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export async function canonicalHash(value: unknown) {
  return sha256Hex(canonicalStringify(value));
}

import { createElement as h } from "react";
import { ImageResponse } from "next/og";

export type ImageReviewSurface = {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  transform: "IDENTITY" | "SVG_TO_PNG_1920X1080_V1";
};

function starts(bytes: Uint8Array, values: number[]) {
  return values.every((value, index) => bytes[index] === value);
}

export function detectedRasterMime(bytes: Uint8Array) {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png" as const;
  if (starts(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg" as const;
  if (new TextDecoder().decode(bytes.subarray(0, 4)) === "GIF8") return "image/gif" as const;
  if (new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "image/webp" as const;
  return null;
}

function svgText(bytes: Uint8Array) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const normalized = text.replace(/^\uFEFF/, "").trimStart();
  return /^(?:<\?xml[\s\S]*?\?>\s*)?<svg[\s>]/i.test(normalized) ? normalized : null;
}

function assertSelfContainedSvg(svg: string) {
  if (/<!DOCTYPE|<!ENTITY|<script|<foreignObject/i.test(svg)) throw new Error("FACTORY_QA_SVG_ACTIVE_CONTENT_FORBIDDEN");
  if (/(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/)/i.test(svg) || /url\(\s*["']?\s*(?:https?:|\/\/)/i.test(svg)) throw new Error("FACTORY_QA_SVG_REMOTE_RESOURCE_FORBIDDEN");
}

export async function prepareImageReviewSurface(bytes: Uint8Array): Promise<ImageReviewSurface> {
  const rasterMime = detectedRasterMime(bytes);
  if (rasterMime) return { bytes, mimeType: rasterMime, transform: "IDENTITY" };
  const svg = svgText(bytes);
  if (!svg) throw new Error("FACTORY_QA_IMAGE_FORMAT_UNSUPPORTED");
  assertSelfContainedSvg(svg);
  const dataUri = `data:image/svg+xml;base64,${base64(bytes)}`;
  const response = new ImageResponse(h("img", { src: dataUri, style: { width: "100%", height: "100%", objectFit: "contain" } }), { width: 1920, height: 1080 });
  const png = new Uint8Array(await response.arrayBuffer());
  if (detectedRasterMime(png) !== "image/png") throw new Error("FACTORY_QA_SVG_RASTERIZATION_FAILED");
  return { bytes: png, mimeType: "image/png", transform: "SVG_TO_PNG_1920X1080_V1" };
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

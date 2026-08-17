import { createElement as h, type ReactNode } from "react";
import { ImageResponse } from "next/og";

type TemporalState = "ENTRY" | "MIDPOINT" | "EXIT";
export type GoldenSceneKind = "APPROVAL_DECISION" | "STATE_LIFECYCLE" | "ROLE_MAP" | "FEE_LEDGER" | "COST_STACK" | "RATE_VARIATION" | "EXCEPTION_PATH" | "OPENING_NET" | "MERCHANT_DEDUCTION" | "SQUARE_SCOPE" | "SQUARE_CALC" | "SQUARE_NET" | "STRIPE_CALC" | "STRIPE_NET" | "COVERED_DEBIT";
export const GOLDEN_PIXEL_RENDERER_VERSION = "FOLLOW_FEE_PROGRAM_V5_MOBILE_SAFE";
export const GOLDEN_MOBILE_LEGIBILITY_CONTRACT = { minimumQualifierFontPx: 22, minimumCriticalLabelFontPx: 18, minimumInactiveOpacity: .78, criticalRibbonAlwaysOpaque: true } as const;

const SCENE_COPY: Record<GoldenSceneKind, [string, string]> = {
  APPROVAL_DECISION: ["Approval is a decision", "Information now · money later"],
  STATE_LIFECYCLE: ["Six distinct states", "Connected, not interchangeable"],
  ROLE_MAP: ["Follow the jobs", "One firm may combine roles"],
  FEE_LEDGER: ["Acquiring side → issuer", "Interchange generally flows this way"],
  COST_STACK: ["Start with a $100 sale", "Merchant net = $100 − acceptance cost"],
  RATE_VARIATION: ["No universal fee split", "Actual pricing varies by contract"],
  EXCEPTION_PATH: ["The path can branch", "Decline · reversal · dispute"],
  OPENING_NET: ["$100 paid out is not $100 kept", "Contractual deduction determines merchant net"],
  MERCHANT_DEDUCTION: ["Start with the outer deduction", "Merchant discount or provider processing charge"],
  SQUARE_SCOPE: ["Square Free · in person", "Public US price checked for this production"],
  SQUARE_CALC: ["Square example · show the math", "$100 × 2.6% + $0.15 = $2.75"],
  SQUARE_NET: ["Square illustrative net", "$100.00 − $2.75 = $97.25"],
  STRIPE_CALC: ["Stripe US standard · domestic card", "$100 × 2.9% + $0.30 = $3.20"],
  STRIPE_NET: ["Stripe illustrative net", "$100.00 − $3.20 = $96.80"],
  COVERED_DEBIT: ["Covered debit · build the ceiling", "$0.21 + $0.05 + up to $0.01 = up to $0.27"],
};

const baseCard = { display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: 14, padding: "18px 20px", minHeight: 102 } as const;
function card(title: string, subtitle: string, active: boolean, accent: string, width?: number | string) {
  return h("div", { style: { ...baseCard, ...(width === undefined ? {} : { width }), opacity: active ? 1 : GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumInactiveOpacity, color: active ? "#0b3029" : "#f3fbf7", background: active ? "#f7f1df" : "#173d35", borderTop: `7px solid ${active ? accent : "#7ba397"}` } },
    h("div", { style: { display: "flex", fontSize: 25, lineHeight: 1.05, fontWeight: 750, letterSpacing: "-.02em" } }, title),
    h("div", { style: { display: "flex", fontSize: GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumCriticalLabelFontPx, lineHeight: 1.2, color: active ? "#304f46" : "#f3fbf7", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em" } }, subtitle),
  );
}
function arrow(active: boolean, accent: string) { return h("div", { style: { display: "flex", width: 52, alignItems: "center", justifyContent: "center", color: active ? accent : "#55766d", fontSize: 34, fontWeight: 800 } }, "→"); }
function formulaStep(label: string, value: string, active: boolean, accent: string, width: number | string = 190) { return h("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", width, minHeight: 124, padding: "16px 18px", borderRadius: 14, opacity: active ? 1 : GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumInactiveOpacity, background: active ? "#f7f1df" : "#173d35", color: active ? "#0b3029" : "#f3fbf7", borderTop: `7px solid ${active ? accent : "#7ba397"}` } }, h("div", { style: { display: "flex", color: active ? "#304f46" : "#f3fbf7", fontSize: GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumCriticalLabelFontPx, lineHeight: 1.15, fontWeight: 850, letterSpacing: ".025em", textTransform: "uppercase" } }, label), h("div", { style: { display: "flex", marginTop: 8, fontSize: 30, lineHeight: 1, fontWeight: 850 } }, value)); }
function scopeRibbon(provider: string, plan: string, channel: string, active: boolean, accent: string) { return h("div", { style: { display: "flex", width: "100%", gap: 12 } }, formulaStep("Provider", provider, true, accent, 260), formulaStep("Plan", plan, active, accent, 260), formulaStep("Channel", channel, active, accent, 260)); }
function qualificationRibbon(text: string, accent: string, final: boolean) { return h("div", { style: { display: "flex", justifyContent: "center", padding: "16px 18px", borderRadius: 12, opacity: 1, background: "#f7f1df", color: "#0b3029", border: `6px solid ${final ? accent : "#879488"}`, fontSize: GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumQualifierFontPx, lineHeight: 1.15, fontWeight: 900, textTransform: "uppercase" } }, text); }
function sceneBody(scene: GoldenSceneKind, reveal: number, accent: string): ReactNode {
  if (scene === "OPENING_NET") return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } },
    h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, formulaStep("Gross sale", "$100.00", true, accent, 230), arrow(reveal >= 2, accent), formulaStep("Contractual deduction", "VARIABLE", reveal >= 2, accent, 290), arrow(reveal >= 2, accent), formulaStep("Merchant net", "NOT YET KNOWN", reveal >= 2, accent, 260)),
    qualificationRibbon("$100 gross − contractual deduction = merchant net", accent, reveal >= 3));
  if (scene === "MERCHANT_DEDUCTION") return h("div", { style: { display: "flex", alignItems: "stretch", gap: 20, width: "100%" } }, formulaStep("Gross sale", "$100.00", true, accent, 220), arrow(reveal >= 2, accent), h("div", { style: { display: "flex", flexDirection: "column", gap: 12, flex: 1 } }, formulaStep("Outer contractual deduction", "MERCHANT DISCOUNT", reveal >= 2, accent, "100%"), formulaStep("Also described as", "PROVIDER PROCESSING CHARGE", reveal >= 3, accent, "100%")));
  if (scene === "SQUARE_SCOPE") return h("div", { style: { display: "flex", flexDirection: "column", gap: 22, width: "100%" } }, scopeRibbon("SQUARE", "FREE", "IN PERSON", reveal >= 2, accent), h("div", { style: { display: "flex", justifyContent: "space-between", padding: "18px 22px", borderRadius: 14, background: "#f7f1df", color: "#0b3029", border: `6px solid ${reveal >= 3 ? accent : "#879488"}`, fontSize: GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumQualifierFontPx, lineHeight: 1.15, fontWeight: 900, textTransform: "uppercase" } }, h("span", null, "Public US price"), h("span", null, "Checked for this production")));
  if (scene === "SQUARE_CALC") return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } }, h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, formulaStep("Gross", "$100.00", true, accent, 180), arrow(reveal >= 2, accent), formulaStep("2.6% of gross", "$2.60", reveal >= 2, accent, 200), h("div", { style: { display: "flex", width: 48, justifyContent: "center", color: accent, fontSize: 34, fontWeight: 800 } }, "+"), formulaStep("Fixed", "$0.15", reveal >= 2, accent, 170), h("div", { style: { display: "flex", width: 48, justifyContent: "center", color: accent, fontSize: 34, fontWeight: 800 } }, "="), formulaStep("Processing charge", "$2.75", reveal >= 2, accent, 220)), scopeRibbon("SQUARE", "FREE", "IN PERSON", reveal >= 3, accent));
  if (scene === "SQUARE_NET") return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } }, h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, formulaStep("Gross", "$100.00", true, accent, 210), h("div", { style: { display: "flex", width: 60, justifyContent: "center", color: accent, fontSize: 38, fontWeight: 850 } }, "−"), formulaStep("Square charge", "$2.75", reveal >= 2, accent, 230), h("div", { style: { display: "flex", width: 60, justifyContent: "center", color: accent, fontSize: 38, fontWeight: 850 } }, "="), formulaStep("Illustrative net", "$97.25", reveal >= 2, accent, 250)), qualificationRibbon("Before unrelated fees · reserves · later reversals", accent, reveal >= 3));
  if (scene === "STRIPE_CALC") return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } }, scopeRibbon("STRIPE", "US STANDARD", "DOMESTIC CARD", reveal >= 3, accent), h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, formulaStep("Gross", "$100.00", true, accent, 170), arrow(reveal >= 2, accent), formulaStep("2.9%", "$2.90", reveal >= 2, accent, 170), h("div", { style: { display: "flex", width: 45, justifyContent: "center", color: accent, fontSize: 32, fontWeight: 850 } }, "+"), formulaStep("Fixed", "$0.30", reveal >= 2, accent, 170), h("div", { style: { display: "flex", width: 45, justifyContent: "center", color: accent, fontSize: 32, fontWeight: 850 } }, "="), formulaStep("Processing charge", "$3.20", reveal >= 2, accent, 220)));
  if (scene === "STRIPE_NET") return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } }, h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, formulaStep("Gross", "$100.00", true, accent, 210), h("div", { style: { display: "flex", width: 60, justifyContent: "center", color: accent, fontSize: 38, fontWeight: 850 } }, "−"), formulaStep("Stripe charge", "$3.20", reveal >= 2, accent, 230), h("div", { style: { display: "flex", width: 60, justifyContent: "center", color: accent, fontSize: 38, fontWeight: 850 } }, "="), formulaStep("Illustrative net", "$96.80", reveal >= 2, accent, 250)), qualificationRibbon("Custom · international · manually entered pricing can differ", accent, reveal >= 3));
  if (scene === "COVERED_DEBIT") return h("div", { style: { display: "flex", flexDirection: "column", gap: 16, width: "100%" } }, h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, formulaStep("Base", "$0.21", true, accent, 155), h("div", { style: { display: "flex", width: 42, justifyContent: "center", color: accent, fontSize: 31, fontWeight: 850 } }, "+"), formulaStep("5 bps of $100", "$0.05", reveal >= 2, accent, 170), h("div", { style: { display: "flex", width: 42, justifyContent: "center", color: accent, fontSize: 31, fontWeight: 850 } }, "+"), formulaStep("Eligible fraud adj.", "UP TO $0.01", reveal >= 2, accent, 190), h("div", { style: { display: "flex", width: 42, justifyContent: "center", color: accent, fontSize: 31, fontWeight: 850 } }, "="), formulaStep("Issuer interchange ceiling only", "UP TO $0.27", reveal >= 2, accent, 215)), h("div", { style: { display: "flex", justifyContent: "space-between", gap: 24, padding: "16px 20px", borderRadius: 12, background: reveal >= 3 ? "#f6c85f" : "#f7f1df", color: "#0b3029", fontSize: GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumQualifierFontPx, lineHeight: 1.15, fontWeight: 900, textTransform: "uppercase" } }, h("span", { style: { display: "flex", flex: 1 } }, "Not total merchant acceptance cost"), h("span", { style: { display: "flex", justifyContent: "flex-end" } }, "Exempt debit differs")));
  if (scene === "APPROVAL_DECISION") return h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, card("Checkout", "$100 request", true, accent, 230), arrow(reveal >= 2, accent), card("Issuer", "Credit decision", reveal >= 2, accent, 230), arrow(reveal >= 3, accent), card("Terminal", "Approved", reveal >= 3, accent, 230));
  if (scene === "STATE_LIFECYCLE") {
    const items = [["Requested","Start"],["Authorized","Decision"],["Captured","Confirm"],["Cleared","Reconcile"],["Settled","Funds"],["Paid out","Merchant"]];
    return h("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, width: "100%" } }, ...items.map(([title, subtitle], index) => card(title, subtitle, index < reveal * 2, accent, 278)));
  }
  if (scene === "ROLE_MAP") {
    const roles = [["Merchant","Accepts"],["Acquirer","Merchant side"],["Network","Routes"],["Issuer","Decides"]];
    return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } },
      h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, ...roles.flatMap(([title, subtitle], index) => [card(title, subtitle, index <= reveal, accent, 185), ...(index < roles.length - 1 ? [arrow(index < reveal, accent)] : [])])),
      h("div", { style: { display: "flex", justifyContent: "space-around", padding: "14px 20px", borderRadius: 12, background: "#143d34", fontSize: 16, fontWeight: 750, textTransform: "uppercase" } }, h("span", { style: { color: "#76e0bb" } }, "Message"), h("span", { style: { color: "#70b9ff" } }, "Money"), h("span", { style: { color: "#f6c85f" } }, "Fee"), h("span", { style: { color: "#ff967d" } }, "Risk")),
    );
  }
  if (scene === "FEE_LEDGER") {
    const recipients = [["Issuer side","Interchange"],["Network","Service fees"],["Processor / acquirer","Merchant pricing"]];
    return h("div", { style: { display: "flex", alignItems: "stretch", gap: 22, width: "100%" } },
      card("Merchant", "Pays acceptance cost", true, accent, 200),
      arrow(true, accent),
      card("Acquiring side", "Interchange generally flows", true, accent, 235),
      arrow(true, accent),
      h("div", { style: { display: "flex", flexDirection: "column", gap: 9, flex: 1 } }, ...recipients.map(([title, subtitle], index) => card(title, subtitle, index < reveal, accent))),
    );
  }
  if (scene === "COST_STACK") return h("div", { style: { display: "flex", flexDirection: "column", gap: 18, width: "100%" } },
    h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, card("$100 sale", "Customer purchase", true, accent, 245), arrow(reveal >= 2, accent), card("Minus cost", "Merchant is billed", reveal >= 2, accent, 245), arrow(reveal >= 3, accent), card("Merchant net", "Varies by contract", reveal >= 3, accent, 245)),
    h("div", { style: { display: "flex", justifyContent: "center", padding: 12, borderRadius: 12, background: "#3a3019", color: accent, fontSize: 20, fontWeight: 750, textTransform: "uppercase", letterSpacing: ".03em" } }, "Illustrative logic · not a typical rate"),
  );
  if (scene === "RATE_VARIATION") {
    const factors = ["Card product","Merchant type","Channel","Authentication","Data quality","Contract"];
    return h("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, width: "100%" } }, ...factors.map((factor, index) => card(factor, "Can change price", index < reveal * 2, accent, 278)));
  }
  return h("div", { style: { display: "flex", alignItems: "center", width: "100%" } }, card("Request", "Checkout start", true, accent, 210), arrow(reveal >= 2, accent), h("div", { style: { display: "flex", flexDirection: "column", gap: 12, width: 245 } }, card("Approved", "Continue", reveal >= 2, accent), card("Declined", "Stop", reveal >= 2, accent)), arrow(reveal >= 3, accent), card("Later state", "Reversal or dispute", reveal >= 3, accent, 250));
}

function frameElement(input: { shotIndex: number; temporalState: TemporalState; sceneKind: GoldenSceneKind }) {
  const stateIndex = ["ENTRY", "MIDPOINT", "EXIT"].indexOf(input.temporalState), reveal = stateIndex + 1, monetary = ["FEE_LEDGER", "COST_STACK", "OPENING_NET", "MERCHANT_DEDUCTION", "SQUARE_SCOPE", "SQUARE_CALC", "SQUARE_NET", "STRIPE_CALC", "STRIPE_NET", "COVERED_DEBIT"].includes(input.sceneKind), accent = input.sceneKind === "EXCEPTION_PATH" ? "#ffb36b" : monetary ? "#f6c85f" : "#76e0bb", copy = SCENE_COPY[input.sceneKind];
  return h("div", { style: { display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "30px 38px 26px", color: "#f8f5e8", background: "#061b18", borderTop: `12px solid ${accent}`, fontFamily: "sans-serif" } },
    h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, h("div", { style: { display: "flex", padding: "8px 13px", borderRadius: 8, color: accent, background: "#143d34", fontSize: 15, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" } }, "Follow the Fee"), h("div", { style: { display: "flex", color: "#b7cec6", fontSize: 14, fontWeight: 700 } }, input.temporalState)),
    h("div", { style: { display: "flex", flexDirection: "column", marginTop: 20, marginBottom: 24 } }, h("div", { style: { display: "flex", fontSize: 43, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-.035em" } }, copy[0]), h("div", { style: { display: "flex", marginTop: 8, color: "#e7f4ef", fontSize: GOLDEN_MOBILE_LEGIBILITY_CONTRACT.minimumQualifierFontPx, lineHeight: 1.15, fontWeight: 700 } }, copy[1])),
    h("div", { style: { display: "flex", flex: 1, alignItems: "center" } }, sceneBody(input.sceneKind, reveal, accent)),
    h("div", { style: { display: "flex", width: "100%", height: 10, marginTop: 22, borderRadius: 6, overflow: "hidden", background: "#173d35" } }, h("div", { style: { display: "flex", width: `${Math.min(96, 31 + stateIndex * 30 + input.shotIndex % 7)}%`, background: accent } })),
  );
}

async function decodePng(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let offset = 8, width = 0, height = 0, colorType = 6; const idat: Uint8Array[] = [];
  while (offset + 12 <= bytes.length) { const length = view.getUint32(offset), type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8)), data = bytes.subarray(offset + 8, offset + 8 + length); if (type === "IHDR") { const header = new DataView(data.buffer, data.byteOffset, data.byteLength); width = header.getUint32(0); height = header.getUint32(4); colorType = data[9]; } else if (type === "IDAT") idat.push(data); offset += 12 + length; if (type === "IEND") break; }
  const compressedLength = idat.reduce((sum, part) => sum + part.length, 0), compressed = new Uint8Array(compressedLength); let cursor = 0; for (const part of idat) { compressed.set(part, cursor); cursor += part.length; }
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate")), raw = new Uint8Array(await new Response(stream).arrayBuffer()), channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0; if (!width || !height || !channels) throw new Error(`Unsupported PNG color type ${colorType}`);
  const stride = width * channels, decoded = new Uint8Array(height * stride); let rawOffset = 0;
  const paeth = (a: number, b: number, c: number) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y += 1) { const filter = raw[rawOffset++], row = y * stride; for (let x = 0; x < stride; x += 1) { const value = raw[rawOffset++], left = x >= channels ? decoded[row + x - channels] : 0, above = y ? decoded[row - stride + x] : 0, upperLeft = y && x >= channels ? decoded[row - stride + x - channels] : 0; decoded[row + x] = filter === 0 ? value : filter === 1 ? value + left : filter === 2 ? value + above : filter === 3 ? value + Math.floor((left + above) / 2) : value + paeth(left, above, upperLeft); } }
  if (channels === 4) return { pixels: decoded, width, height }; const pixels = new Uint8Array(width * height * 4); for (let source = 0, target = 0; source < decoded.length; source += 3, target += 4) { pixels[target] = decoded[source]; pixels[target + 1] = decoded[source + 1]; pixels[target + 2] = decoded[source + 2]; pixels[target + 3] = 255; } return { pixels, width, height };
}

export async function renderTransactionChainFrame(input: { shotId: string; shotIndex: number; temporalState: TemporalState; sceneKind: GoldenSceneKind }) {
  const response = new ImageResponse(frameElement(input), { width: 960, height: 540 }), bytes = new Uint8Array(await response.arrayBuffer()), decoded = await decodePng(bytes);
  return { bytes, ...decoded, rendererVersion: GOLDEN_PIXEL_RENDERER_VERSION, audienceCopy: { kicker: "Follow the Fee", headline: SCENE_COPY[input.sceneKind][0], qualifier: SCENE_COPY[input.sceneKind][1] }, semanticState: `${input.sceneKind}:${input.temporalState}` };
}

export function compareTemporalPixels(frames: Array<{ pixels: Uint8Array; width: number; height: number }>) {
  const changedRatios: number[] = [];
  for (let index = 1; index < frames.length; index += 1) { const left = frames[index - 1].pixels, right = frames[index].pixels; let changed = 0; for (let offset = 0; offset < Math.min(left.length, right.length); offset += 4) if (left[offset] !== right[offset] || left[offset + 1] !== right[offset + 1] || left[offset + 2] !== right[offset + 2]) changed += 1; changedRatios.push(changed / Math.max(1, frames[index].width * frames[index].height)); }
  return { changedRatios, meaningfulTemporalDelta: changedRatios.every((ratio) => ratio >= 0.015) };
}

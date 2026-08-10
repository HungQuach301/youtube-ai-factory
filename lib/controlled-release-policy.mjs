export const CONTROLLED_RELEASE_POLICY = Object.freeze({
  version: "CONTROLLED_RELEASE_GATE_V1",
  standardOverall: 92,
  standardDimension: 90,
  controlledOverall: 88,
  controlledSemanticFit: 82,
  controlledOtherDimension: 88,
  internalOnlyOverall: 84,
  p0Max: 0,
  semanticP1Max: 0,
  presentationP1Max: 1,
  controlledQaSampleRate: 0.25,
});

const normalizedDefects = (findings = []) => (Array.isArray(findings) ? findings : []).map((finding) => {
  if (finding && typeof finding === "object") {
    return {
      severity: String(finding.severity || "P1").toUpperCase(),
      category: String(finding.category || "SEMANTIC").toUpperCase(),
    };
  }
  const text = String(finding || "").toUpperCase();
  const severity = text.includes("P0") ? "P0" : text.includes("P2") ? "P2" : "P1";
  const presentation = /PRESENTATION|AESTHETIC|COSMETIC|SPACING|ALIGNMENT|DECORATIVE/.test(text);
  return { severity, category: presentation ? "PRESENTATION" : "SEMANTIC" };
});

export function evaluateControlledRelease(input = {}) {
  const policy = CONTROLLED_RELEASE_POLICY;
  const dimensions = input.dimensions || {};
  const overall = Number(input.overall || 0);
  const semanticFit = Number(dimensions.semanticFit || 0);
  const otherKeys = ["factualSafety", "composition", "mobileLegibility", "authenticity"];
  const otherValues = otherKeys.map((key) => Number(dimensions[key] || 0));
  const defects = normalizedDefects(input.defects || input.findings || []);
  const p0Count = defects.filter((item) => item.severity === "P0").length;
  const semanticP1Count = defects.filter((item) => item.severity === "P1" && item.category !== "PRESENTATION").length;
  const presentationP1Count = defects.filter((item) => item.severity === "P1" && item.category === "PRESENTATION").length;
  const defectGate = p0Count <= policy.p0Max && semanticP1Count <= policy.semanticP1Max;
  const standard = overall >= policy.standardOverall
    && semanticFit >= policy.standardDimension
    && otherValues.every((value) => value >= policy.standardDimension)
    && defectGate
    && presentationP1Count === 0;
  const controlled = overall >= policy.controlledOverall
    && semanticFit >= policy.controlledSemanticFit
    && otherValues.every((value) => value >= policy.controlledOtherDimension)
    && defectGate
    && presentationP1Count <= policy.presentationP1Max;
  const tier = standard ? "STANDARD" : controlled ? "CONTROLLED" : defectGate && presentationP1Count <= policy.presentationP1Max && overall >= policy.internalOnlyOverall && semanticFit >= policy.controlledSemanticFit ? "INTERNAL_ONLY" : "BLOCKED";
  return {
    version: policy.version,
    pass: tier === "STANDARD" || tier === "CONTROLLED",
    tier,
    qaSampleRate: tier === "CONTROLLED" ? policy.controlledQaSampleRate : 1,
    counts: { p0: p0Count, semanticP1: semanticP1Count, presentationP1: presentationP1Count },
  };
}

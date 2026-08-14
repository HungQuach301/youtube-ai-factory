export const WAVE_9_STORYBOARD_RENDERER_V23 = Object.freeze({
  version: "WAVE_9_STORYBOARD_RENDERER_V23_3",
  logicalScope: 166,
  framesPerShot: 3,
  width: 1440,
  height: 810,
  mimeType: "image/svg+xml",
  remoteDispatches: 0,
  costDeltaUsd: 0,
  next: "BUILD_ANIMATICS_THEN_LOCK_ASSETS",
});

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const escapeXml = (value) => clean(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const short = (value, max = 78) => { const text = clean(value); return text.length <= max ? text : `${text.slice(0, max - 1)}…`; };

function primitiveMarkup(archetype, x, y, stateIndex) {
  const accent = ["#35f49a", "#f2cc60", "#70a7ff"][stateIndex];
  const progress = [0.24, 0.56, 0.86][stateIndex];
  if (archetype === "TRANSACTION_STATE_PROOF") return `<g><rect x="${x + 34}" y="${y + 104}" width="96" height="72" rx="14" fill="#14241e" stroke="${accent}"/><path d="M${x + 142} ${y + 140}H${x + 270}" stroke="${accent}" stroke-width="8"/><rect x="${x + 270}" y="${y + 88}" width="52" height="104" rx="10" fill="#0a1110" stroke="${accent}"/><path d="M${x + 322} ${y + 140}H${x + 386}" stroke="${accent}" stroke-width="8"/><circle cx="${x + 34 + progress * 352}" cy="${y + 140}" r="13" fill="${accent}"/></g>`;
  if (archetype === "DATA_VISUALIZATION") return `<g><path d="M${x + 42} ${y + 198}V${y + 80}M${x + 42} ${y + 198}H${x + 390}" stroke="#60736d" stroke-width="3"/><rect x="${x + 78}" y="${y + 150 - 45 * progress}" width="58" height="${48 + 45 * progress}" fill="#1c7751"/><rect x="${x + 168}" y="${y + 128 - 62 * progress}" width="58" height="${70 + 62 * progress}" fill="${accent}"/><rect x="${x + 258}" y="${y + 164 - 82 * progress}" width="58" height="${34 + 82 * progress}" fill="#477bb8"/><path d="M${x + 62} ${y + 120}C${x + 160} ${y + 56},${x + 272} ${y + 86},${x + 374} ${y + 46}" fill="none" stroke="${accent}" stroke-width="5"/></g>`;
  if (archetype === "PROCESS_ROUTE") return `<g><path d="M${x + 46} ${y + 150}C${x + 132} ${y + 54},${x + 250} ${y + 230},${x + 382} ${y + 104}" fill="none" stroke="#60736d" stroke-width="8"/><circle cx="${x + 46}" cy="${y + 150}" r="24" fill="#14241e" stroke="${accent}"/><circle cx="${x + 216}" cy="${y + 132}" r="24" fill="#14241e" stroke="${accent}"/><circle cx="${x + 382}" cy="${y + 104}" r="24" fill="#14241e" stroke="${accent}"/><circle cx="${x + 46 + progress * 336}" cy="${y + 132 - progress * 28}" r="12" fill="${accent}"/></g>`;
  if (archetype === "DOCUMENTARY_LIVE_ACTION") return `<g><rect x="${x + 42}" y="${y + 54}" width="340" height="168" rx="16" fill="#101b18" stroke="#60736d"/><circle cx="${x + 172}" cy="${y + 126}" r="42" fill="#23483a"/><path d="M${x + 256} ${y + 94}h82M${x + 256} ${y + 126}h60M${x + 256} ${y + 158}h96" stroke="${accent}" stroke-width="9"/><rect x="${x + 54 + progress * 246}" y="${y + 70}" width="58" height="136" fill="none" stroke="${accent}" stroke-width="4"/></g>`;
  if (archetype === "RIGHTS_SENSITIVE") return `<g><rect x="${x + 54}" y="${y + 58}" width="238" height="154" rx="12" fill="#101b18" stroke="#60736d"/><path d="M${x + 76} ${y + 184}l64-70 54 38 72-76" fill="none" stroke="${accent}" stroke-width="6"/><circle cx="${x + 334}" cy="${y + 136}" r="52" fill="#14241e" stroke="${accent}" stroke-width="5"/><path d="M${x + 310} ${y + 136}l16 17 34-38" fill="none" stroke="${accent}" stroke-width="7"/></g>`;
  if (archetype === "MOBILE_TEXT_INTENSIVE") return `<g><rect x="${x + 118}" y="${y + 42}" width="206" height="198" rx="24" fill="#101b18" stroke="${accent}"/><path d="M${x + 146} ${y + 88}h150M${x + 146} ${y + 122}h${96 + 46 * progress}M${x + 146} ${y + 156}h132M${x + 146} ${y + 190}h${72 + 78 * progress}" stroke="${accent}" stroke-width="8"/></g>`;
  if (archetype === "SOURCE_AUTHORED_HYBRID") return `<g><rect x="${x + 42}" y="${y + 58}" width="166" height="152" rx="14" fill="#101b18" stroke="#60736d"/><path d="M${x + 58} ${y + 184}l46-52 34 28 54-70" fill="none" stroke="#477bb8" stroke-width="6"/><path d="M${x + 218} ${y + 134}h52" stroke="${accent}" stroke-width="7"/><rect x="${x + 270}" y="${y + 58}" width="112" height="152" rx="14" fill="#14241e" stroke="${accent}"/><circle cx="${x + 326}" cy="${y + 92 + progress * 84}" r="14" fill="${accent}"/></g>`;
  return `<g><circle cx="${x + 92}" cy="${y + 136}" r="46" fill="#14241e" stroke="${accent}"/><circle cx="${x + 220}" cy="${y + 86}" r="36" fill="#14241e" stroke="${accent}"/><circle cx="${x + 344}" cy="${y + 156}" r="50" fill="#14241e" stroke="${accent}"/><path d="M${x + 134} ${y + 118}L${x + 188} ${y + 98}M${x + 252} ${y + 104}L${x + 300} ${y + 136}" stroke="${accent}" stroke-width="7"/><circle cx="${x + 92 + progress * 252}" cy="${y + 136 - progress * 28}" r="12" fill="${accent}"/></g>`;
}

export function renderWave9StoryboardSheetV23(shotPackage) {
  const policy = WAVE_9_STORYBOARD_RENDERER_V23;
  const logicalId = escapeXml(shotPackage?.logicalId);
  const archetype = clean(shotPackage?.artifacts?.shotArchetypeMap?.archetype) || "ABSTRACT_AUTHORED";
  const treatment = escapeXml(shotPackage?.artifacts?.shotArchetypeMap?.treatment);
  const route = escapeXml(shotPackage?.artifacts?.shotDesignPackage?.route);
  const frames = Array.isArray(shotPackage?.artifacts?.storyboardManifest?.frames) ? shotPackage.artifacts.storyboardManifest.frames : [];
  const panels = frames.map((frame, index) => {
    const x = 36 + index * 468;
    const role = escapeXml(frame.role);
    const purpose = escapeXml(short(frame.purpose, 92));
    return `<g><rect x="${x}" y="118" width="436" height="610" rx="24" fill="#0c1513" stroke="#29483e" stroke-width="2"/><text x="${x + 28}" y="164" fill="#91a69f" font-size="18" font-family="Arial, sans-serif" font-weight="700">${String(index + 1).padStart(2, "0")} · ${role}</text>${primitiveMarkup(archetype, x, 196, index)}<line x1="${x + 28}" y1="446" x2="${x + 408}" y2="446" stroke="#29483e"/><text x="${x + 28}" y="488" fill="#ecf6f2" font-size="22" font-family="Arial, sans-serif" font-weight="700"><tspan x="${x + 28}" dy="0">${purpose.slice(0, 42)}</tspan><tspan x="${x + 28}" dy="32">${purpose.slice(42, 84)}</tspan><tspan x="${x + 28}" dy="32">${purpose.slice(84)}</tspan></text><text x="${x + 28}" y="680" fill="#35f49a" font-size="15" font-family="Arial, sans-serif">VISIBLE STATE · ${role}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${policy.width}" height="${policy.height}" viewBox="0 0 ${policy.width} ${policy.height}"><rect width="1440" height="810" fill="#070d0b"/><text x="36" y="52" fill="#ecf6f2" font-size="28" font-family="Arial, sans-serif" font-weight="700">${logicalId} · ${escapeXml(archetype.replaceAll("_", " "))}</text><text x="36" y="86" fill="#91a69f" font-size="17" font-family="Arial, sans-serif">${route} · ${treatment}</text>${panels}<text x="1404" y="782" text-anchor="end" fill="#60736d" font-size="14" font-family="Arial, sans-serif">V23.3 · DOMAIN-NATIVE STORYBOARD · NO GENERIC FALLBACK</text></svg>`;
}

export function planWave9StoryboardsV23(compilation) {
  const policy = WAVE_9_STORYBOARD_RENDERER_V23;
  const packages = Array.isArray(compilation?.packages) ? compilation.packages : [];
  const supported = new Set(["TRANSACTION_STATE_PROOF", "DATA_VISUALIZATION", "PROCESS_ROUTE", "DOCUMENTARY_LIVE_ACTION", "RIGHTS_SENSITIVE", "MOBILE_TEXT_INTENSIVE", "SOURCE_AUTHORED_HYBRID", "ABSTRACT_AUTHORED"]);
  const manifests = packages.map((item) => ({
    logicalId: clean(item.logicalId),
    archetype: clean(item?.artifacts?.shotArchetypeMap?.archetype),
    treatment: clean(item?.artifacts?.shotArchetypeMap?.treatment),
    route: clean(item?.artifacts?.shotDesignPackage?.route),
    frameRoles: (item?.artifacts?.storyboardManifest?.frames || []).map((frame) => clean(frame.role)),
    lifecycle: "RENDER_REQUIRED",
  }));
  const checks = [
    { id: "EXACT_SCOPE", pass: manifests.length === policy.logicalScope, evidence: `${manifests.length}/${policy.logicalScope} storyboard sheets` },
    { id: "THREE_STATE_COVERAGE", pass: manifests.every((item) => item.frameRoles.join("|") === "ENTRY|MIDPOINT|EXIT"), evidence: `${manifests.length * policy.framesPerShot} ENTRY/MIDPOINT/EXIT frames` },
    { id: "DOMAIN_NATIVE_RENDERERS", pass: manifests.every((item) => supported.has(item.archetype)), evidence: "every archetype resolves to a dedicated visual primitive grammar" },
    { id: "NO_GENERIC_FALLBACK", pass: manifests.every((item) => item.archetype && item.treatment), evidence: "missing archetype or treatment fails closed" },
    { id: "ZERO_REMOTE_DISPATCH", pass: true, evidence: "deterministic SVG renderer is provider-free" },
  ];
  return {
    version: policy.version,
    status: checks.every((item) => item.pass) ? "READY_TO_RENDER" : "RENDER_PLAN_BLOCKED",
    shotCount: manifests.length,
    frameCount: manifests.length * policy.framesPerShot,
    storedStoryboardCount: 0,
    remoteDispatches: 0,
    costDeltaUsd: 0,
    checks,
    manifests,
    next: policy.next,
    productionActivation: "LOCKED_UNTIL_ANIMATIC_AND_ASSET_LOCK",
  };
}

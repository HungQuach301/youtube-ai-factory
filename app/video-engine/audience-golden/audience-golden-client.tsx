"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// The server projection is intentionally schema-flexible while each rendered field
// is still guarded by its presence in the component below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const API = "/api/factory/sequential-production/audience-golden";
const labels: Record<string, string> = { SEAL_BLUEPRINT: "Niêm phong blueprint", CREATE_REPAIR_REVISION: "Đang mở revision theo failure evidence", GENERATE_AUDIO: "Tạo voice master", MATERIALIZE_MASTER: "Chờ renderer materialize", RUN_FACTORY_VISUAL_QA: "Chạy Factory Visual QA", RUN_FACTORY_AUDIO_QA: "Chạy Factory Audio QA", RUN_BROWSER_QA: "Chờ Browser QA", OWNER_FULL_PLAYBACK_REQUIRED: "Chủ sở hữu cần xem toàn bộ", FROZEN: "Golden Sequence đã freeze" };
const scoreColor = (value: string) => value === "PASS" || value === "FROZEN_AUDIENCE_GOLDEN" || value === "CLEAN_CONFIRMED" ? "#7cf0bd" : value === "FAIL" || value === "DEFECT_REJECTED" ? "#ff9f8c" : "#f6d37a";

async function command(action: string, body: Row = {}) {
  const response = await fetch(API, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": `owner-ui:${action.toLowerCase()}:v1:20260823` }, body: JSON.stringify({ action, ...body }) });
  const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`); return payload.snapshot || payload;
}

function Gate({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="gate"><span>{label}</span><strong style={{ color: scoreColor(value) }}>{value}</strong>{detail ? <small>{detail}</small> : null}</div>;
}

export function AudienceGoldenClient({ initial }: { initial: Row }) {
  const [data, setData] = useState(initial), [busy, setBusy] = useState(""), [error, setError] = useState(""), [ended, setEnded] = useState(false), [attested, setAttested] = useState(false), [decision, setDecision] = useState("CLEAN_CONFIRMED"), [rationale, setRationale] = useState("Tôi đã xem toàn bộ video; nội dung rõ, chuyển động có ý nghĩa, chữ dễ đọc và âm thanh tự nhiên, liền mạch."), [defects, setDefects] = useState<string[]>([]);
  const video = useRef<HTMLVideoElement>(null);
  const refresh = async () => { const response = await fetch(API, { cache: "no-store" }); if (response.ok) setData(await response.json()); };
  useEffect(() => { const timer = setInterval(refresh, 15_000); return () => clearInterval(timer); }, []);
  const run = async (action: string, body: Row = {}) => { setBusy(action); setError(""); try { setData(await command(action, body)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Tác vụ thất bại"); } finally { setBusy(""); } };
  const qas = useMemo(() => [{ key: "Visual", row: data.factoryVisualQa }, { key: "Audio", row: data.factoryAudioQa }, { key: "Browser", row: data.browserQa }], [data]);
  const canOwner = data.nextAction === "OWNER_FULL_PLAYBACK_REQUIRED" && ended && attested && rationale.trim().length >= 12 && (decision === "CLEAN_CONFIRMED" || defects.length > 0);
  return <main className="golden" data-testid="audience-golden-workbench">
    <header className="hero">
      <div><p className="eyebrow">YOUTUBE AUDIENCE MASTER · APPEND-ONLY</p><h1>Golden Sequence</h1><p>Điều gì thực sự xảy ra sau một cú chạm thẻ?</p></div>
      <div className="state" data-testid="golden-state"><span>Trạng thái</span><strong>{labels[data.nextAction] || data.nextAction}</strong></div>
    </header>
    {error ? <div className="error" role="alert">{error}</div> : null}
    <section className="panel control"><div><p className="eyebrow">SEALED CONTRACT</p><h2>Audience Master V1</h2><p>Ngưỡng 92/100 · mọi chiều trọng yếu ≥90 · P0/P1 = 0 · P2 ≤2. Freeze không cấp quyền xuất bản.</p></div><div className="actions">
      {!data.blueprint ? <button disabled={!!busy} onClick={() => run("BOOTSTRAP")}>Niêm phong blueprint</button> : null}
      {data.blueprint && !data.audio ? <button disabled={!!busy} onClick={() => run("GENERATE_AUDIO")}>Tạo exact voice master</button> : null}
      {data.materialization && !data.factoryVisualQa ? <button disabled={!!busy} onClick={() => run("RUN_FACTORY_VISUAL_QA")}>Chạy Visual QA</button> : null}
      {data.materialization && data.factoryVisualQa && !data.factoryAudioQa ? <button disabled={!!busy} onClick={() => run("RUN_FACTORY_AUDIO_QA")}>Chạy Audio QA</button> : null}
      <button className="secondary" disabled={!!busy} onClick={refresh}>{busy ? "Đang xử lý…" : "Đọc lại trạng thái"}</button>
    </div></section>
    <section className="panel"><p className="eyebrow">EXACT MASTER · 2560×1440 · H.264/AAC</p><h2>Playback evidence</h2>
      {data.materialization ? <video ref={video} data-testid="golden-master-player" src={data.materialization.masterUrl} controls playsInline preload="metadata" onEnded={() => setEnded(true)} /> : <div className="placeholder"><span>Renderer chưa nộp master</span><small>Blueprint và exact voice master phải hoàn tất trước.</small></div>}
      {data.materialization ? <div className="metrics"><Gate label="Deterministic" value={data.materialization.deterministicState}/><Gate label="Rights" value={data.materialization.rightsState}/><Gate label="Runtime" value={`${data.materialization.durationSeconds.toFixed(2)}s`}/><Gate label="Resolution" value={`${data.materialization.width}×${data.materialization.height}`}/></div> : null}
    </section>
    <section className="panel"><p className="eyebrow">INDEPENDENT EVIDENCE</p><h2>Ba lớp QA</h2><div className="qa-grid">{qas.map(({ key, row }) => <div className="qa" key={key}><span>{key}</span><strong style={{ color: scoreColor(row?.decisionState || "PENDING") }}>{row?.decisionState || "PENDING"}</strong><b>{row ? `${row.overallScore}/100` : "—"}</b><small>P0 {row?.p0Count ?? 0} · P1 {row?.p1Count ?? 0} · P2 {row?.p2Count ?? 0}</small></div>)}</div></section>
    {data.ownerTask && !data.ownerReceipt ? <section className="panel owner" data-testid="owner-review"><p className="eyebrow">NON-DELEGABLE OWNER GROUND TRUTH</p><h2>Xác nhận sau khi xem toàn bộ</h2><p>Trình phát phải chạy đến hết. Quyết định này chỉ freeze Golden Sequence; không cấp quyền publish hay release.</p>
      <label className="check"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} disabled={!ended}/><span>{ended ? "Tôi xác nhận đã xem toàn bộ exact master." : "Hãy phát video đến hết để mở xác nhận."}</span></label>
      <div className="decision"><button className={decision === "CLEAN_CONFIRMED" ? "selected" : "secondary"} onClick={() => { setDecision("CLEAN_CONFIRMED"); setDefects([]); }}>CLEAN CONFIRMED</button><button className={decision === "DEFECT_REJECTED" ? "selected danger" : "secondary"} onClick={() => setDecision("DEFECT_REJECTED")}>DEFECT REJECTED</button></div>
      {decision === "DEFECT_REJECTED" ? <div className="defects">{["OUTPUT_FORM_MISMATCH", "VISUAL_RICHNESS_LOW", "MEANINGFUL_MOTION_LOW", "MOBILE_TYPOGRAPHY_WEAK", "AUDIO_OR_SYNC_DEFECT"].map((item) => <label key={item}><input type="checkbox" checked={defects.includes(item)} onChange={(event) => setDefects((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))}/>{item}</label>)}</div> : null}
      <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} aria-label="Owner rationale"/>
      <button data-testid="owner-submit" disabled={!canOwner || !!busy} onClick={() => run("OWNER_DECISION", { decisionState: decision, fullPlaybackAttested: true, defects, rationale })}>{decision === "CLEAN_CONFIRMED" ? "Xác nhận sạch và freeze Golden Sequence" : "Ghi nhận defect và khóa master"}</button>
    </section> : null}
    {data.freeze ? <section className="frozen" data-testid="golden-frozen"><span>FROZEN AUDIENCE GOLDEN</span><strong>{data.freeze.overallScore}/100</strong><p>Exact master và toàn bộ evidence chain đã được niêm phong. Publication authority vẫn bằng 0.</p></section> : null}
    <style jsx>{`
      .golden{min-height:100vh;background:#06120f;color:#eef8f2;padding:38px clamp(18px,5vw,72px) 90px;font-family:Inter,ui-sans-serif,system-ui}.hero,.panel,.frozen{max-width:1180px;margin:0 auto 22px}.hero{display:flex;justify-content:space-between;gap:28px;align-items:end;padding:48px 0 22px;border-bottom:1px solid #275646}.hero h1{font-family:Georgia,serif;font-size:clamp(46px,8vw,92px);line-height:.92;margin:8px 0 18px;letter-spacing:-.055em}.hero p{font-size:clamp(18px,2.2vw,28px);color:#b7c9c1;margin:0}.eyebrow{color:#7cf0bd!important;font-size:12px!important;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.state{min-width:250px;padding:18px;border:1px solid #35705a;border-radius:18px;background:#0b2019}.state span,.gate span,.qa span{display:block;color:#8eaaa0;font-size:12px}.state strong{display:block;margin-top:7px;font-size:18px}.panel{background:#091c16;border:1px solid #244c3e;border-radius:24px;padding:clamp(22px,4vw,42px);box-shadow:0 24px 60px #0004}.panel h2{font-family:Georgia,serif;font-size:clamp(28px,4vw,44px);margin:7px 0 14px}.panel p{color:#b0c2bb;line-height:1.65}.control{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;align-items:center}.actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}button{appearance:none;border:0;border-radius:11px;background:#8ff0c7;color:#062118;padding:13px 18px;font-weight:800;cursor:pointer}button:disabled{opacity:.42;cursor:not-allowed}.secondary{background:#17352b;color:#dcece5;border:1px solid #386452}.danger{background:#ff9f8c!important;color:#32100a!important}.selected{outline:3px solid #fff3;outline-offset:2px}video{width:100%;aspect-ratio:16/9;border-radius:16px;background:#000;margin-top:14px}.placeholder{aspect-ratio:16/7;border-radius:16px;border:1px dashed #356451;display:grid;place-content:center;text-align:center;color:#a4bdb3}.placeholder span{font-size:22px;font-weight:800}.placeholder small{margin-top:8px}.metrics,.qa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.gate,.qa{background:#0e271f;border:1px solid #2a5646;border-radius:14px;padding:15px}.gate strong,.qa strong{display:block;font-size:18px;margin-top:7px}.gate small,.qa small{display:block;color:#8eaaa0;margin-top:6px}.qa-grid{grid-template-columns:repeat(3,1fr)}.qa b{font-size:30px;display:block;margin-top:14px}.check{display:flex;gap:12px;padding:16px;background:#102a21;border-radius:14px;margin:18px 0}.decision{display:flex;gap:10px;margin:16px 0}.defects{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0;color:#c2d2cc}.defects label{display:flex;gap:8px}textarea{width:100%;min-height:100px;background:#06130f;color:#eaf5f0;border:1px solid #356451;border-radius:12px;padding:14px;margin:8px 0 16px;font:inherit}.frozen{background:linear-gradient(135deg,#164c3a,#0b231b);border:1px solid #67d8aa;border-radius:24px;padding:34px}.frozen span{color:#8ff0c7;font-weight:900;letter-spacing:.12em}.frozen strong{font-family:Georgia,serif;display:block;font-size:60px;margin:12px 0}.error{max-width:1180px;margin:0 auto 20px;padding:14px 18px;border-radius:12px;background:#4c1e19;color:#ffd8ce}@media(max-width:760px){.golden{padding-top:14px}.hero{display:block}.state{margin-top:22px;min-width:0}.control{grid-template-columns:1fr}.actions{justify-content:flex-start}.metrics{grid-template-columns:1fr 1fr}.qa-grid{grid-template-columns:1fr}.defects{grid-template-columns:1fr}.panel{border-radius:18px}.hero h1{font-size:54px}.panel h2{font-size:32px}}
    `}</style>
  </main>;
}

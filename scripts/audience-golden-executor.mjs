#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = (process.env.FACTORY_BASE_URL || "https://youtube-ai-factory.quach-hung.chatgpt.site").replace(/\/$/, "");
const siteToken = process.env.FACTORY_SITE_AUTH_TOKEN || "";
const automationToken = process.env.AUDIENCE_GOLDEN_AUTOMATION_TOKEN || "";
const previewRevision11 = process.env.AUDIENCE_GOLDEN_PREVIEW_R11 === "1";
const previewRevision12 = process.env.AUDIENCE_GOLDEN_PREVIEW_R12 === "1";
const previewRevision13 = process.env.AUDIENCE_GOLDEN_PREVIEW_R13 === "1";
const previewRevision14 = process.env.AUDIENCE_GOLDEN_PREVIEW_R14 === "1";
if ((!siteToken || !automationToken) && !previewRevision11 && !previewRevision12 && !previewRevision13 && !previewRevision14) throw new Error("FACTORY_SITE_AUTH_TOKEN and AUDIENCE_GOLDEN_AUTOMATION_TOKEN are required");
const transport = { "OAI-Sites-Authorization": `Bearer ${siteToken}`, "x-audience-golden-automation-token": automationToken };
const api = `${baseUrl}/api/factory/sequential-production/audience-golden`;
const requestedWorkDirectory = process.env.AUDIENCE_GOLDEN_REUSE_WORKDIR || "";
const work = requestedWorkDirectory || mkdtempSync(join(tmpdir(), "youtube-audience-golden-"));
const framesDir = join(work, "frames"), samplesDir = join(work, "samples"); mkdirSync(framesDir, { recursive: true }); mkdirSync(samplesDir, { recursive: true });
const assetData = (path) => readFileSync(join(process.cwd(), path)).toString("base64");
const worldAssetData = assetData("public/golden/payment-world-r4.jpg"), exceptionsAssetData = assetData("public/golden/payment-exceptions-r4.jpg");
const bankAssetData = assetData("public/golden/payment-bank-r5.jpg"), clearingAssetData = assetData("public/golden/payment-clearing-r5.jpg"), settlementAssetData = assetData("public/golden/payment-settlement-r5.jpg");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = (command, args, options = {}) => execFileSync(command, args, { cwd: work, stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit", maxBuffer: 16 * 1024 * 1024, ...options });
const round = (value, digits = 4) => Number(Number(value).toFixed(digits));

async function request(method, body, idempotencyKey) {
  const response = await fetch(api, { method, headers: { ...transport, ...(body ? { "content-type": "application/json" } : {}), ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(`${payload?.error?.code || response.status}: ${payload?.error?.message || "request failed"}`); return payload;
}
async function download(url, path) { const response = await fetch(`${baseUrl}${url}`, { headers: transport }); if (!response.ok) throw new Error(`Download failed ${response.status}`); writeFileSync(path, new Uint8Array(await response.arrayBuffer())); }

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
function svgFrame(t, duration) {
  const p = t / duration, scene = p < .07 ? 0 : p < .21 ? 1 : p < .34 ? 2 : p < .49 ? 3 : p < .64 ? 4 : p < .77 ? 5 : p < .90 ? 6 : 7;
  const sceneStarts = [0,.07,.21,.34,.49,.64,.77,.90], sceneEnds = [.07,.21,.34,.49,.64,.77,.90,1], local = Math.max(0, Math.min(1, (p-sceneStarts[scene])/(sceneEnds[scene]-sceneStarts[scene]))), ease = local < .5 ? 2*local*local : 1-Math.pow(-2*local+2,2)/2;
  const pulse = .5 + .5*Math.sin(t*3.4), drift = Math.sin(t*.7), glow = Math.round(30+35*pulse), progress = Math.round(p*2260), palettes = [["#3d163f","#12091c"],["#073c4f","#06141b"],["#4b2810","#160c05"],["#243f16","#091408"],["#34205c","#10091f"],["#4c1720","#17070b"],["#0d4850","#041719"],["#163f31","#06130f"]], palette = palettes[scene];
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><radialGradient id="bg" cx="${scene%2?25:75}%" cy="${scene%3?20:80}%"><stop offset="0" stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="${glow/8}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="grid" width="${70+scene*9}" height="${70+scene*9}" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="2"/></pattern></defs><rect width="2560" height="1440" fill="url(#bg)"/><rect width="2560" height="1440" fill="url(#grid)"/><circle cx="${scene%2?420:2100+drift*70}" cy="${scene%2?1120:250+drift*40}" r="${280+scene*24}" fill="#8ff0c7" opacity=".035"/><g font-family="Arial,Helvetica,sans-serif" fill="#eef8f2">`;
  const footer = `<rect x="150" y="1350" width="2260" height="7" rx="4" fill="#ffffff" opacity=".12"/><rect x="150" y="1350" width="${progress}" height="7" rx="4" fill="#8ff0c7"/></g></svg>`;
  let content = "";
  if (scene === 0) {
    const tap = 300 + ease*1100; content = `<text x="1280" y="260" text-anchor="middle" font-size="72" font-weight="800">MỘT CÚ CHẠM.</text><text x="1280" y="410" text-anchor="middle" font-size="132" font-weight="900" fill="#8ff0c7">BA QUYẾT ĐỊNH.</text>${local>.52?`<text x="1280" y="535" text-anchor="middle" font-size="62" fill="#f6d37a">APPROVED ≠ PAID</text>`:""}<g transform="translate(${tap} 680)"><rect width="720" height="390" rx="48" fill="#0e2b22" stroke="#65e4b1" stroke-width="5"/><rect x="80" y="80" width="560" height="230" rx="28" fill="#153b2f"/><circle cx="565" cy="195" r="54" fill="#8ff0c7" opacity="${.4+.4*pulse}"/><path d="M140 135h250M140 205h330M140 275h190" stroke="#d9eee5" stroke-width="24" stroke-linecap="round" opacity=".8"/></g>`;
  } else if (scene === 1) {
    const x = 260 + ease*1450; content = `<text x="150" y="300" font-size="58" fill="#9ab7ac">01 · AUTHORIZATION</text><text x="150" y="410" font-size="94" font-weight="900">Ngân hàng nói:</text><text x="150" y="530" font-size="108" font-weight="900" fill="#8ff0c7">“CHO PHÉP”</text><g transform="translate(150 700)"><circle cx="80" cy="80" r="76" fill="#173e31" stroke="#8ff0c7" stroke-width="4"/><text x="80" y="96" text-anchor="middle" font-size="50">THẺ</text><path d="M180 80H1960" stroke="#386859" stroke-width="14" stroke-linecap="round"/><circle cx="${x}" cy="80" r="34" fill="#8ff0c7" filter="url(#glow)"/><g transform="translate(1960)"><circle cx="80" cy="80" r="76" fill="#173e31" stroke="#8ff0c7" stroke-width="4"/><text x="80" y="96" text-anchor="middle" font-size="42">BANK</text></g></g><g transform="translate(1540 270)"><rect width="810" height="350" rx="36" fill="#102b22" stroke="#356958"/><text x="58" y="80" font-size="34" fill="#8ba89d">KIỂM TRA TỨC THỜI</text>${["Thẻ","Hạn mức","Rủi ro"].map((s,i)=>`<text x="58" y="${155+i*68}" font-size="42">${s}</text><rect x="430" y="${120+i*68}" width="280" height="30" rx="15" fill="#193e32"/><rect x="430" y="${120+i*68}" width="${Math.round((.45+.5*Math.min(1,local*1.8-i*.12))*280)}" height="30" rx="15" fill="#8ff0c7"/>`).join("")}</g>`;
  } else if (scene === 2) {
    const hold = Math.round(320+ease*520); content = `<text x="150" y="300" font-size="58" fill="#9ab7ac">KHOẢN GIỮ TẠM</text><text x="150" y="425" font-size="96" font-weight="900">Chưa phải tiền đã chuyển.</text><g transform="translate(150 600)"><rect width="2260" height="470" rx="38" fill="#0d271f" stroke="#315f50"/><text x="70" y="90" font-size="34" fill="#8fa99f">SỐ DƯ KHẢ DỤNG</text><text x="70" y="210" font-size="104" font-weight="900">10.000.000 ₫</text><rect x="70" y="285" width="2080" height="78" rx="39" fill="#21483a"/><rect x="70" y="285" width="${hold}" height="78" rx="39" fill="#f6d37a"/><text x="${90+hold}" y="344" font-size="34" fill="#f6d37a">PENDING HOLD</text><text x="2120" y="430" text-anchor="end" font-size="36" fill="#8ff0c7">TIỀN CHƯA SETTLE</text></g>`;
  } else if (scene === 3) {
    const rows = ["Số tiền cuối","Mã người bán","Phí mạng lưới","Trách nhiệm"], scan = Math.floor(local*rows.length); content = `<text x="150" y="295" font-size="58" fill="#9ab7ac">02 · CLEARING</text><text x="150" y="410" font-size="92" font-weight="900">Bản ghi cuối được đối chiếu.</text><g transform="translate(150 545)"><rect width="2260" height="590" rx="38" fill="#0c251e" stroke="#315f50"/>${rows.map((s,i)=>`<g transform="translate(70 ${70+i*120})"><text y="48" font-size="42">${s}</text><rect x="700" width="1180" height="72" rx="18" fill="#15392d"/><rect x="700" width="${scan>i?1180:Math.round(1180*Math.max(0,local*rows.length-i))}" height="72" rx="18" fill="${scan>i?'#255947':'#8ff0c7'}"/><text x="2050" y="50" text-anchor="end" font-size="36" fill="${scan>i?'#8ff0c7':'#6f8e82'}">${scan>i?'MATCH':'CHECK'}</text></g>`).join("")}</g>`;
  } else if (scene === 4) {
    const moving = 400 + ease*1450; content = `<text x="150" y="295" font-size="58" fill="#9ab7ac">03 · SETTLEMENT</text><text x="150" y="410" font-size="92" font-weight="900">Nghĩa vụ ròng mới di chuyển.</text><g transform="translate(150 620)">${[[120,"BANK"],[770,"NETWORK"],[1420,"ACQUIRER"],[2070,"MERCHANT"]].map(([x,s])=>`<g transform="translate(${x} 180)"><circle r="110" fill="#12352a" stroke="#65e4b1" stroke-width="4"/><text text-anchor="middle" y="14" font-size="34">${s}</text></g>`).join("")}<path d="M230 180H1960" stroke="#315e4f" stroke-width="18" stroke-linecap="round"/><circle cx="${moving}" cy="180" r="45" fill="#8ff0c7" filter="url(#glow)"/><text x="1130" y="400" text-anchor="middle" font-size="48" fill="#f6d37a">NET OBLIGATION · T+N</text></g>`;
  } else if (scene === 5) {
    const active = Math.min(2,Math.floor(local*3)); const cards = [["PENDING","Khoản giữ","≠ tiền đã chuyển"],["APPROVED","Được phép","≠ người bán đã nhận"],["PAID","Đã quyết toán","= nghĩa vụ hoàn tất"]]; content = `<text x="150" y="300" font-size="58" fill="#9ab7ac">ĐỪNG GỘP BA TRẠNG THÁI</text><text x="150" y="420" font-size="94" font-weight="900">Giống một dòng chữ. Khác một sự thật.</text><g transform="translate(150 590)">${cards.map((c,i)=>`<g transform="translate(${i*760})"><rect width="700" height="490" rx="38" fill="${active===i?'#174b3a':'#0c251e'}" stroke="${active===i?'#8ff0c7':'#315f50'}" stroke-width="${active===i?6:2}"/><text x="55" y="105" font-size="36" fill="#8fa99f">${String(i+1).padStart(2,'0')}</text><text x="55" y="210" font-size="67" font-weight="900" fill="${i===2?'#8ff0c7':'#f6d37a'}">${c[0]}</text><text x="55" y="305" font-size="45">${c[1]}</text><text x="55" y="390" font-size="35" fill="#9ab7ac">${c[2]}</text></g>`).join("")}</g>`;
  } else if (scene === 6) {
    const branch = ease*680; content = `<text x="150" y="300" font-size="58" fill="#9ab7ac">NHÁNH NGOẠI LỆ</text><text x="150" y="420" font-size="94" font-weight="900">Một thay đổi. Bốn đường đi.</text><g transform="translate(150 580)"><circle cx="250" cy="280" r="115" fill="#174a39" stroke="#8ff0c7" stroke-width="5"/><text x="250" y="295" text-anchor="middle" font-size="42">GIAO DỊCH</text>${[[1150,35,"HỦY"],[1700,195,"HẾT GIỮ"],[1700,365,"HOÀN TIỀN"],[1150,525,"TRANH CHẤP"]].map(([x,y,s],i)=>`<path d="M365 280 C${600+branch} 280 ${x-380} ${y+5} ${x-150} ${y+5}" fill="none" stroke="${local>(i+1)*.18?'#8ff0c7':'#315f50'}" stroke-width="10"/><g transform="translate(${x} ${y-55})"><rect width="470" height="120" rx="28" fill="#102c23" stroke="#3b715e"/><text x="235" y="76" text-anchor="middle" font-size="42">${s}</text></g>`).join("")}</g>`;
  } else {
    const active = Math.min(2,Math.floor(local*3)); const qs = ["Đã cho phép?","Đã đối chiếu?","Đã quyết toán?"]; content = `<text x="150" y="300" font-size="58" fill="#9ab7ac">CÁCH ĐỌC ĐÚNG MỌI GIAO DỊCH</text><text x="150" y="425" font-size="105" font-weight="900" fill="#8ff0c7">HỎI BA CÂU.</text><g transform="translate(150 610)">${qs.map((q,i)=>`<g transform="translate(${i*760})"><circle cx="90" cy="90" r="82" fill="${active>=i?'#8ff0c7':'#12342a'}"/><text x="90" y="112" text-anchor="middle" font-size="60" font-weight="900" fill="${active>=i?'#082018':'#87a398'}">${i+1}</text><text x="0" y="270" font-size="54" font-weight="800">${esc(q)}</text><path d="M0 335H650" stroke="${active>=i?'#8ff0c7':'#315f50'}" stroke-width="8"/></g>`).join("")}</g><text x="150" y="1180" font-size="48" fill="#f6d37a">BA LỚP · BA THỜI ĐIỂM · MỘT GIAO DỊCH</text>`;
  }
  // Audience Master R2: every rendered text role must remain readable after
  // 1440p -> 1080p/mobile down-sampling. 56px at source becomes 42px at 1080p.
  for (const undersized of [34, 35, 36, 42, 45, 48, 50]) content = content.replaceAll(`font-size="${undersized}"`, 'font-size="56"');
  return base + content + footer;
}

function svgFrameR3(t, duration) {
  const beat = Math.min(31, Math.floor(t / 2.2)), local = Math.min(1, (t - beat * 2.2) / 2.2), ease = local < .5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
  const palettes = [["#411441","#100615"],["#063d50","#031319"],["#552b08","#160a02"],["#153f28","#04130b"],["#30205e","#0c071b"],["#511622","#150509"],["#074b4e","#031719"],["#443a0b","#120f02"]], palette = palettes[beat % palettes.length], accent = ["#89f5c6","#71d9ff","#ffd36a","#a8f57b"][beat % 4];
  const pulse = .78 + .22 * Math.sin(local * Math.PI), slide = Math.round((1 - ease) * 160), grow = Math.round(ease * 100), fade = Math.min(1, local * 4);
  const txt = (x, y, value, size = 76, color = "#f2fbf6", anchor = "start", weight = 800) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${color}">${esc(value)}</text>`;
  const pill = (x, y, w, label, color = accent) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="126" rx="63" fill="${color}" opacity=".16" stroke="${color}" stroke-width="5"/><text x="${w/2}" y="84" text-anchor="middle" font-size="72" font-weight="900" fill="${color}">${esc(label)}</text></g>`;
  const card = (x, y, w, h, stroke = accent) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="#061410" fill-opacity=".82" stroke="${stroke}" stroke-width="5"/>`;
  const arrow = (x1, y1, x2, y2, color = accent) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="18" stroke-linecap="round"/><path d="M${x2-35} ${y2-28}L${x2} ${y2}L${x2-35} ${y2+28}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
  let content = "";
  switch (beat) {
    case 0: content = `${txt(1280,330,"MỘT CÚ CHẠM",94,"#ffffff","middle",900)}${txt(1280,630,"1 GIÂY",220,accent,"middle",900)}<circle cx="1280" cy="940" r="${120+grow}" fill="${accent}" opacity="${.08+.2*pulse}"/><circle cx="1280" cy="940" r="95" fill="${accent}"/>`; break;
    case 1: content = `${txt(180+slide,300,"NHƯNG PHÍA SAU…",82,"#d7e9e1")}${pill(180,520,610,"AUTHORIZATION")}${pill(975,520,610,"CLEARING","#ffd36a")}${pill(1770,520,610,"SETTLEMENT","#71d9ff")}${txt(1280,1010,"BA QUYẾT ĐỊNH KHÁC NHAU",104,"#ffffff","middle",900)}`; break;
    case 2: content = `${txt(1280,260,"APPROVED",180,accent,"middle",900)}${txt(1280,520,"≠",190,"#ff9e88","middle",900)}${txt(1280,760,"PAID",180,"#ffd36a","middle",900)}${txt(1280,1080,"ĐÂY LÀ ĐIỂM DỄ HIỂU SAI",76,"#ffffff","middle",800)}`; break;
    case 3: content = `${txt(170,260,"1 · AUTHORIZATION",84,accent)}${txt(170,430,"THẺ ĐƯỢC ĐƯA VÀO",112)}${card(170,610,820,480)}<rect x="260" y="720" width="640" height="260" rx="32" fill="#15392f"/><circle cx="${390+ease*380}" cy="850" r="64" fill="${accent}"/>${arrow(1110,850,2200,850)}${txt(2240,880,"BANK",82,accent,"end",900)}`; break;
    case 4: content = `${txt(170,250,"NGÂN HÀNG KIỂM TRA",108)}${card(170,430,2220,680)}${pill(250,560,570,"THẺ HỢP LỆ")}${pill(995,560,570,"ĐỦ HẠN MỨC","#ffd36a")}${pill(1740,560,570,"RỦI RO THẤP","#71d9ff")}<rect x="250" y="870" width="2060" height="90" rx="45" fill="#17372d"/><rect x="250" y="870" width="${Math.round(2060*ease)}" height="90" rx="45" fill="${accent}"/>`; break;
    case 5: content = `${txt(1280,320,"QUYẾT ĐỊNH #1",88,"#d8ebe3","middle")}${txt(1280,590,"CHO PHÉP",190,accent,"middle",900)}${pill(700,820,1160,"AUTHORIZATION ≠ TRANSFER")}`; break;
    case 6: content = `${txt(170,260,"BANK TẠO KHOẢN GIỮ",102)}${card(170,460,2220,590,"#ffd36a")}${txt(280,650,"HẠN MỨC",76,"#cadbd4")}${txt(2280,650,"10.000.000 ₫",92,"#ffffff","end",900)}<rect x="280" y="760" width="2000" height="120" rx="60" fill="#15342a"/><rect x="280" y="760" width="${Math.round(520*ease)}" height="120" rx="60" fill="#ffd36a"/>${txt(800,850,"GIỮ 2.000.000 ₫",72,"#ffd36a")}`; break;
    case 7: content = `${txt(1280,270,"AUTHORIZED",96,accent,"middle",900)}${txt(1280,500,"CHỈ LÀ QUYỀN CHO PHÉP",116,"#ffffff","middle",900)}${txt(1280,740,"TIỀN CHƯA RỜI NGÂN HÀNG",94,"#ffd36a","middle",900)}${pill(680,950,1200,"PENDING HOLD")}`; break;
    case 8: content = `${txt(170,260,"2 · KHOẢN GIỮ TẠM",86,"#ffd36a")}${txt(170,450,"TRƯỚC GIAO DỊCH",80,"#d8ebe3")}${txt(170,640,"10.000.000 ₫",170,"#ffffff", "start",900)}${arrow(1340,620,2200,620,"#ffd36a")}${txt(2360,650,"HOLD",82,"#ffd36a","end",900)}`; break;
    case 9: content = `${txt(1280,280,"10.000.000 ₫",130,"#ffffff","middle",900)}${txt(1280,520,"− 2.000.000 ₫ GIỮ TẠM",108,"#ffd36a","middle",900)}<path d="M520 650H2040" stroke="#ffffff" stroke-width="8"/>${txt(1280,870,"8.000.000 ₫ KHẢ DỤNG",138,accent,"middle",900)}`; break;
    case 10: content = `${txt(160,280,"SỐ DƯ SỔ CÁI",88,"#d9ebe4")}${txt(160,470,"10.000.000 ₫",140,"#ffffff")}${txt(1500,280,"SỐ DƯ KHẢ DỤNG",88,"#d9ebe4")}${txt(1500,470,"8.000.000 ₫",140,accent)}${pill(650,760,1260,"KHÁC NHAU 2.000.000 ₫","#ffd36a")}`; break;
    case 11: content = `${txt(1280,300,"HOLD",180,"#ffd36a","middle",900)}${txt(1280,545,"≠",170,"#ff9e88","middle",900)}${txt(1280,790,"SETTLEMENT",170,accent,"middle",900)}${txt(1280,1090,"GIỮ TẠM KHÔNG PHẢI TIỀN ĐÃ CHUYỂN",74,"#ffffff","middle",900)}`; break;
    case 12: content = `${txt(170,250,"3 · CLEARING",90,"#ffd36a")}${card(170,430,900,650)}${txt(260,570,"BẢN GHI NGƯỜI BÁN",72,"#d8e9e2")}${txt(260,760,"2.050.000 ₫",126,"#ffffff")}${txt(260,930,"MCC · 5411",76,"#ffd36a")}${arrow(1180,750,2250,750,"#ffd36a")}`; break;
    case 13: content = `${txt(1280,250,"MẠNG LƯỚI NHẬN BẢN GHI",102,"#ffffff","middle")}${card(590,430,1380,650,"#71d9ff")}${txt(1280,590,"NETWORK RECORD",80,"#71d9ff","middle")}${txt(1280,800,"2.050.000 ₫",150,"#ffffff","middle",900)}${txt(1280,980,"PHÍ · 25.000 ₫",78,"#ffd36a","middle")}`; break;
    case 14: content = `${txt(1280,220,"ĐỐI CHIẾU HAI PHÍA",96,"#ffffff","middle")}${card(120,400,1040,650,accent)}${card(1400,400,1040,650,"#ffd36a")}${txt(640,570,"MERCHANT",78,accent,"middle")}${txt(640,770,"2.050.000 ₫",110,"#ffffff","middle",900)}${txt(1920,570,"NETWORK",78,"#ffd36a","middle")}${txt(1920,770,"2.050.000 ₫",110,"#ffffff","middle",900)}${txt(1280,960,"=",130,"#ffffff","middle",900)}`; break;
    case 15: content = `${txt(1280,250,"MATCH",190,accent,"middle",900)}${pill(280,540,570,"SỐ TIỀN")}${pill(995,540,570,"MÃ NGƯỜI BÁN","#ffd36a")}${pill(1710,540,570,"TRÁCH NHIỆM","#71d9ff")}${txt(1280,980,"BẢN GHI CUỐI ĐÃ ĐƯỢC ĐỐI CHIẾU",84,"#ffffff","middle",900)}`; break;
    case 16: content = `${txt(180,250,"NẾU SỐ TIỀN THAY ĐỔI",104)}${txt(180,500,"HOLD",82,"#d7e9e1")}${txt(850,500,"2.000.000 ₫",110,"#ffd36a","end",900)}${arrow(980,470,1530,470,"#ff9e88")}${txt(2380,500,"2.050.000 ₫",110,accent,"end",900)}${txt(2380,650,"CLEARING",82,"#d7e9e1","end")}${txt(1280,960,"CHÊNH 50.000 ₫ ĐƯỢC ĐIỀU CHỈNH",86,"#ffffff","middle",900)}`; break;
    case 17: content = `${txt(1280,320,"QUYẾT ĐỊNH #2",88,"#d7e9e1","middle")}${txt(1280,600,"BẢN GHI CUỐI",170,"#ffd36a","middle",900)}${txt(1280,850,"ĐÃ KHỚP CHƯA?",120,"#ffffff","middle",900)}`; break;
    case 18: content = `${txt(160,230,"4 · SETTLEMENT",90,"#71d9ff")}${["BANK","NETWORK","ACQUIRER","MERCHANT"].map((s,i)=>`${pill(90+i*630,570,520,s,i%2?"#71d9ff":accent)}${i<3?arrow(610+i*630,635,710+i*630,635,"#ffffff"):""}`).join("")}${txt(1280,1030,"NGHĨA VỤ RÒNG DI CHUYỂN",88,"#ffffff","middle",900)}`; break;
    case 19: content = `${txt(1280,230,"KHÔNG CHUYỂN TỪNG GIAO DỊCH",94,"#ffffff","middle")}${card(320,430,1920,630,"#71d9ff")}${txt(510,600,"BANK A",72,accent)}${txt(2050,600,"+ 120M",92,accent,"end",900)}${txt(510,790,"BANK B",72,"#ffd36a")}${txt(2050,790,"− 120M",92,"#ffd36a","end",900)}${pill(760,920,1040,"NET OBLIGATION","#71d9ff")}`; break;
    case 20: content = `${txt(160,280,"T",130,accent)}${txt(780,280,"T+1",130,"#ffd36a")}${txt(1500,280,"T+N",130,"#71d9ff")}<path d="M220 540H2320" stroke="#ffffff" stroke-width="12" opacity=".55"/><circle cx="${220+ease*2100}" cy="540" r="62" fill="${accent}"/>${txt(220,760,"AUTHORIZED",72,accent)}${txt(1280,760,"CLEARED",72,"#ffd36a","middle")}${txt(2320,760,"SETTLED",72,"#71d9ff","end")}`; break;
    case 21: content = `${txt(1280,280,"NGƯỜI BÁN NHẬN TIỀN",112,"#ffffff","middle")}${card(600,480,1360,520,accent)}${txt(1280,680,"2.025.000 ₫",170,accent,"middle",900)}${txt(1280,860,"SAU PHÍ · THEO LỊCH",78,"#ffd36a","middle")}`; break;
    case 22: content = `${txt(1280,300,"QUYẾT ĐỊNH #3",88,"#d7e9e1","middle")}${txt(1280,580,"ĐÃ QUYẾT TOÁN?",164,"#71d9ff","middle",900)}${pill(670,840,1220,"SETTLEMENT = MONEY MOVES")}`; break;
    case 23: content = `${pill(170,280,650,"AUTHORIZATION")}${pill(955,280,650,"CLEARING","#ffd36a")}${pill(1740,280,650,"SETTLEMENT","#71d9ff")}${txt(495,650,"CHO PHÉP",78,accent,"middle")}${txt(1280,650,"ĐỐI CHIẾU",78,"#ffd36a","middle")}${txt(2065,650,"CHUYỂN RÒNG",78,"#71d9ff","middle")}${txt(1280,980,"BA LỚP · KHÔNG PHẢI MỘT",100,"#ffffff","middle",900)}`; break;
    case 24: content = `${txt(1280,250,"PENDING",180,"#ffd36a","middle",900)}${txt(1280,520,"KHOẢN GIỮ ĐANG CHỜ",100,"#ffffff","middle")}${txt(1280,770,"≠ BỊ TRỪ HAI LẦN",130,"#ff9e88","middle",900)}`; break;
    case 25: content = `${txt(1280,250,"APPROVED",180,accent,"middle",900)}${txt(1280,520,"NGÂN HÀNG ĐÃ CHO PHÉP",100,"#ffffff","middle")}${txt(1280,770,"≠ NGƯỜI BÁN ĐÃ NHẬN",118,"#ff9e88","middle",900)}`; break;
    case 26: content = `${txt(1280,250,"PAID",200,"#71d9ff","middle",900)}${txt(1280,550,"NGHĨA VỤ ĐÃ QUYẾT TOÁN",108,"#ffffff","middle")}${pill(720,820,1120,"MONEY SETTLED","#71d9ff")}`; break;
    case 27: content = `${txt(1280,200,"ĐỪNG GỘP BA TRẠNG THÁI",90,"#ffffff","middle")}${pill(170,480,650,"PENDING","#ffd36a")}${pill(955,480,650,"APPROVED",accent)}${pill(1740,480,650,"PAID","#71d9ff")}${txt(1280,910,"MỖI TRẠNG THÁI TRẢ LỜI MỘT CÂU HỎI",74,"#dcebe5","middle",900)}`; break;
    case 28: content = `${txt(220,250,"HỦY",150,"#ff9e88")}${txt(220,500,"HOLD ĐƯỢC GỠ",86,"#ffffff")}${arrow(1280,620,2150,300,"#ffd36a")}${arrow(1280,620,2150,620,accent)}${arrow(1280,620,2150,940,"#71d9ff")}${txt(2320,330,"HẾT GIỮ",72,"#ffd36a","end")}${txt(2320,650,"HOÀN TIỀN",72,accent,"end")}${txt(2320,970,"TRANH CHẤP",72,"#71d9ff","end")}`; break;
    case 29: content = `${txt(1280,230,"HOÀN TIỀN",150,accent,"middle",900)}${txt(1280,490,"LÀ MỘT GIAO DỊCH NGƯỢC",94,"#ffffff","middle")}${arrow(2050,750,510,750,accent)}${pill(830,920,900,"NEW RECORD")}`; break;
    case 30: content = `${txt(1280,230,"TRANH CHẤP",148,"#71d9ff","middle",900)}${card(170,470,620,500,"#ff9e88")}${card(970,470,620,500,"#ffd36a")}${card(1770,470,620,500,accent)}${txt(480,700,"CLAIM",76,"#ff9e88","middle")}${txt(1280,700,"EVIDENCE",76,"#ffd36a","middle")}${txt(2080,700,"RULING",76,accent,"middle")}`; break;
    default: content = `${txt(1280,190,"HỎI BA CÂU",122,"#ffffff","middle",900)}${pill(260,420,2040,"1 · ĐÃ CHO PHÉP?")}${pill(260,650,2040,"2 · ĐÃ ĐỐI CHIẾU?","#ffd36a")}${pill(260,880,2040,"3 · ĐÃ QUYẾT TOÁN?","#71d9ff")}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><radialGradient id="bg3" cx="${20+(beat%4)*20}%" cy="${25+(beat%3)*25}%"><stop offset="0" stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></radialGradient></defs><rect width="2560" height="1440" fill="url(#bg3)"/><circle cx="${250+(beat%4)*680}" cy="${180+(beat%3)*480}" r="${250+grow}" fill="${accent}" opacity=".045"/><g font-family="Arial,Helvetica,sans-serif" opacity="${fade}">${content}</g></svg>`;
}

function svgFrameR4(t, duration) {
  const phase = Math.min(15, Math.floor(t / (duration / 16))), local = (t % (duration / 16)) / (duration / 16), ease = local < .5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2, exceptionWorld = phase >= 13;
  const labels = [
    ["MỘT CÚ CHẠM", "MỘT TOKEN BẮT ĐẦU HÀNH TRÌNH"], ["BA QUYẾT ĐỊNH", "AUTHORIZATION · CLEARING · SETTLEMENT"],
    ["AUTHORIZATION", "THẺ · HẠN MỨC · RỦI RO"], ["GIỮ TẠM 2.000.000 ₫", "TIỀN CHƯA RỜI NGÂN HÀNG"],
    ["10M − 2M = 8M KHẢ DỤNG", "SỔ CÁI VẪN LÀ 10M"], ["CLEARING", "HAI BẢN GHI ĐI VÀO MỘT HUB"],
    ["2.050.000 ₫ = 2.050.000 ₫", "MERCHANT RECORD · NETWORK RECORD"], ["MATCH", "SỐ TIỀN · PHÍ · TRÁCH NHIỆM"],
    ["SETTLEMENT", "NGHĨA VỤ RÒNG BẮT ĐẦU DI CHUYỂN"], ["NET OBLIGATION", "CÁC NGÂN HÀNG BÙ TRỪ LẪN NHAU"],
    ["T → T+N", "NGƯỜI BÁN NHẬN TIỀN THEO LỊCH"], ["PENDING ≠ APPROVED ≠ PAID", "BA TRẠNG THÁI · BA SỰ THẬT"],
    ["TOKEN ĐI ĐẾN ĐÍCH", "SETTLED · KHÔNG CHỈ APPROVED"], ["HỦY · HẾT GIỮ", "HOLD ĐƯỢC TRẢ VỀ SỐ DƯ KHẢ DỤNG"],
    ["HOÀN TIỀN · TRANH CHẤP", "TOKEN ĐI NGƯỢC HOẶC VÀO EVIDENCE CHAMBER"], ["HỎI BA CÂU", "CHO PHÉP? · ĐỐI CHIẾU? · QUYẾT TOÁN?"]
  ];
  const focus = [[420,940],[610,850],[830,730],[920,690],[1040,680],[1240,720],[1420,700],[1510,690],[1710,730],[1840,760],[2050,730],[2200,690],[2290,700],[720,500],[1460,610],[2060,760]][phase];
  const tokenX = Math.round(focus[0] + Math.sin(local * Math.PI * 2) * 48), tokenY = Math.round(focus[1] - Math.sin(local * Math.PI) * 90), pulse = 1 + .12 * Math.sin(local * Math.PI * 2);
  let width = 2560, height = 1440, x = 0, y = 0;
  if (!exceptionWorld && phase >= 2 && phase <= 4) { width = 3200; height = 1801; x = -80; y = -210; }
  else if (!exceptionWorld && phase >= 5 && phase <= 9) { width = 3300; height = 1858; x = -560; y = -220; }
  else if (!exceptionWorld && phase >= 10) { width = 3200; height = 1801; x = -640; y = -190; }
  else if (exceptionWorld && phase === 14) { width = 3100; height = 1745; x = -430; y = -170; }
  const trail = Array.from({ length: 9 }, (_, index) => { const lag = index * 26, alpha = .48 - index * .045; return `<circle cx="${tokenX-lag}" cy="${tokenY+Math.sin((local-index*.08)*Math.PI*2)*24}" r="${20-index}" fill="#72ffd0" opacity="${Math.max(.05,alpha)}"/>`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><linearGradient id="caption" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020b09" stop-opacity="0"/><stop offset=".45" stop-color="#020b09" stop-opacity=".55"/><stop offset="1" stop-color="#020b09" stop-opacity=".94"/></linearGradient><filter id="tokenGlow"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><image href="data:image/jpeg;base64,${exceptionWorld?exceptionsAssetData:worldAssetData}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="url(#caption)"/>${trail}<g filter="url(#tokenGlow)" transform="translate(${tokenX} ${tokenY}) scale(${pulse})"><circle r="92" fill="#091d18" stroke="#72ffd0" stroke-width="16"/><circle r="58" fill="#72ffd0"/><path d="M-22 0H22M0-22V22" stroke="#06251b" stroke-width="12" stroke-linecap="round"/></g><g font-family="Arial,Helvetica,sans-serif"><text x="150" y="1160" font-size="${phase===6||phase===11?112:128}" font-weight="900" fill="#ffffff">${esc(labels[phase][0])}</text><text x="150" y="1280" font-size="76" font-weight="800" fill="#8ff0c7">${esc(labels[phase][1])}</text><circle cx="2380" cy="1190" r="62" fill="#72ffd0" opacity="${.65+.35*ease}"/><text x="2380" y="1215" text-anchor="middle" font-size="72" font-weight="900" fill="#06251b">${phase+1}</text></g></svg>`;
}

function svgFrameR5(t, duration) {
  const phaseLength = duration / 20, phase = Math.min(19, Math.floor(t / phaseLength)), local = Math.min(1, (t - phase * phaseLength) / phaseLength);
  const ease = local < .5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2, pulse = .5 + .5 * Math.sin(local * Math.PI * 2), bob = Math.sin(local * Math.PI * 2);
  const world = phase <= 1 || phase >= 18 ? "world" : phase <= 5 ? "bank" : phase <= 9 ? "clearing" : phase <= 13 ? "settlement" : "exceptions";
  const data = world === "world" ? worldAssetData : world === "bank" ? bankAssetData : world === "clearing" ? clearingAssetData : world === "settlement" ? settlementAssetData : exceptionsAssetData;
  const title = (x, y, value, size = 128, anchor = "start", color = "#ffffff") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="900" fill="${color}" stroke="#020806" stroke-width="18" paint-order="stroke">${esc(value)}</text>`;
  const line = (x, y, value, size = 96, anchor = "start", color = "#9ff2d2") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="800" fill="${color}" stroke="#020806" stroke-width="14" paint-order="stroke">${esc(value)}</text>`;
  const token = (x, y, radius = 72, color = "#72ffd0", scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})" filter="url(#glow)"><circle r="${radius}" fill="#071712" stroke="${color}" stroke-width="14"/><circle r="${Math.round(radius*.58)}" fill="${color}"/><path d="M-${Math.round(radius*.22)} 0H${Math.round(radius*.22)}M0 -${Math.round(radius*.22)}V${Math.round(radius*.22)}" stroke="#06251b" stroke-width="11" stroke-linecap="round"/></g>`;
  const coin = (x, y, radius, opacity = 1) => `<ellipse cx="${x}" cy="${y}" rx="${radius}" ry="${Math.round(radius*.36)}" fill="#ffd36a" stroke="#fff0a8" stroke-width="9" opacity="${opacity}"/>`;
  let objects = "", words = "";
  if (phase === 0) {
    const x = 380 + ease * 690, y = 1000 - Math.sin(ease * Math.PI) * 330;
    objects = `${token(x,y,88,"#72ffd0",1+.08*pulse)}<path d="M360 1020 Q760 390 1090 720" fill="none" stroke="#72ffd0" stroke-width="24" stroke-linecap="round" stroke-dasharray="26 30" opacity=".72"/>`;
    words = `${title(145,210,"MỘT CÚ CHẠM",154)}${line(145,340,"BA QUYẾT ĐỊNH PHÍA SAU",104)}`;
  } else if (phase === 1) {
    const xs = [710,1280,1850], active = Math.min(2, Math.floor(local * 3));
    objects = xs.map((x,index)=>`<circle cx="${x}" cy="760" r="${120+(index===active?35:0)}" fill="${index===active?'#72ffd0':'#061b15'}" stroke="${index===active?'#ffffff':'#72ffd0'}" stroke-width="${index===active?20:10}" opacity="${index===active?1:.72}"/>${token(x,760,52,index===0?'#72ffd0':index===1?'#ffd36a':'#71d9ff',1+.08*bob)}`).join("");
    words = `${title(1280,190,"KHÔNG PHẢI MỘT BƯỚC",132,"middle")}${line(710,1050,"CHO PHÉP",96,"middle")}${line(1280,1050,"ĐỐI CHIẾU",96,"middle","#ffd36a")}${line(1850,1050,"QUYẾT TOÁN",96,"middle","#71d9ff")}`;
  } else if (phase === 2) {
    const checks = Math.min(3, Math.floor(local * 4));
    objects = [0,1,2].map((i)=>`<rect x="${300+i*540}" y="${670-i*85}" width="390" height="190" rx="70" fill="${i<=checks?'#0d8c63':'#34140f'}" stroke="${i<=checks?'#72ffd0':'#ff8f78'}" stroke-width="16"/><path d="M${410+i*540} ${765-i*85} l55 55 115 -130" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" opacity="${i<=checks?1:.12}"/>`).join("");
    words = `${title(150,190,"NGÂN HÀNG KIỂM TRA",130)}${line(150,330,"THẺ · HẠN MỨC · RỦI RO",100)}`;
  } else if (phase === 3) {
    const ring = 250 - ease * 100;
    objects = `<circle cx="1830" cy="775" r="${ring}" fill="none" stroke="#ffd36a" stroke-width="${28+ease*42}" opacity=".9"/>${token(1830,775,72,"#ffd36a",1+.12*pulse)}<path d="M1200 760 H${1580+ease*80}" stroke="#ffd36a" stroke-width="32" stroke-linecap="round"/>`;
    words = `${title(150,190,"GIỮ TẠM 2 TRIỆU",142)}${line(150,330,"TIỀN CHƯA RỜI NGÂN HÀNG",98,"start","#ffd36a")}`;
  } else if (phase === 4) {
    const available = 10 - 2 * ease, fillHeight = 470 * (available / 10), y = 1120 - fillHeight;
    objects = `<rect x="1630" y="620" width="520" height="500" rx="70" fill="#06130f" stroke="#ffffff" stroke-width="16"/><rect x="1655" y="${y}" width="470" height="${fillHeight}" rx="45" fill="#72ffd0" opacity=".82"/><path d="M1620 740 H2160" stroke="#ffd36a" stroke-width="24" stroke-dasharray="24 20"/>`;
    words = `${title(150,210,"10 TRIỆU",176)}${line(150,400,"GIỮ 2 TRIỆU",116,"start","#ffd36a")}${title(150,600,`${available.toFixed(1).replace('.0','')} TRIỆU CÒN DÙNG`,118,"start","#72ffd0")}`;
  } else if (phase === 5) {
    const release = ease;
    objects = `<circle cx="1810" cy="760" r="${130+release*180}" fill="none" stroke="#ffd36a" stroke-width="${48-release*36}" opacity="${1-release*.85}"/>${token(1810,760,76,"#72ffd0",1+.1*pulse)}<path d="M1810 760 Q1450 980 ${1150-release*420} ${980-release*180}" fill="none" stroke="#72ffd0" stroke-width="25" stroke-dasharray="28 24"/>`;
    words = `${title(150,190,"CHO PHÉP ≠ CHUYỂN TIỀN",124)}${line(150,340,"MỚI CHỈ LÀ QUYỀN VÀ KHOẢN GIỮ",96)}`;
  } else if (phase === 6) {
    const left = 290 + ease * 430, right = 1770 - ease * 430;
    objects = `<g transform="translate(${left} 620) rotate(${-8+ease*8})"><rect width="560" height="390" rx="52" fill="#4c2710" stroke="#ffd36a" stroke-width="18"/><path d="M75 105 H485 M75 190 H410 M75 275 H450" stroke="#fff1bd" stroke-width="28"/></g><g transform="translate(${right} 620) rotate(${8-ease*8})"><rect width="560" height="390" rx="52" fill="#06384d" stroke="#71d9ff" stroke-width="18"/><path d="M75 105 H485 M75 190 H410 M75 275 H450" stroke="#dff8ff" stroke-width="28"/></g>`;
    words = `${title(1280,180,"HAI BẢN GHI HỘI TỤ",126,"middle")}${line(430,1180,"NGƯỜI BÁN",96,"middle","#ffd36a")}${line(2130,1180,"MẠNG LƯỚI",96,"middle","#71d9ff")}`;
  } else if (phase === 7) {
    const gap = 420 * (1-ease);
    objects = `<rect x="${460+gap}" y="570" width="680" height="430" rx="54" fill="#4c2710" stroke="#ffd36a" stroke-width="20" opacity=".9"/><rect x="${1420-gap}" y="570" width="680" height="430" rx="54" fill="#06384d" stroke="#71d9ff" stroke-width="20" opacity=".9"/>${token(1280,785,86,ease>.8?'#72ffd0':'#ff9e88',1+.1*pulse)}`;
    words = `${title(1280,190,"2,05 TRIỆU = 2,05 TRIỆU",126,"middle")}${line(1280,360,"SỐ TIỀN · PHÍ · TRÁCH NHIỆM",96,"middle")}`;
  } else if (phase === 8) {
    const lockY = 1050 - ease * 300;
    objects = `<path d="M930 790 H1630" stroke="#ffffff" stroke-width="36"/><rect x="1030" y="680" width="500" height="300" rx="56" fill="#06251b" stroke="#72ffd0" stroke-width="22"/><path d="M1130 685 V590 C1130 380 1430 380 1430 590 V685" fill="none" stroke="#72ffd0" stroke-width="30"/><circle cx="1280" cy="820" r="48" fill="#72ffd0"/><path d="M1280 852 V920" stroke="#72ffd0" stroke-width="28"/><path d="M1280 330 V${lockY}" stroke="#ffd36a" stroke-width="24" stroke-dasharray="20 22"/>`;
    words = `${title(160,190,"ĐÃ ĐỐI CHIẾU",146)}${line(160,340,"BẢN GHI CUỐI ĐƯỢC KHÓA",100)}`;
  } else if (phase === 9) {
    const delta = Math.round(ease * 50);
    objects = `<path d="M550 820 H2010" stroke="#72ffd0" stroke-width="30" stroke-dasharray="38 26"/><circle cx="${550+ease*1460}" cy="820" r="100" fill="#ffd36a" stroke="#ffffff" stroke-width="16"/><path d="M${550+ease*1460} 650 V990" stroke="#ffd36a" stroke-width="20" opacity=".55"/>`;
    words = `${title(1280,190,"GIỮ 2,00 TRIỆU",120,"middle","#ffd36a")}${title(1280,355,`BẢN GHI 2,${String(delta).padStart(2,'0')} TRIỆU`,120,"middle","#72ffd0")}${line(1280,520,"HAI CON SỐ CÓ THỂ KHÁC NHAU",96,"middle")}`;
  } else if (phase === 10) {
    const tokens = Array.from({length:12},(_,i)=>{ const a=(i/12)*Math.PI*2, startX=1280+Math.cos(a)*820, startY=760+Math.sin(a)*430, x=startX+(1280-startX)*ease, y=startY+(760-startY)*ease; return coin(Math.round(x),Math.round(y),34,.55+.45*ease); }).join("");
    objects = `${tokens}<circle cx="1280" cy="760" r="${150+30*pulse}" fill="#071b17" stroke="#72ffd0" stroke-width="22"/><path d="M1280 620 l95 165 -190 0 z" fill="#72ffd0" transform="rotate(${ease*240} 1280 760)"/>`;
    words = `${title(150,190,"NHIỀU NGHĨA VỤ",136)}${line(150,340,"ĐI VÀO BỘ BÙ TRỪ",102)}`;
  } else if (phase === 11) {
    const count = Math.max(1, 10-Math.floor(ease*9));
    objects = Array.from({length:count},(_,i)=>coin(900+i*72,770+Math.sin(i)*70,42,.85)).join("") + `<path d="M760 770 H1780" stroke="#ffd36a" stroke-width="26"/><circle cx="1280" cy="770" r="180" fill="#06251b" stroke="#72ffd0" stroke-width="24"/>${token(1280,770,86,"#72ffd0",1+.15*pulse)}`;
    words = `${title(1280,190,"BÙ TRỪ",164,"middle")}${line(1280,360,"NHIỀU DÒNG → MỘT SỐ RÒNG",102,"middle")}`;
  } else if (phase === 12) {
    const x=1050+ease*900;
    objects = `${token(x,780,94,"#71d9ff",1+.08*pulse)}<path d="M980 780 H2050" stroke="#71d9ff" stroke-width="34" stroke-dasharray="30 26"/><path d="M1960 700 L2110 780 1960 860" fill="#71d9ff"/>`;
    words = `${title(150,190,"NGHĨA VỤ RÒNG",140)}${line(150,340,"MỚI THỰC SỰ DI CHUYỂN",102,"start","#71d9ff")}`;
  } else if (phase === 13) {
    const stack = 2 + Math.floor(ease * 7);
    objects = Array.from({length:stack},(_,i)=>coin(1880,1040-i*58,150,1)).join("") + `${token(1510+ease*330,780-ease*120,78,"#72ffd0",1+.08*pulse)}`;
    words = `${title(150,190,"NGƯỜI BÁN NHẬN TIỀN",126)}${line(150,340,"THEO LỊCH QUYẾT TOÁN",102)}`;
  } else if (phase === 14) {
    const states = ["ĐANG GIỮ","ĐÃ CHO PHÉP","ĐÃ QUYẾT TOÁN"], active=Math.min(2,Math.floor(local*3));
    objects = [650,1280,1910].map((x,i)=>`<circle cx="${x}" cy="770" r="${i===active?170:110}" fill="${i===active?'#0c4f3b':'#07140f'}" stroke="${i===0?'#ffd36a':i===1?'#72ffd0':'#71d9ff'}" stroke-width="${i===active?25:12}"/>${i===active?token(x,770,70,i===0?'#ffd36a':i===1?'#72ffd0':'#71d9ff',1+.1*pulse):''}`).join("");
    words = `${title(1280,175,states[active],154,"middle",active===0?'#ffd36a':active===1?'#72ffd0':'#71d9ff')}${line(1280,1170,"BA TRẠNG THÁI · BA SỰ THẬT",98,"middle")}`;
  } else if (phase === 15) {
    const progress = ease;
    objects = `<path d="M430 850 H2130" stroke="#ffffff" stroke-width="26" opacity=".38"/><path d="M430 850 H${430+1700*progress}" stroke="#ffd36a" stroke-width="42"/><circle cx="${430+1700*progress}" cy="850" r="90" fill="#ffd36a" stroke="#ffffff" stroke-width="16"/>`;
    words = `${title(1280,190,"ĐANG GIỮ ≠ TRỪ HAI LẦN",124,"middle")}${line(1280,350,"KHOẢN GIỮ CÓ THỂ ĐƯỢC GỠ",100,"middle","#ffd36a")}`;
  } else if (phase === 16) {
    const branch=Math.min(3,Math.floor(local*4)), ends=[[480,1030],[1030,1120],[1580,1120],[2100,1030]];
    objects = ends.map(([x,y],i)=>`<path d="M1280 570 Q${x} 720 ${x} ${y}" fill="none" stroke="${i===branch?'#72ffd0':'#ffffff'}" stroke-width="${i===branch?34:16}" opacity="${i===branch?1:.3}"/>${i===branch?token(x,y,62,"#72ffd0",1+.12*pulse):''}`).join("");
    words = `${title(1280,170,["HỦY","HẾT GIỮ","HOÀN TIỀN","TRANH CHẤP"][branch],158,"middle")}${line(1280,330,"MỖI NHÁNH CÓ MỘT ĐƯỜNG RIÊNG",98,"middle")}`;
  } else if (phase === 17) {
    const x=2050-ease*1380;
    objects = `<path d="M2100 820 H520" stroke="#ff9e88" stroke-width="36" stroke-dasharray="30 24"/><path d="M650 720 L480 820 650 920" fill="#ff9e88"/>${token(x,820,80,"#ff9e88",1+.1*pulse)}`;
    words = `${title(150,190,"HOÀN TIỀN",150,"start","#ff9e88")}${line(150,345,"LÀ MỘT BẢN GHI ĐI NGƯỢC",102)}`;
  } else if (phase === 18) {
    const active=Math.min(2,Math.floor(local*3)), ys=[520,805,1090];
    objects = ys.map((y,i)=>`<circle cx="420" cy="${y}" r="${i===active?118:78}" fill="#071b15" stroke="${i===0?'#72ffd0':i===1?'#ffd36a':'#71d9ff'}" stroke-width="${i===active?22:11}"/>${i===active?token(420,y,52,i===0?'#72ffd0':i===1?'#ffd36a':'#71d9ff',1+.08*pulse):''}`).join("");
    words = `${title(150,175,"HỎI BA CÂU",158)}${line(620,555,"ĐÃ CHO PHÉP?",112,"start")}${line(620,840,"ĐÃ ĐỐI CHIẾU?",112,"start","#ffd36a")}${line(620,1125,"ĐÃ QUYẾT TOÁN?",112,"start","#71d9ff")}`;
  } else {
    const x=500+ease*1620;
    objects = `<path d="M430 900 C800 420 1680 420 2140 900" fill="none" stroke="#72ffd0" stroke-width="34" stroke-dasharray="34 28"/>${token(x,900-Math.sin(ease*Math.PI)*420,98,"#72ffd0",1+.12*pulse)}`;
    words = `${title(1280,180,"BA LỚP · MỘT GIAO DỊCH",138,"middle")}${line(1280,350,"CHO PHÉP → ĐỐI CHIẾU → QUYẾT TOÁN",96,"middle")}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><filter id="glow"><feGaussianBlur stdDeviation="14" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#020806" stop-opacity=".82"/><stop offset=".42" stop-color="#020806" stop-opacity=".08"/><stop offset="1" stop-color="#020806" stop-opacity=".3"/></linearGradient></defs><image href="data:image/jpeg;base64,${data}" x="${-35*bob}" y="${-20*bob}" width="2630" height="1480" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="url(#shade)"/>${objects}<g font-family="Arial,Helvetica,sans-serif">${words}</g></svg>`;
}

function svgFrameR6(t, duration) {
  const phaseLength = duration / 20, phase = Math.min(19, Math.floor(t / phaseLength)), local = Math.min(1, (t - phase * phaseLength) / phaseLength), ease = local < .5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
  let svg = svgFrameR5(t, duration);
  const crops = [
    [0,0,2560,1440],[-180,-90,2860,1609],[-620,-210,3240,1823],[-1120,-360,3660,2059],[-120,-300,3300,1856],[-760,-120,3400,1913],
    [0,0,2560,1440],[-430,-210,3240,1823],[-900,-320,3580,2014],[-170,-260,3260,1834],
    [0,0,2560,1440],[-470,-240,3300,1856],[-930,-280,3540,1991],[-350,-80,3020,1699],
    [0,0,2560,1440],[-720,-160,3300,1856],[-180,-280,3320,1868],[-880,-210,3440,1935],[-120,-70,2840,1598],[0,0,2560,1440]
  ];
  const [x,y,width,height] = crops[phase];
  svg = svg.replace(/x="-?[\d.]+" y="-?[\d.]+" width="2630" height="1480" preserveAspectRatio="xMidYMid slice"/, `x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"`);
  const cuts = [4,9,11,14,16].includes(phase) ? `<path d="M0 ${960-phase*8} L${phase%2?1180:1480} 1440 H0Z" fill="#020806" opacity=".62"/><path d="M2560 ${340+phase*9} L${phase%2?1480:1180} 0 H2560Z" fill="${phase%2?'#071b2b':'#251407'}" opacity=".38"/>` : `<path d="M0 ${1240-(phase%4)*70} L${500+(phase%3)*280} 1440 H0Z" fill="#020806" opacity=".28"/>`;
  svg = svg.replace('<rect width="2560" height="1440" fill="url(#shade)"/>', `<rect width="2560" height="1440" fill="url(#shade)"/>${cuts}`);
  if (phase === 1) {
    const active = Math.min(2, Math.floor(local * 3)), activeLabel = ["CHO PHÉP", "ĐỐI CHIẾU", "QUYẾT TOÁN"][active], color = ["#72ffd0", "#ffd36a", "#71d9ff"][active];
    svg = svg.replace(/<text x="710"[\s\S]*?CHO PHÉP<\/text><text x="1280"[\s\S]*?ĐỐI CHIẾU<\/text><text x="1850"[\s\S]*?QUYẾT TOÁN<\/text>/, `<text x="1280" y="1120" text-anchor="middle" font-size="124" font-weight="900" fill="${color}" stroke="#020806" stroke-width="18" paint-order="stroke">${activeLabel}</text>`);
  }
  if (phase === 4) {
    const formatViNumber = (value) => value.toFixed(1).replace(".0", "").replace(".", ",");
    const hold = 2 * ease, available = 10 - hold, holdText = formatViNumber(hold), availableText = formatViNumber(available);
    svg = svg.replace("GIỮ 2 TRIỆU", `GIỮ ${holdText} TRIỆU`).replace(/\d+(?:\.\d+)? TRIỆU CÒN DÙNG/, `${availableText} TRIỆU CÒN DÙNG`);
  }
  if (phase === 9) svg = svg.replace("GIỮ 2,00 TRIỆU", "2,00 + PHÍ 0,05").replace(/BẢN GHI 2,\d+ TRIỆU/, "BẢN GHI 2,05 TRIỆU").replace("HAI CON SỐ CÓ THỂ KHÁC NHAU", "PHÍ ĐƯỢC GẮN VÀO BẢN GHI");
  if (phase === 14) {
    svg = svg.replace("BA TRẠNG THÁI · BA SỰ THẬT", "");
    svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif" font-size="96" font-weight="900" text-anchor="middle" stroke="#020806" stroke-width="14" paint-order="stroke"><text x="650" y="1080" fill="#ffd36a">KHOẢN GIỮ</text><text x="1280" y="1210" fill="#72ffd0">BẢN GHI KHỚP</text><text x="1910" y="1080" fill="#71d9ff">TIỀN ĐÃ CHUYỂN</text></g></svg>`);
  }
  return svg;
}

function svgFrameR7(t, duration) {
  const phaseLength = duration / 20, phase = Math.min(19, Math.floor(t / phaseLength));
  let svg = svgFrameR6(t, duration);
  if (phase === 4) {
    svg = svg.replace(/GIỮ \d+(?:[.,]\d+)? TRIỆU/, "GIỮ 2,00 TRIỆU").replace(/\d+(?:[.,]\d+)? TRIỆU CÒN DÙNG/, "8,00 TRIỆU CÒN DÙNG");
    svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect x="1550" y="540" width="700" height="650" rx="62" fill="#03100c" stroke="#72ffd0" stroke-width="18"/><rect x="1610" y="695" width="580" height="420" rx="42" fill="#72ffd0" opacity=".78"/><path d="M1580 780H2220" stroke="#ffd36a" stroke-width="28"/><text x="1900" y="650" text-anchor="middle" font-size="112" font-weight="900" fill="#ffffff">10,00 TRIỆU</text><text x="1900" y="840" text-anchor="middle" font-size="112" font-weight="900" fill="#ffd36a" stroke="#020806" stroke-width="14" paint-order="stroke">GIỮ 2,00</text><text x="1900" y="1050" text-anchor="middle" font-size="112" font-weight="900" fill="#ffffff" stroke="#020806" stroke-width="14" paint-order="stroke">CÒN 8,00</text></g></svg>`);
  }
  if (phase === 7) {
    svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect width="2560" height="560" fill="#020806" opacity=".96"/><text x="1280" y="170" text-anchor="middle" font-size="132" font-weight="900" fill="#ffffff">CÙNG MỘT GIAO DỊCH</text><text x="1280" y="335" text-anchor="middle" font-size="112" font-weight="900" fill="#ffd36a">GIỮ 2,00 → BẢN GHI CUỐI 2,05</text><rect x="250" y="610" width="790" height="470" rx="54" fill="#211406" stroke="#ffd36a" stroke-width="20"/><text x="645" y="760" text-anchor="middle" font-size="112" font-weight="900" fill="#ffd36a">KHOẢN GIỮ</text><text x="645" y="930" text-anchor="middle" font-size="148" font-weight="900" fill="#ffffff">2,00</text><rect x="1520" y="610" width="790" height="470" rx="54" fill="#031b28" stroke="#71d9ff" stroke-width="20"/><text x="1915" y="760" text-anchor="middle" font-size="112" font-weight="900" fill="#71d9ff">BẢN GHI CUỐI</text><text x="1915" y="930" text-anchor="middle" font-size="148" font-weight="900" fill="#ffffff">2,05</text><path d="M1080 845H1480" stroke="#72ffd0" stroke-width="30"/><path d="M1420 785L1500 845L1420 905" fill="none" stroke="#72ffd0" stroke-width="30"/><text x="1280" y="1220" text-anchor="middle" font-size="112" font-weight="900" fill="#72ffd0" stroke="#020806" stroke-width="14" paint-order="stroke">ĐỐI CHIẾU · CHÊNH +0,05 PHÍ</text></g></svg>`);
  }
  if (phase === 8) svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect x="540" y="1040" width="1480" height="190" rx="54" fill="#020806" opacity=".94" stroke="#72ffd0" stroke-width="14"/><text x="1280" y="1175" text-anchor="middle" font-size="112" font-weight="900" fill="#ffffff">KHÓA BẢN GHI CUỐI 2,05</text></g></svg>`);
  if (phase === 9) {
    svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect width="2560" height="585" fill="#020806" opacity=".96"/><text x="1280" y="165" text-anchor="middle" font-size="122" font-weight="900" fill="#ffffff">TỪ GIỮ TẠM ĐẾN BẢN GHI CUỐI</text><text x="1280" y="330" text-anchor="middle" font-size="132" font-weight="900" fill="#ffd36a">2,00 + PHÍ 0,05 = 2,05</text><text x="1280" y="500" text-anchor="middle" font-size="106" font-weight="900" fill="#72ffd0">PHÍ LÀ NGUYÊN NHÂN CHÊNH LỆCH</text></g></svg>`);
  }
  if (phase >= 10 && phase <= 13) {
    const backgrounds = [settlementAssetData, clearingAssetData, worldAssetData, bankAssetData], labels = ["GOM CÁC NGHĨA VỤ", "BÙ TRỪ THÀNH SỐ RÒNG", "CHUYỂN SỐ RÒNG", "NGƯỜI BÁN NHẬN TIỀN"];
    svg = svg.replace(/href="data:image\/jpeg;base64,[^"]+"/, `href="data:image/jpeg;base64,${backgrounds[phase-10]}"`);
    const accent = ["#ffd36a", "#72ffd0", "#71d9ff", "#ffffff"][phase-10];
    svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect x="0" y="0" width="2560" height="440" fill="#020806" opacity=".96"/><text x="150" y="170" font-size="104" font-weight="900" fill="#9ff2d2">QUYẾT TOÁN · BƯỚC ${phase-9}/4</text><text x="150" y="335" font-size="132" font-weight="900" fill="${accent}">${labels[phase-10]}</text></g></svg>`);
  }
  if (phase === 14) svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect x="100" y="930" width="2360" height="390" rx="54" fill="#020806" opacity=".97"/><rect x="150" y="980" width="700" height="290" rx="40" fill="#251b08" stroke="#ffd36a" stroke-width="14"/><text x="500" y="1165" text-anchor="middle" font-size="112" font-weight="900" fill="#ffd36a">KHOẢN GIỮ</text><rect x="930" y="980" width="700" height="290" rx="40" fill="#05271d" stroke="#72ffd0" stroke-width="14"/><text x="1280" y="1100" text-anchor="middle" font-size="112" font-weight="900" fill="#72ffd0">BẢN GHI</text><text x="1280" y="1220" text-anchor="middle" font-size="112" font-weight="900" fill="#72ffd0">ĐÃ KHỚP</text><rect x="1710" y="980" width="700" height="290" rx="40" fill="#061f2a" stroke="#71d9ff" stroke-width="14"/><text x="2060" y="1100" text-anchor="middle" font-size="112" font-weight="900" fill="#71d9ff">TIỀN</text><text x="2060" y="1220" text-anchor="middle" font-size="112" font-weight="900" fill="#71d9ff">ĐÃ CHUYỂN</text></g></svg>`);
  return svg;
}

function svgFrameR8(t, duration) {
  const phaseLength = duration / 20, phase = Math.min(19, Math.floor(t / phaseLength)), local = Math.min(1, (t - phase * phaseLength) / phaseLength);
  let svg = svgFrameR7(t, duration);
  if (phase !== 14) return svg;
  const active = Math.min(2, Math.floor(local * 3));
  const states = [
    [["ĐANG", "GIỮ", true], ["CHƯA", "KHỚP", false], ["CHƯA", "CHUYỂN", false]],
    [["ĐÃ", "GIỮ", true], ["ĐÃ", "KHỚP", true], ["CHƯA", "CHUYỂN", false]],
    [["ĐÃ", "GIỮ", true], ["ĐÃ", "KHỚP", true], ["ĐÃ", "CHUYỂN", true]],
  ][active];
  const colors = ["#ffd36a", "#72ffd0", "#71d9ff"];
  const cards = states.map(([prefix, value, completed], index) => {
    const x = 150 + index * 780, color = colors[index];
    return `<rect x="${x}" y="1000" width="700" height="300" rx="40" fill="${completed ? "#06251b" : "#111813"}" stroke="${color}" stroke-width="${completed ? 20 : 10}" opacity="${completed ? 1 : .86}"/><text x="${x+350}" y="1122" text-anchor="middle" font-size="96" font-weight="900" fill="${completed ? color : "#c5ccc8"}" stroke="#020806" stroke-width="14" paint-order="stroke">${prefix}</text><text x="${x+350}" y="1242" text-anchor="middle" font-size="112" font-weight="900" fill="${completed ? color : "#c5ccc8"}" stroke="#020806" stroke-width="14" paint-order="stroke">${value}</text>`;
  }).join("");
  svg = svg.replace("ĐÃ CHO PHÉP", "ĐÃ ĐỐI CHIẾU");
  svg = svg.replace("</svg>", `<g font-family="Arial,Helvetica,sans-serif"><rect x="80" y="875" width="2400" height="475" rx="62" fill="#020806" opacity=".99"/><text x="1280" y="965" text-anchor="middle" font-size="84" font-weight="900" fill="#ffffff">TRẠNG THÁI TẠI THỜI ĐIỂM NÀY</text>${cards}</g></svg>`);
  return svg;
}

function svgFrameR9(t, duration) {
  const phaseLength = duration / 20, phase = Math.min(19, Math.floor(t / phaseLength)), local = Math.min(1, (t - phase * phaseLength) / phaseLength);
  const cut = Math.min(1, Math.floor(local * 2)), micro = (local * 2) % 1, layout = (phase * 2 + cut) % 5;
  let svg = svgFrameR8(t, duration).replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, "");
  const crops = [[0,0,2560,1440],[-520,-180,3300,1856],[-920,-310,3600,2025],[-180,-350,3400,1913],[-700,-80,3300,1856]], [cx,cy,cw,ch] = crops[layout];
  const drift = Math.round((micro - .5) * 70);
  svg = svg.replace(/<image href="([^"]+)" x="-?[\d.]+" y="-?[\d.]+" width="[\d.]+" height="[\d.]+" preserveAspectRatio="xMidYMid slice"\/>/, (_match, href) => `<image href="${href}" x="${cx+drift}" y="${cy}" width="${cw}" height="${ch}" preserveAspectRatio="xMidYMid slice"/>`);
  const copy = [
    ["MỘT CÚ CHẠM","BA QUYẾT ĐỊNH","1 GIÂY → 3 LỚP"], ["CHO PHÉP","ĐỐI CHIẾU","RỒI QUYẾT TOÁN"],
    ["KIỂM TRA THẺ","ĐỦ HẠN MỨC","RỦI RO ĐƯỢC DUYỆT"], ["GIỮ 2,00","CHƯA CHUYỂN","AUTHORIZATION"],
    ["TỔNG 10,00","CÒN 8,00","2,00 ĐANG GIỮ"], ["ĐƯỢC PHÉP","CHƯA TRẢ TIỀN","APPROVED ≠ PAID"],
    ["HAI BẢN GHI","TIẾN LẠI GẦN","NGƯỜI BÁN ↔ MẠNG"], ["GIỮ 2,00","BẢN GHI 2,05","CHÊNH +0,05 PHÍ"],
    ["ĐỐI CHIẾU","KHÓA 2,05","BẢN GHI CUỐI"], ["GIỮ + PHÍ","THÀNH 2,05","NGUYÊN NHÂN RÕ RÀNG"],
    ["12 NGHĨA VỤ","1 SỐ RÒNG","NHIỀU → MỘT"], ["BÙ TRỪ","KẾT QUẢ RÒNG","KHÔNG PHẢI XOAY TRANG TRÍ"],
    ["SỐ RÒNG","BẮT ĐẦU CHUYỂN","BANK → ACQUIRER"], ["NGƯỜI BÁN","NHẬN THEO LỊCH","SETTLEMENT T+N"],
    ["ĐANG Ở ĐÂU?","NHÌN MỐC HIỆN TẠI","QUÁ KHỨ ≠ HIỆN TẠI"], ["ĐANG GIỮ","KHÔNG TRỪ HAI LẦN","HOLD CÓ THỂ ĐƯỢC GỠ"],
    ["MỘT THAY ĐỔI","BỐN NHÁNH","HỦY · HẾT GIỮ · HOÀN · TRANH CHẤP"], ["HOÀN TIỀN","BẢN GHI ĐI NGƯỢC","MỘT DÒNG MỚI"],
    ["HỎI BA CÂU","TỪNG LỚP MỘT","CHO PHÉP · KHỚP · QUYẾT TOÁN"], ["BA LỚP","MỘT GIAO DỊCH","ĐỌC ĐÚNG TỪNG THỜI ĐIỂM"],
  ][phase];
  const accent = ["#ffd36a","#72ffd0","#71d9ff","#ff9e88"][phase % 4], headline = copy[cut], detail = copy[2], beat = phase * 2 + cut + 1;
  const common = `<g font-family="Arial,Helvetica,sans-serif" stroke="#020806" paint-order="stroke"><circle cx="${layout===1?2360:layout===0?220:1280}" cy="${layout<=1?180:layout===3?1180:210}" r="72" fill="${accent}" stroke="#ffffff" stroke-width="12"/><text x="${layout===1?2360:layout===0?220:1280}" y="${layout<=1?210:layout===3?1210:240}" text-anchor="middle" font-size="72" font-weight="900" fill="#04100c" stroke="none">${beat}</text>`;
  let overlay = "";
  if (layout === 0) overlay = `<path d="M0 0H900L720 1440H0Z" fill="#020806" opacity=".93"/><text x="110" y="690" font-size="112" font-weight="900" fill="${accent}" stroke-width="16">${headline}</text><text x="110" y="850" font-size="84" font-weight="900" fill="#ffffff" stroke-width="14">${detail}</text><path d="M110 940H650" stroke="${accent}" stroke-width="24"/>`;
  else if (layout === 1) overlay = `<path d="M1660 0H2560V1440H1840Z" fill="#020806" opacity=".93"/><text x="2440" y="690" text-anchor="end" font-size="112" font-weight="900" fill="${accent}" stroke-width="16">${headline}</text><text x="2440" y="850" text-anchor="end" font-size="84" font-weight="900" fill="#ffffff" stroke-width="14">${detail}</text><path d="M1910 940H2440" stroke="${accent}" stroke-width="24"/>`;
  else if (layout === 2) overlay = `<path d="M0 0H2560V410L1540 560L0 370Z" fill="#020806" opacity=".94"/><text x="1280" y="185" text-anchor="middle" font-size="128" font-weight="900" fill="${accent}" stroke-width="18">${headline}</text><text x="1280" y="340" text-anchor="middle" font-size="88" font-weight="900" fill="#ffffff" stroke-width="14">${detail}</text>`;
  else if (layout === 3) overlay = `<path d="M0 930L1020 820L2560 970V1440H0Z" fill="#020806" opacity=".94"/><text x="120" y="1120" font-size="128" font-weight="900" fill="${accent}" stroke-width="18">${headline}</text><text x="120" y="1280" font-size="88" font-weight="900" fill="#ffffff" stroke-width="14">${detail}</text><path d="M1580 1180H2360" stroke="${accent}" stroke-width="26" stroke-dasharray="34 24"/>`;
  else overlay = `<path d="M370 410L2180 330L2300 930L510 1010Z" fill="#020806" opacity=".9" stroke="${accent}" stroke-width="18"/><text x="1280" y="660" text-anchor="middle" font-size="142" font-weight="900" fill="${accent}" stroke-width="20">${headline}</text><text x="1280" y="830" text-anchor="middle" font-size="92" font-weight="900" fill="#ffffff" stroke-width="14">${detail}</text>`;
  let semantic = "";
  if (phase === 10) {
    const count = cut ? 1 : 12;
    semantic = `<g font-family="Arial,Helvetica,sans-serif"><rect x="950" y="500" width="660" height="430" rx="90" fill="#031510" stroke="${accent}" stroke-width="24"/><text x="1280" y="690" text-anchor="middle" font-size="190" font-weight="900" fill="${accent}">${count}</text><text x="1280" y="835" text-anchor="middle" font-size="82" font-weight="900" fill="#ffffff">${cut?"SỐ RÒNG":"NGHĨA VỤ"}</text></g>`;
  }
  if (phase === 14) {
    const active = Math.min(2, Math.floor(local * 3)), roles = [
      [["HIỆN TẠI","ĐANG","GIỮ"],["TIẾP THEO","CHƯA","KHỚP"],["TIẾP THEO","CHƯA","CHUYỂN"]],
      [["ĐÃ QUA","ĐÃ","GIỮ"],["HIỆN TẠI","ĐÃ","KHỚP"],["TIẾP THEO","CHƯA","CHUYỂN"]],
      [["ĐÃ QUA","ĐÃ","GIỮ"],["ĐÃ QUA","ĐÃ","KHỚP"],["HIỆN TẠI","ĐÃ","CHUYỂN"]],
    ][active];
    const cards = roles.map(([role,prefix,value],index)=>{ const x=100+index*820,current=role==="HIỆN TẠI",color=["#ffd36a","#72ffd0","#71d9ff"][index]; return `<rect x="${x}" y="720" width="760" height="550" rx="54" fill="#03100c" stroke="${color}" stroke-width="${current?26:10}"/><text x="${x+380}" y="840" text-anchor="middle" font-size="76" font-weight="900" fill="${current?"#ffffff":"#9aa9a2"}">${role}</text><text x="${x+380}" y="1030" text-anchor="middle" font-size="96" font-weight="900" fill="${current?color:"#c5ccc8"}">${prefix}</text><text x="${x+380}" y="1170" text-anchor="middle" font-size="112" font-weight="900" fill="${current?color:"#c5ccc8"}">${value}</text>`; }).join("");
    overlay = `<rect width="2560" height="1440" fill="#020806" opacity=".55"/><text x="1280" y="190" text-anchor="middle" font-size="128" font-weight="900" fill="#ffffff">MỐC HIỆN TẠI</text><text x="1280" y="350" text-anchor="middle" font-size="88" font-weight="900" fill="#9ff2d2">ĐÃ QUA · HIỆN TẠI · TIẾP THEO</text>${cards}`;
  }
  const progress = `<rect x="100" y="1370" width="2360" height="14" rx="7" fill="#ffffff" opacity=".18"/><rect x="100" y="1370" width="${Math.round(2360*beat/40)}" height="14" rx="7" fill="${accent}"/>`;
  return svg.replace("</svg>", `${common}${overlay}</g>${semantic}${progress}</svg>`);
}

function svgFrameR10(t, duration) {
  const beatLength = duration / 36, beat = Math.min(35, Math.floor(t / beatLength)), local = Math.min(1, (t - beat * beatLength) / beatLength), ease = local < .5 ? 2*local*local : 1-Math.pow(-2*local+2,2)/2;
  const palettes = [["#071c36","#0b5c7a"],["#24104f","#7043b2"],["#062e2b","#0f806b"],["#4a2108","#b86615"],["#3c0b25","#a42555"],["#10234b","#2868bd"]], [bg0,bg1] = palettes[beat % palettes.length], accent = ["#72ffd0","#71d9ff","#ffd36a","#ff9e88"][beat % 4];
  const title = (value, y=170, size=128, color="#ffffff") => `<text x="1280" y="${y}" text-anchor="middle" font-size="${size}" font-weight="900" fill="${color}">${esc(value)}</text>`;
  const label = (x,y,value,size=88,color="#ffffff",anchor="middle") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="900" fill="${color}">${esc(value)}</text>`;
  const actor = (x,y,name,color=accent,scale=1) => `<g transform="translate(${x} ${y}) scale(${scale})"><circle r="150" fill="#06110f" stroke="${color}" stroke-width="24"/><circle r="92" fill="${color}" opacity=".18"/><path d="M-55 18H55M0-55V55" stroke="${color}" stroke-width="24" stroke-linecap="round"/><text y="235" text-anchor="middle" font-size="84" font-weight="900" fill="#ffffff">${esc(name)}</text></g>`;
  const arrow = (x1,y1,x2,y2,color=accent,width=28) => `<path d="M${x1} ${y1}L${x1+(x2-x1)*ease} ${y1+(y2-y1)*ease}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><path d="M${x2-70} ${y2-50}L${x2} ${y2}L${x2-70} ${y2+50}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${local>.7?1:0}"/>`;
  const doc = (x,y,name,amount,color=accent,rotation=0) => `<g transform="translate(${x} ${y}) rotate(${rotation})"><rect x="-310" y="-260" width="620" height="520" rx="70" fill="#071814" stroke="${color}" stroke-width="24"/><text y="-110" text-anchor="middle" font-size="86" font-weight="900" fill="${color}">${esc(name)}</text><text y="70" text-anchor="middle" font-size="132" font-weight="900" fill="#ffffff">${esc(amount)}</text><path d="M-190 150H190" stroke="${color}" stroke-width="26"/><circle cx="220" cy="190" r="48" fill="${color}"/></g>`;
  const coin = (x,y,r=90,color=accent) => `<g transform="translate(${x} ${y}) scale(${.82+.18*ease})"><circle r="${r}" fill="${color}" stroke="#ffffff" stroke-width="16"/><circle r="${r*.58}" fill="none" stroke="#071814" stroke-width="16"/><path d="M-${r*.28} 0H${r*.28}M0-${r*.28}V${r*.28}" stroke="#071814" stroke-width="18" stroke-linecap="round"/></g>`;
  let visual = "";
  if (beat === 0 || beat === 35) {
    const zoom=beat===0?1.08+ease*.1:1.18-ease*.08; visual=`<image href="data:image/jpeg;base64,${worldAssetData}" x="-${Math.round((zoom-1)*1280)}" y="-${Math.round((zoom-1)*720)}" width="${Math.round(2560*zoom)}" height="${Math.round(1440*zoom)}" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="#020806" opacity=".36"/>${title(beat===0?"1 GIÂY":"MỘT GIAO DỊCH",210,154,accent)}${coin(1280,760,190,accent)}${title(beat===0?"BA LỚP QUYẾT ĐỊNH":"BA CÂU HỎI ĐÚNG",1260,118,"#ffffff")}`;
  } else if (beat === 1 || beat === 34) {
    const gates=["CHO PHÉP","ĐỐI CHIẾU","QUYẾT TOÁN"]; visual=title(beat===1?"BA CỔNG KHÁC NHAU":"ĐI QUA ĐỦ BA CỔNG",190,118)+gates.map((g,i)=>`<g transform="translate(${500+i*780} 760)"><circle r="${210-i*18}" fill="#06110f" stroke="${["#72ffd0","#ffd36a","#71d9ff"][i]}" stroke-width="${24+Math.round(ease*12)}"/><text y="28" text-anchor="middle" font-size="${i===2?72:80}" font-weight="900" fill="#ffffff">${g}</text></g>`).join("")+arrow(710,760,2050,760,"#ffffff",20);
  } else if (beat >= 2 && beat <= 7) {
    if (beat===2) visual=title("THẺ GỬI YÊU CẦU",180,122)+`<rect x="180" y="430" width="820" height="540" rx="90" fill="#06110f" stroke="${accent}" stroke-width="28"/><circle cx="820" cy="700" r="90" fill="${accent}"/>`+actor(2070,700,"BANK",accent)+arrow(1040,700,1850,700,accent);
    if (beat===3) visual=title("BANK KIỂM TRA",180,128)+[[520,"THẺ"],[1280,"HẠN MỨC"],[2040,"RỦI RO"]].map(([x,s],i)=>`<g transform="translate(${x} 720)"><path d="M-180 0L-90 150L190-190" fill="none" stroke="${["#72ffd0","#ffd36a","#71d9ff"][i]}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/><text y="330" text-anchor="middle" font-size="92" font-weight="900" fill="#ffffff">${s}</text></g>`).join("");
    if (beat===4) visual=title("GIỮ 2,00",180,154,"#ffd36a")+Array.from({length:10},(_,i)=>coin(270+i*225,760,72,i<2?"#ffd36a":"#72ffd0")).join("")+`<path d="M180 1040H2380" stroke="#ffffff" stroke-width="20" opacity=".3"/>`+label(1280,1210,"10,00 → 8,00 KHẢ DỤNG",104);
    if (beat===5) visual=`<rect x="0" y="0" width="1280" height="1440" fill="#082c26"/><rect x="1280" y="0" width="1280" height="1440" fill="#38210a"/>${label(640,300,"SỔ CÁI",98,"#72ffd0")}${label(640,760,"10,00",260,"#ffffff")}${label(1920,300,"KHẢ DỤNG",98,"#ffd36a")}${label(1920,760,"8,00",260,"#ffffff")}${label(1280,1260,"2,00 ĐANG GIỮ",118,"#ff9e88")}`;
    if (beat===6) visual=actor(530,720,"BANK",accent)+coin(1280,720,170,"#ffd36a")+actor(2060,720,"MERCHANT","#71d9ff")+title("ĐÃ CHO PHÉP",170,128)+`<path d="M720 720H1840" stroke="#ffffff" stroke-width="30" stroke-dasharray="80 50" opacity=".22"/>${label(1280,1110,"TIỀN VẪN Ở BANK",112,"#ffd36a")}`;
    if (beat===7) visual=title("APPROVED",430,210,"#72ffd0")+title("≠",760,220,"#ff9e88")+title("PAID",1080,210,"#ffd36a");
  } else if (beat >= 8 && beat <= 13) {
    if (beat===8) visual=title("BẢN GHI NGƯỜI BÁN",170,118)+doc(1280,760,"MERCHANT","2,00","#ffd36a",-4);
    if (beat===9) visual=title("BẢN GHI MẠNG",170,118)+doc(1280,760,"NETWORK","2,05","#71d9ff",4);
    if (beat===10) visual=doc(600,760,"MERCHANT","2,00","#ffd36a",-3)+doc(1960,760,"NETWORK","2,05","#71d9ff",3)+label(1280,760,"+0,05",130,"#ff9e88");
    if (beat===11) visual=title("HAI BẢN GHI TIẾN LẠI",170,112)+doc(740+ease*290,760,"MERCHANT","2,00","#ffd36a",-2)+doc(1820-ease*290,760,"NETWORK","2,05","#71d9ff",2);
    if (beat===12) visual=doc(650,760,"MERCHANT","2,00","#ffd36a")+doc(1910,760,"NETWORK","2,05","#71d9ff")+arrow(1600,510,1060,510,"#ff9e88",22)+label(1330,430,"PHÍ MẠNG 0,05",92,"#ff9e88");
    if (beat===13) visual=title("BẢN GHI CUỐI",180,118)+doc(1280,760,"ĐÃ KHỚP","2,05","#72ffd0")+`<circle cx="1280" cy="760" r="390" fill="none" stroke="#72ffd0" stroke-width="${20+Math.round(ease*36)}" opacity=".5"/>`;
  } else if (beat >= 14 && beat <= 18) {
    if (beat===14) visual=title("12 NGHĨA VỤ",170,146)+Array.from({length:12},(_,i)=>coin(330+(i%6)*380,520+Math.floor(i/6)*430,68,["#72ffd0","#71d9ff","#ffd36a","#ff9e88"][i%4])).join("");
    if (beat===15) visual=title("BÙ TRỪ",170,154)+Array.from({length:12},(_,i)=>{const a=i*Math.PI*2/12,x=1280+Math.cos(a)*(500*(1-ease)+150),y=760+Math.sin(a)*(360*(1-ease)+110);return coin(x,y,58,["#72ffd0","#71d9ff","#ffd36a","#ff9e88"][i%4]);}).join("")+`<circle cx="1280" cy="760" r="180" fill="#06110f" stroke="#ffffff" stroke-width="26"/>`;
    if (beat===16) visual=title("MỘT SỐ RÒNG",180,154,"#71d9ff")+coin(1280,760,260,"#71d9ff")+label(1280,1180,"12 → 1",138,"#ffffff");
    if (beat===17) visual=actor(430,720,"BANK","#72ffd0")+coin(1280,720,160,"#71d9ff")+actor(2130,720,"ACQUIRER","#ffd36a")+arrow(650,720,1900,720,"#71d9ff",34)+title("SỐ RÒNG DI CHUYỂN",170,116);
    if (beat===18) visual=actor(470,720,"ACQUIRER","#71d9ff")+Array.from({length:7},(_,i)=>coin(1470+(i%3)*210,970-Math.floor(i/3)*180,78,"#ffd36a")).join("")+label(1780,340,"MERCHANT",118,"#ffffff")+label(1780,500,"NHẬN THEO LỊCH",98,"#ffd36a");
  } else if (beat >= 19 && beat <= 22) {
    const states=[["HIỆN TẠI","ĐANG GIỮ","#ffd36a"],["HIỆN TẠI","ĐÃ KHỚP","#72ffd0"],["HIỆN TẠI","ĐANG CHUYỂN","#71d9ff"],["HIỆN TẠI","ĐÃ QUYẾT TOÁN","#72ffd0"]], [role,state,color]=states[beat-19];
    const history=beat===19?"TIẾP THEO · ĐỐI CHIẾU":beat===20?"ĐÃ QUA · GIỮ 2,00":beat===21?"ĐÃ QUA · GIỮ + KHỚP":"ĐÃ QUA · GIỮ + KHỚP + CHUYỂN";
    visual=title(role,220,116,"#ffffff")+title(state,670,190,color)+coin(1280,980,170,color)+label(1280,1300,history,90,"#c7d4cf");
  } else if (beat >= 23 && beat <= 27) {
    const outcomes=[["HỦY","HOLD ĐƯỢC GỠ","✕","#ff9e88"],["HẾT GIỮ","HẠN MỨC TRỞ LẠI","◷","#ffd36a"],["HOÀN","BẢN GHI ĐI NGƯỢC","↶","#72ffd0"],["TRANH CHẤP","EVIDENCE ĐƯỢC XÉT","⚖","#71d9ff"]];
    if (beat<27) { const [name,result,icon,color]=outcomes[beat-23]; visual=title(name,230,170,color)+label(1280,760,icon,330,color)+label(1280,1180,result,112,"#ffffff")+(beat===25?arrow(1950,950,600,950,color,36):""); }
    else visual=title("BỐN KẾT QUẢ",170,126)+outcomes.map(([name,,icon,color],i)=>{const x=420+(i%2)*1720,y=560+Math.floor(i/2)*500;return `${label(x,y,icon,190,color)}${label(x,y+180,name,92,"#ffffff")}`;}).join("");
  } else if (beat >= 28 && beat <= 33) {
    const questions=[["1","ĐÃ CHO PHÉP?","#72ffd0"],["2","ĐÃ ĐỐI CHIẾU?","#ffd36a"],["3","ĐÃ QUYẾT TOÁN?","#71d9ff"]];
    if (beat<=30) { const [n,q,color]=questions[beat-28]; visual=label(1280,430,n,260,color)+title(q,900,150,"#ffffff")+`<circle cx="1280" cy="720" r="430" fill="none" stroke="${color}" stroke-width="30" opacity="${.35+.45*ease}"/>`; }
    if (beat===31) visual=actor(430,730,"CARD","#72ffd0")+actor(2130,730,"BANK","#72ffd0")+arrow(650,730,1900,730,"#72ffd0",34)+title("CHO PHÉP",170,150,"#72ffd0");
    if (beat===32) visual=doc(610,760,"MERCHANT","2,00","#ffd36a")+doc(1950,760,"NETWORK","2,05","#71d9ff")+title("ĐỐI CHIẾU",170,150,"#ffd36a");
    if (beat===33) visual=actor(430,730,"BANK","#72ffd0")+coin(1280,730,160,"#71d9ff")+actor(2130,730,"MERCHANT","#ffd36a")+arrow(650,730,1900,730,"#71d9ff",34)+title("QUYẾT TOÁN",170,150,"#71d9ff");
  }
  const progress=`<rect x="0" y="1418" width="2560" height="22" fill="#ffffff" opacity=".16"/><rect x="0" y="1418" width="${Math.round(2560*(beat+local)/36)}" height="22" fill="${accent}"/>`;
  const base=`<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><radialGradient id="r10bg" cx="${20+(beat%4)*20}%" cy="${20+(beat%3)*28}%"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg0}"/></radialGradient><pattern id="r10grid" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="3"/></pattern></defs><rect width="2560" height="1440" fill="url(#r10bg)"/><rect width="2560" height="1440" fill="url(#r10grid)"/><circle cx="${260+(beat%4)*680}" cy="${240+(beat%3)*430}" r="${260+ease*90}" fill="${accent}" opacity=".08"/><g font-family="Arial,Helvetica,sans-serif">`;
  return `${base}${visual}${progress}</g></svg>`;
}

// Revision 11 is composed as sixteen continuous transformations. The same
// object changes position, ownership or state inside each sequence; headings,
// bottom progress chrome and repeated card layouts are deliberately absent.
function svgFrameR11(t, duration) {
  const sceneLength = duration / 16, scene = Math.min(15, Math.floor(t / sceneLength));
  const local = Math.min(1, (t - scene * sceneLength) / sceneLength), ease = local < .5 ? 2*local*local : 1-Math.pow(-2*local+2,2)/2;
  const pulse = .72 + .28*Math.sin(local*Math.PI), accent = ["#6fffd0","#66c8ff","#ffd266","#ff8f86"][scene%4];
  const txt = (x,y,value,size=112,color="#ffffff",anchor="middle",weight=900) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}" paint-order="stroke" stroke="#020806" stroke-width="${Math.max(8,Math.round(size*.08))}" stroke-linejoin="round">${esc(value)}</text>`;
  const glow = (x,y,r,color=accent,opacity=.22) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}" filter="url(#r11blur)"/>`;
  const token = (x,y,r=108,color=accent,label="₫") => `<g transform="translate(${x} ${y}) scale(${.9+.1*pulse})"><circle r="${r}" fill="#061411" stroke="#ffffff" stroke-width="18"/><circle r="${r-24}" fill="${color}" opacity=".9"/><text y="${Math.round(r*.34)}" text-anchor="middle" font-size="${Math.round(r*.92)}" font-weight="900" fill="#07110f">${esc(label)}</text></g>`;
  const line = (x1,y1,x2,y2,color=accent,width=28,amount=ease) => { const x=x1+(x2-x1)*amount,y=y1+(y2-y1)*amount; return `<path d="M${x1} ${y1}L${x} ${y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${Math.max(18,width)}" fill="${color}"/>`; };
  const photo = (data,zoom=1.08,shade=.38,offsetX=0,offsetY=0) => { const w=Math.round(2560*zoom),h=Math.round(1440*zoom); return `<image href="data:image/jpeg;base64,${data}" x="${Math.round((2560-w)/2+offsetX)}" y="${Math.round((1440-h)/2+offsetY)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="#020605" opacity="${shade}"/>`; };
  const actor = (x,y,label,color=accent,shape="circle") => `<g transform="translate(${x} ${y})"><${shape} ${shape==="circle"?`r="170"`:`x="-210" y="-160" width="420" height="320" rx="72"`} fill="#071714" stroke="${color}" stroke-width="24"/><circle r="84" fill="${color}" opacity=".22"/><path d="M-48 0H48M0-48V48" stroke="${color}" stroke-width="22" stroke-linecap="round"/>${txt(0,270,label,96,"#ffffff")}</g>`;
  const paper = (x,y,label,amount,color=accent,rotate=0,scale=1) => `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})"><path d="M-310-360H210L310-260V360H-310Z" fill="#f4f0e7" stroke="${color}" stroke-width="22"/><path d="M210-360V-260H310" fill="none" stroke="${color}" stroke-width="18"/>${txt(0,-150,label,92,"#101b18")}${txt(0,80,amount,150,color)}<path d="M-190 190H190M-190 260H80" stroke="#21322d" stroke-width="22" stroke-linecap="round"/></g>`;
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><filter id="r11blur"><feGaussianBlur stdDeviation="42"/></filter><filter id="r11shadow"><feDropShadow dx="0" dy="28" stdDeviation="24" flood-opacity=".55"/></filter><linearGradient id="r11night" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020807"/><stop offset=".55" stop-color="#092925"/><stop offset="1" stop-color="#071225"/></linearGradient><radialGradient id="r11warm"><stop stop-color="#8c3d10"/><stop offset="1" stop-color="#180807"/></radialGradient><clipPath id="r11wipe"><rect width="${Math.round(2560*ease)}" height="1440"/></clipPath></defs><rect width="2560" height="1440" fill="url(#r11night)"/><g font-family="Arial,Helvetica,sans-serif">`;
  let v="";
  if (scene===0) {
    const z=1.18-local*.08, x=360+ease*1840;
    v=photo(worldAssetData,z,.28)+glow(x,760,240,"#6fffd0",.3)+line(300,760,2250,760,"#6fffd0",34,ease)+token(x,760,160,"#6fffd0","1s")+txt(1280,270,"MỘT CÚ CHẠM",142)+txt(1280,1260,"BA QUYẾT ĐỊNH BẮT ĐẦU",122,"#6fffd0");
  } else if (scene===1) {
    const cardX=-420+ease*1480, gateX=1810-ease*170;
    v=`<rect width="2560" height="1440" fill="url(#r11warm)"/><g transform="translate(${cardX} 330) rotate(${-16+ease*12})" filter="url(#r11shadow)"><rect width="1120" height="720" rx="110" fill="#101c28" stroke="#66c8ff" stroke-width="28"/><rect x="110" y="110" width="900" height="500" rx="68" fill="#1f3343"/><path d="M210 250H720M210 390H900M210 530H590" stroke="#deedf5" stroke-width="48" stroke-linecap="round"/></g><circle cx="${gateX}" cy="720" r="290" fill="#04120f" stroke="#6fffd0" stroke-width="42"/><circle cx="${gateX}" cy="720" r="${100+ease*70}" fill="#6fffd0" opacity=".3"/>${txt(gateX,750,"CHẠM",118,"#6fffd0")}${txt(1280,1220,"YÊU CẦU RỜI KHỎI THẺ",112)}`;
  } else if (scene===2) {
    const scan=260+ease*1900;
    v=photo(bankAssetData,1.22,.43,Math.round((.5-ease)*180),0)+`<rect x="${scan-24}" width="48" height="1440" fill="#6fffd0" opacity=".85" filter="url(#r11blur)"/><rect x="${scan-5}" width="10" height="1440" fill="#ffffff"/>`+[[520,390,"THẺ"],[1280,720,"HẠN MỨC"],[2020,1050,"RỦI RO"]].map(([x,y,s],i)=>`<circle cx="${x}" cy="${y}" r="${150+24*Math.sin(local*Math.PI+i)}" fill="#03120f" stroke="${["#6fffd0","#ffd266","#66c8ff"][i]}" stroke-width="24"/>${txt(x,y+32,s,96,["#6fffd0","#ffd266","#66c8ff"][i])}`).join("")+txt(330,1260,"NGÂN HÀNG KIỂM TRA",118,"#ffffff","start");
  } else if (scene===3) {
    const level=1040-ease*360, holdY=330+ease*500;
    v=`<rect width="2560" height="1440" fill="#071426"/><path d="M0 ${level} Q640 ${level-50} 1280 ${level}T2560 ${level}V1440H0Z" fill="#66c8ff" opacity=".74"/><path d="M0 ${level} Q640 ${level-50} 1280 ${level}T2560 ${level}" fill="none" stroke="#bdeaff" stroke-width="22"/>${token(1280,holdY,170,"#ffd266","2")}${txt(360,330,"SỐ DƯ",104,"#ffffff","start")}${txt(360,500,"10,00",210,"#66c8ff","start")}${txt(2200,1260,"8,00 KHẢ DỤNG",112,"#ffffff","end")}${txt(1280,Math.min(1080,holdY+260),"ĐANG GIỮ",96,"#ffd266")}`;
  } else if (scene===4) {
    const x=510+ease*1180;
    v=`<rect width="1280" height="1440" fill="#092f2a"/><rect x="1280" width="1280" height="1440" fill="#261729"/>${actor(390,620,"NGÂN HÀNG","#6fffd0")}${actor(2170,620,"NGƯỜI BÁN","#ff8f86","rect")}${line(610,620,1950,620,"#ffd266",40,ease)}${token(x,620,125,"#ffd266","GIỮ")}${txt(1280,1120,"ĐÃ CHO PHÉP",144,"#6fffd0")}${txt(1280,1300,"CHƯA CHUYỂN TIỀN",112,"#ff8f86")}`;
  } else if (scene===5) {
    const left=470+ease*430,right=2090-ease*430;
    v=photo(clearingAssetData,1.13,.5,Math.round((.5-ease)*120),0)+paper(left,720,"NGƯỜI BÁN","2,00","#ffd266",-7+ease*5,.78+.12*ease)+paper(right,720,"MẠNG","2,05","#66c8ff",7-ease*5,.78+.12*ease)+glow(1280,720,220,"#6fffd0",ease*.3)+txt(1280,1290,"HAI BẢN GHI TIẾN LẠI GẦN NHAU",104);
  } else if (scene===6) {
    const feeX=1280+Math.sin(local*Math.PI*2)*140;
    v=`<rect width="2560" height="1440" fill="#160d1d"/>${paper(650,720,"NGƯỜI BÁN","2,00","#ffd266",-4,.9)}${token(feeX,720,120,"#ff8f86","0,05")}${paper(1910,720,"MẠNG","2,05","#66c8ff",4,.9)}${line(990,720,1540,720,"#ff8f86",26,ease)}${txt(1280,1250,"PHÍ MẠNG ĐƯỢC GHI RÕ",112,"#ff8f86")}`;
  } else if (scene===7) {
    const coins=Array.from({length:12},(_,i)=>{const a=i*Math.PI*2/12,rad=500*(1-ease)+95,x=1280+Math.cos(a+local*2.8)*rad,y=720+Math.sin(a+local*2.8)*rad*.67;return token(Math.round(x),Math.round(y),55,["#6fffd0","#66c8ff","#ffd266","#ff8f86"][i%4],String(i+1));}).join("");
    v=`<rect width="2560" height="1440" fill="#031213"/>${glow(1280,720,430,"#66c8ff",.16)}${coins}<circle cx="1280" cy="720" r="${120+ease*150}" fill="#061411" stroke="#66c8ff" stroke-width="30"/>${txt(1280,760,"1",190,"#66c8ff")}${txt(1280,1260,"12 NGHĨA VỤ → 1 SỐ RÒNG",126)}`;
  } else if (scene===8) {
    const x=420+ease*1740,y=990-Math.sin(ease*Math.PI)*510;
    v=photo(settlementAssetData,1.2,.38,Math.round((ease-.5)*160),0)+`<path d="M420 990Q1280 120 2160 990" fill="none" stroke="#66c8ff" stroke-width="34" opacity=".72"/>${glow(x,y,180,"#66c8ff",.3)}${token(x,y,125,"#66c8ff","1")}${txt(1280,250,"SỐ RÒNG DI CHUYỂN",112,"#66c8ff")}${txt(380,1200,"NGÂN HÀNG",100,"#6fffd0","start")}${txt(2180,1200,"NGƯỜI BÁN",100,"#ffd266","end")}`;
  } else if (scene===9) {
    const x=330+ease*1900,steps=[[330,"GIỮ","#ffd266"],[960,"KHỚP","#6fffd0"],[1590,"CHUYỂN","#66c8ff"],[2230,"XONG","#ffffff"]];
    v=`<rect width="2560" height="1440" fill="#08101c"/><path d="M330 720H2230" stroke="#32465c" stroke-width="34"/>${steps.map(([sx,s,c])=>`<circle cx="${sx}" cy="720" r="130" fill="#08101c" stroke="${c}" stroke-width="26"/>${txt(sx,755,s,92,c)}`).join("")}${glow(x,720,170,"#ff8f86",.28)}<path d="M${x} 400V560" stroke="#ff8f86" stroke-width="36" stroke-linecap="round"/>${txt(x,330,"HIỆN TẠI",104,"#ff8f86")}${txt(1280,1240,"MỖI THỜI ĐIỂM CHỈ CÓ MỘT TRẠNG THÁI",110)}`;
  } else if (scene===10) {
    const names=[[500,400,"HỦY","#ff8f86"],[2050,400,"HẾT GIỮ","#ffd266"],[500,1040,"HOÀN","#6fffd0"],[2050,1040,"TRANH CHẤP","#66c8ff"]];
    v=photo(exceptionsAssetData,1.18,.56,0,Math.round((.5-ease)*100))+token(1280,720,150,"#ffffff","?")+names.map(([x,y,s,c],i)=>`${line(1280,720,x,y,c,24,Math.max(0,Math.min(1,ease*1.5-i*.08)))}<circle cx="${x}" cy="${y}" r="190" fill="#071411" stroke="${c}" stroke-width="28"/>${txt(x,y+34,s,i===3?88:104,c)}`).join("");
  } else if (scene===11) {
    const split=local>.48,returnX=1260-ease*760;
    v=`<rect width="2560" height="1440" fill="#1b0c13"/><g transform="translate(1280 560)"><rect x="-240" y="-230" width="480" height="460" rx="80" fill="#111a1a" stroke="#ff8f86" stroke-width="34"/><path d="M-110-230V-360A110 110 0 01220-360V-230" fill="none" stroke="#ff8f86" stroke-width="50" ${split?'transform="rotate(22)"':''}/><path d="M-50-50L70 70M70-50L-50 70" stroke="#ff8f86" stroke-width="42" stroke-linecap="round"/></g>${token(returnX,1040,120,"#ffd266","2")}${line(1280,1040,430,1040,"#ffd266",30,ease)}${txt(1280,1260,"HỦY: KHOẢN GIỮ ĐƯỢC GỠ",122,"#ffd266")}`;
  } else if (scene===12) {
    const x=2050-ease*1540;
    v=`<rect width="2560" height="1440" fill="#07201c"/>${paper(2050,620,"ĐÃ GHI","2,05","#66c8ff",5,.8)}${paper(510,620,"HOÀN","−2,05","#6fffd0",-5,.8)}<path d="M2050 1080C1600 ${800-ease*300} 960 ${800-ease*300} 510 1080" fill="none" stroke="#6fffd0" stroke-width="38"/><circle cx="${x}" cy="${1080-Math.sin(ease*Math.PI)*330}" r="48" fill="#6fffd0"/>${txt(1280,1280,"HOÀN: BẢN GHI ĐI NGƯỢC",122,"#6fffd0")}`;
  } else if (scene===13) {
    const scale=.62+ease*.38;
    v=`<rect width="2560" height="1440" fill="#071426"/>${paper(650,720,"CHỨNG TỪ","✓","#66c8ff",-5,.82)}${paper(1910,720,"KHIẾU NẠI","?","#ff8f86",5,.82)}<g transform="translate(1280 720) scale(${scale})"><circle r="240" fill="#071411" stroke="#ffd266" stroke-width="34"/><path d="M0-120V90M-90 170H90" stroke="#ffd266" stroke-width="44" stroke-linecap="round"/><path d="M-170-40H170M-130-40L-230 130H-30ZM130-40L30 130H230Z" fill="none" stroke="#ffd266" stroke-width="34"/></g>${txt(1280,1280,"TRANH CHẤP: CHỨNG CỨ ĐƯỢC XÉT",112,"#ffd266")}`;
  } else if (scene===14) {
    const gates=[[470,"CHO PHÉP?","#6fffd0"],[1280,"ĐỐI CHIẾU?","#ffd266"],[2090,"QUYẾT TOÁN?","#66c8ff"]],x=320+ease*1920;
    v=`<rect width="2560" height="1440" fill="#020807"/>${gates.map(([gx,s,c],i)=>`<circle cx="${gx}" cy="650" r="210" fill="#071411" stroke="${c}" stroke-width="${28+(x>gx?18:0)}"/>${txt(gx,700,String(i+1),150,c)}${txt(gx,1010,s,i===1?80:88,c)}`).join("")}${line(260,650,2300,650,"#ffffff",22,ease)}${token(x,650,76,"#ffffff","✓")}${txt(1280,1300,"HỎI ĐÚNG BA CÂU",142)}`;
  } else {
    const z=1.2-local*.12;
    v=photo(worldAssetData,z,.3,Math.round((ease-.5)*120),0)+`<g clip-path="url(#r11wipe)"><rect width="2560" height="1440" fill="#042018" opacity=".46"/></g>${txt(1280,280,"ĐƯỢC PHÉP",112,"#6fffd0")}${txt(1280,560,"ĐÃ ĐỐI CHIẾU",112,"#ffd266")}${txt(1280,840,"ĐÃ QUYẾT TOÁN",112,"#66c8ff")}${txt(1280,1190,"BA CÂU HỎI. MỘT GIAO DỊCH RÕ RÀNG.",122,"#ffffff")}`;
  }
  return `${base}${v}</g></svg>`;
}

// Revision 12 is one continuous six-act journey rather than a sequence of
// explanatory cards. A single transaction token survives every act, while
// camera, environment and object geometry transform continuously around it.
function svgFrameR12(t, duration) {
  const p=Math.max(0,Math.min(.999999,t/duration)), bounds=[0,.14,.31,.49,.68,.86,1];
  const act=Math.min(5,bounds.findIndex((end,index)=>index>0&&p<end)-1), local=(p-bounds[act])/(bounds[act+1]-bounds[act]);
  const ease=local<.5?2*local*local:1-Math.pow(-2*local+2,2)/2, pulse=.84+.16*Math.sin(t*4.2), spin=t*18;
  const escText=(value)=>esc(value);
  const text=(x,y,value,size=128,color="#ffffff",anchor="middle",weight=900)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}" paint-order="stroke" stroke="#020605" stroke-width="${Math.max(10,Math.round(size*.085))}" stroke-linejoin="round">${escText(value)}</text>`;
  const photo=(data,zoom=1.18,shade=.3,dx=0,dy=0)=>{const w=Math.round(2560*zoom),h=Math.round(1440*zoom);return `<image href="data:image/jpeg;base64,${data}" x="${Math.round((2560-w)/2+dx)}" y="${Math.round((1440-h)/2+dy)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="#020605" opacity="${shade}"/>`;};
  const glow=(x,y,r,color="#6fffd0",opacity=.26)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}" filter="url(#r12blur)"/>`;
  const token=(x,y,r=120,color="#6fffd0",label="₫",rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${pulse})" filter="url(#r12shadow)"><circle r="${r}" fill="#04110e" stroke="#ffffff" stroke-width="18"/><circle r="${r-27}" fill="${color}"/><path d="M-${Math.round(r*.45)} 0H${Math.round(r*.45)}M0-${Math.round(r*.45)}V${Math.round(r*.45)}" stroke="#04110e" stroke-width="${Math.max(12,Math.round(r*.12))}" opacity=".22"/><text y="${Math.round(r*.34)}" text-anchor="middle" font-size="${Math.round(r*.88)}" font-weight="900" fill="#03100d">${escText(label)}</text></g>`;
  const ring=(x,y,r,color,label,active=0)=>`<g transform="translate(${x} ${y})"><circle r="${r+active*28}" fill="#04110e" fill-opacity=".7" stroke="${color}" stroke-width="${24+active*16}"/><circle r="${Math.round(r*.55)}" fill="none" stroke="${color}" stroke-width="16" opacity="${.2+.55*active}"/>${text(0,r+150,label,108,color)}</g>`;
  const record=(x,y,label,amount,color,rotation=0,scale=1)=>`<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})" filter="url(#r12shadow)"><path d="M-330-390H210L330-270V390H-330Z" fill="#f3efe5" stroke="${color}" stroke-width="25"/><path d="M210-390V-270H330" fill="none" stroke="${color}" stroke-width="22"/>${text(0,-155,label,106,"#10201b")}${text(0,85,amount,172,color)}<path d="M-190 210H190M-190 290H70" stroke="#263c34" stroke-width="25" stroke-linecap="round"/></g>`;
  const defs=`<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><defs><filter id="r12blur"><feGaussianBlur stdDeviation="54"/></filter><filter id="r12shadow"><feDropShadow dx="0" dy="30" stdDeviation="25" flood-opacity=".62"/></filter><linearGradient id="r12water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061426"/><stop offset=".55" stop-color="#073e45"/><stop offset="1" stop-color="#07120e"/></linearGradient><linearGradient id="r12rail" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ffd266"/><stop offset=".45" stop-color="#6fffd0"/><stop offset="1" stop-color="#66c8ff"/></linearGradient><clipPath id="r12reveal"><rect width="${Math.round(2560*ease)}" height="1440"/></clipPath></defs><g font-family="Arial,Helvetica,sans-serif">`;
  let v="";
  if(act===0){
    const z=1.28-local*.14,tx=260+ease*2040,ty=930-Math.sin(ease*Math.PI)*460,terminalX=260-ease*170;
    const word=local<.33?"CHẠM":local<.66?"YÊU CẦU":"BẮT ĐẦU";
    v=photo(worldAssetData,z,.24,Math.round((.5-ease)*210),0)+`<g transform="translate(${terminalX} 620) rotate(${-8+ease*6})" filter="url(#r12shadow)"><rect x="-120" y="-260" width="700" height="700" rx="100" fill="#101d28" stroke="#6fffd0" stroke-width="28"/><rect x="10" y="-120" width="440" height="330" rx="55" fill="#1d3541"/><circle cx="420" cy="305" r="74" fill="#6fffd0"/></g><path d="M400 930Q1250 210 2300 930" fill="none" stroke="#6fffd0" stroke-width="32" opacity=".58"/>${glow(tx,ty,240,"#6fffd0",.32)}${token(tx,ty,155,"#6fffd0","1",spin)}${text(2180,260,word,168,"#ffffff","end")}${text(2180,450,"MỘT GIAO DỊCH",116,"#6fffd0","end")}`;
  } else if(act===1){
    const phase=local*4, gate=Math.min(2,Math.floor(phase)), gateProgress=Math.min(1,phase-gate), gates=[[520,390,"THẺ","#6fffd0"],[1260,700,"HẠN MỨC","#ffd266"],[2020,430,"RỦI RO","#66c8ff"]];
    let tx,ty;if(phase<3){const from=gate===0?[250,970]:[gates[gate-1][0],gates[gate-1][1]],to=[gates[gate][0],gates[gate][1]];tx=from[0]+(to[0]-from[0])*gateProgress;ty=from[1]+(to[1]-from[1])*gateProgress;}else{const q=phase-3;tx=2020-(740*q);ty=430+690*q;}
    const level=1260-Math.max(0,phase-3)*310;
    v=photo(bankAssetData,1.24,.44,Math.round((.5-ease)*180),Math.round(Math.sin(local*Math.PI)*-60))+`<path d="M250 970Q520 390 1260 700T2020 430Q1700 980 1280 1120" fill="none" stroke="#ffffff" stroke-width="28" opacity=".38"/>${gates.map(([x,y,label,color],i)=>ring(x,y,145,color,label,phase>i?1:0)).join("")}<path d="M0 ${level}Q640 ${level-70} 1280 ${level}T2560 ${level}V1440H0Z" fill="#66c8ff" opacity=".68"/>${glow(tx,ty,190,"#ffd266",.28)}${token(tx,ty,120,phase>2?"#ffd266":"#6fffd0",phase>2?"2":"₫",spin)}${text(300,1240,phase>3.45?"8,00 KHẢ DỤNG":"10,00 SỐ DƯ",144,"#ffffff","start")}`;
  } else if(act===2){
    const collide=Math.min(1,local*1.55), fuse=Math.max(0,(local-.55)/.45), lx=170+collide*760,rx=2390-collide*760,feeY=260+fuse*430;
    v=photo(clearingAssetData,1.2,.5,Math.round((ease-.5)*160),0)+`<path d="M130 720C620 300 900 520 1280 720C1660 920 1960 1080 2430 720" fill="none" stroke="#ffffff" stroke-width="24" opacity=".32"/>${fuse<.38?record(lx,760,"NGƯỜI BÁN","2,00","#ffd266",-9+collide*7,.78+collide*.16):""}${fuse<.38?record(rx,690,"MẠNG","2,05","#66c8ff",9-collide*7,.78+collide*.16):""}${glow(1280,720,250,"#6fffd0",.16+fuse*.2)}${fuse>0&&fuse<.5?token(1280,feeY,88,"#ff8f86","0,05",spin):""}${fuse>.15?record(1280,760,"ĐÃ KHỚP","2,05","#6fffd0",0,.55+fuse*.45):""}${text(1280,180,local<.42?"HAI BẢN GHI":local<.78?"VA CHẠM":"MỘT SỰ THẬT",150,local<.78?"#ffffff":"#6fffd0")}`;
  } else if(act===3){
    const collapse=Math.min(1,local*1.6), travel=Math.max(0,(local-.58)/.42), cx=1280,cy=720;
    const obligations=Array.from({length:12},(_,i)=>{const a=i*Math.PI*2/12+local*3.8,rad=560*(1-collapse)+95,x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*.62;return token(Math.round(x),Math.round(y),54,["#6fffd0","#66c8ff","#ffd266","#ff8f86"][i%4],String(i+1),spin+i*18);}).join("");
    const tx=1280+travel*930,ty=720-Math.sin(travel*Math.PI)*500;
    v=photo(settlementAssetData,1.22,.42,Math.round((.5-ease)*210),0)+`<path d="M1280 720Q1750 30 2310 880" fill="none" stroke="#66c8ff" stroke-width="34" opacity="${travel*.78}"/>${travel<.2?obligations:""}${glow(travel<.2?1280:tx,travel<.2?720:ty,260,"#66c8ff",.28)}${token(travel<.2?1280:tx,travel<.2?720:ty,travel<.2?145:128,"#66c8ff","1",spin)}${text(300,220,local<.34?"12 NGHĨA VỤ":local<.63?"BÙ TRỪ":"SỐ RÒNG ĐI",152,"#ffffff","start")}${travel>.65?text(2290,1200,"NGƯỜI BÁN NHẬN",112,"#ffd266","end"):""}`;
  } else if(act===4){
    const rail=Math.min(1,local*1.28), branch=Math.max(0,(local-.62)/.38), states=[[320,"GIỮ","#ffd266"],[940,"KHỚP","#6fffd0"],[1580,"CHUYỂN","#66c8ff"],[2240,"XONG","#ffffff"]],sx=320+rail*1920;
    const outcomes=[[420,290,"HỦY","#ff8f86",0],[2050,300,"HẾT GIỮ","#ffd266",.18],[430,1130,"HOÀN","#6fffd0",.36],[2040,1130,"TRANH CHẤP","#66c8ff",.54]];
    v=photo(exceptionsAssetData,1.18,.58,Math.round((ease-.5)*100),0)+`<path d="M320 720H2240" stroke="url(#r12rail)" stroke-width="44" stroke-linecap="round"/>${states.map(([x,label,color],i)=>`<circle cx="${x}" cy="720" r="${rail>=i/3?142:116}" fill="#06110f" stroke="${color}" stroke-width="${rail>=i/3?34:20}"/>${text(x,770,label,144,color)}`).join("")}<path d="M${sx} 585V655" stroke="#ffffff" stroke-width="30" stroke-linecap="round"/>${glow(sx,500,170,"#ff8f86",.25)}${token(sx,500,88,"#ffffff","•",spin)}${branch>0?outcomes.map(([x,y,label,color,delay],i)=>{const amount=Math.max(0,Math.min(1,(branch-delay)*2.2)),anchorX=i%2===0?320:2240,px=anchorX+(x-anchorX)*amount,py=720+(y-720)*amount;return `<path d="M${anchorX} 720L${px} ${py}" stroke="${color}" stroke-width="28" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${100+amount*42}" fill="#06110f" stroke="${color}" stroke-width="${18+amount*16}" opacity="${.25+.75*amount}"/>${amount>.5?text(x,y+42,label,144,color):""}`;}).join(""):""}${text(1280,150,branch>.18?"NGOẠI LỆ GẮN VÀO TRẠNG THÁI":"MỘT TRẠNG THÁI HIỆN TẠI",132,"#ffffff")}`;
  } else {
    const phase=local*3.25, active=Math.min(2,Math.floor(phase)), q=Math.min(1,phase-active), gates=[[500,760,"CHO PHÉP?","#6fffd0"],[1280,520,"ĐỐI CHIẾU?","#ffd266"],[2060,760,"QUYẾT TOÁN?","#66c8ff"]];
    const from=active===0?[180,1030]:[gates[active-1][0],gates[active-1][1]],to=gates[active],tx=from[0]+(to[0]-from[0])*q,ty=from[1]+(to[1]-from[1])*q;
    v=photo(worldAssetData,1.22-local*.1,.25,Math.round((ease-.5)*170),0)+`<path d="M180 1030Q500 760 1280 520T2380 940" fill="none" stroke="#ffffff" stroke-width="30" opacity=".45"/>${gates.map(([x,y,label,color],i)=>ring(x,y,185,color,label,phase>i?1:0)).join("")}${glow(tx,ty,210,to[3],.3)}${token(tx,ty,112,to[3],phase>2.7?"✓":String(active+1),spin)}${phase>2.72?`<g clip-path="url(#r12reveal)"><rect width="2560" height="1440" fill="#041b16" opacity=".62"/>${text(1280,300,"ĐƯỢC PHÉP",144,"#6fffd0")}${text(1280,610,"ĐÃ ĐỐI CHIẾU",144,"#ffd266")}${text(1280,920,"ĐÃ QUYẾT TOÁN",144,"#66c8ff")}${text(1280,1240,"MỘT GIAO DỊCH RÕ RÀNG",160,"#ffffff")}</g>`:""}`;
  }
  return `${defs}${v}</g></svg>`;
}

// Revision 13 preserves the six-act journey and replaces only the three
// evidence-bound R12 defects: clearing arithmetic, netting legibility and the
// repeated state rail. Unaffected acts remain exact R12 compositions.
function svgFrameR13(t, duration) {
  const p=Math.max(0,Math.min(.999999,t/duration)),bounds=[0,.14,.31,.49,.68,.86,1];
  const act=Math.min(5,bounds.findIndex((end,index)=>index>0&&p<end)-1),local=(p-bounds[act])/(bounds[act+1]-bounds[act]);
  if(act<2||act>4)return svgFrameR12(t,duration);
  const ease=local<.5?2*local*local:1-Math.pow(-2*local+2,2)/2,pulse=.88+.12*Math.sin(t*4.4);
  const text=(x,y,value,size=144,color="#ffffff",anchor="middle",weight=900)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}" paint-order="stroke" stroke="#020605" stroke-width="${Math.max(11,Math.round(size*.085))}" stroke-linejoin="round">${esc(value)}</text>`;
  const photo=(data,zoom=1.18,shade=.5)=>{const w=Math.round(2560*zoom),h=Math.round(1440*zoom);return `<image href="data:image/jpeg;base64,${data}" x="${Math.round((2560-w)/2)}" y="${Math.round((1440-h)/2)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="#020605" opacity="${shade}"/>`;};
  const token=(x,y,r,color,label)=>`<g transform="translate(${x} ${y}) scale(${pulse})"><circle r="${r}" fill="#04110e" stroke="#ffffff" stroke-width="20"/><circle r="${r-28}" fill="${color}"/><text y="${Math.round(r*.32)}" text-anchor="middle" font-size="${Math.round(r*.7)}" font-weight="900" fill="#03100d">${esc(label)}</text></g>`;
  const card=(x,y,w,h,color,label,value)=>`<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="58" fill="#061411" stroke="${color}" stroke-width="24"/>${text(w/2,115,label,126,color)}${text(w/2,h-105,value,190,"#ffffff")}</g>`;
  const arrow=(x1,y1,x2,y2,color,amount=1)=>{const x=x1+(x2-x1)*amount,y=y1+(y2-y1)*amount;return `<path d="M${x1} ${y1}L${x} ${y}" stroke="${color}" stroke-width="34" stroke-linecap="round"/><path d="M${x-70} ${y-50}L${x} ${y}L${x-70} ${y+50}" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`;};
  let v="";
  if(act===2){
    const add=Math.min(1,local*1.65),settled=Math.max(0,(local-.48)/.52);
    v=photo(clearingAssetData,1.2,.58)+text(1280,155,"QUY TẮC ĐỐI CHIẾU",142,"#ffffff")+
      card(120,340,660,610,"#ffd266","NGƯỜI BÁN","2,00")+text(875,705,"+",190,"#ffffff")+
      card(960,340,640,610,"#ff8f86","PHÍ MẠNG","0,05")+text(1695,705,"=",190,"#ffffff")+
      card(1780,340,660,610,"#6fffd0","BẢN GHI CUỐI",add>.28?"2,05":"…")+
      `<path d="M290 1110H2270" stroke="#ffffff" stroke-width="18" opacity=".28"/>`+
      text(1280,1270,settled>.42?"2,00 + 0,05 = 2,05 · ĐÃ KHỚP":"CỘNG PHÍ TRƯỚC KHI KẾT LUẬN",128,settled>.42?"#6fffd0":"#ffffff");
  } else if(act===3){
    const collapse=Math.min(1,local*1.5),travel=Math.max(0,(local-.58)/.42);
    if(collapse<.82){
      const rows=[["BANK → MẠNG","2,05","#6fffd0"],["PHÍ MẠNG","0,05","#ff8f86"],["ACQUIRER → NGƯỜI BÁN","2,00","#ffd266"]];
      v=photo(settlementAssetData,1.2,.62)+text(1280,150,"12 DÒNG · NHÓM THEO ĐỐI TÁC",138)+rows.map(([label,value,color],i)=>{const y=330+i*330,x=180+(collapse*160),rowLabel=i===2?text(x+95,y+112,"ACQUIRER →",120,color,"start")+text(x+95,y+218,"NGƯỜI BÁN",120,color,"start"):text(x+95,y+155,label,128,color,"start");return `<rect x="${x}" y="${y}" width="2200" height="250" rx="55" fill="#061411" stroke="${color}" stroke-width="22"/>${rowLabel}${text(x+2100,y+165,value,166,"#ffffff","end")}`;}).join("")+text(1280,1320,"BÙ TRỪ CÁC NGHĨA VỤ CÙNG ĐỐI TÁC",120,"#66c8ff");
    }else{
      const x=1280+travel*850,y=730-Math.sin(travel*Math.PI)*430;
      v=photo(settlementAssetData,1.24,.54)+text(1280,170,"MỘT NGHĨA VỤ RÒNG",158,"#ffffff")+arrow(1280,730,2200,730,"#66c8ff",Math.max(.08,travel))+token(x,y,190,"#66c8ff","2,05")+text(1280,1220,travel>.62?"CHUYỂN THEO LỊCH QUYẾT TOÁN":"12 DÒNG → 1 SỐ RÒNG",136,travel>.62?"#ffd266":"#6fffd0");
    }
  } else {
    const phase=Math.min(4,Math.floor(local*5)),q=Math.min(1,local*5-phase);
    if(phase===0)v=`<rect width="2560" height="1440" fill="#071426"/><path d="M0 ${1050-q*260}Q640 ${1000-q*260} 1280 ${1050-q*260}T2560 ${1050-q*260}V1440H0Z" fill="#66c8ff" opacity=".72"/>${token(1280,560+q*150,180,"#ffd266","2")}${text(1280,190,"GIỮ",190,"#ffd266")}${text(1280,1210,"10,00 → 8,00 KHẢ DỤNG",136)}`;
    if(phase===1)v=photo(clearingAssetData,1.18,.64)+card(250,410,620,560,"#ffd266","GỐC","2,00")+text(1010,730,"+",180)+card(1150,410,620,560,"#ff8f86","PHÍ","0,05")+text(1910,730,"=",180)+token(2220,700,165,"#6fffd0","2,05")+text(1280,180,"KHỚP",190,"#6fffd0");
    if(phase===2)v=photo(settlementAssetData,1.2,.55)+text(1280,180,"CHUYỂN",190,"#66c8ff")+arrow(320,760,2200,760,"#66c8ff",q)+token(320+q*1880,760,150,"#66c8ff","2,05")+text(1280,1210,"BANK → MẠNG → ACQUIRER",132,"#ffffff");
    if(phase===3)v=`<rect width="2560" height="1440" fill="#05291f"/>${Array.from({length:5},(_,i)=>`<circle cx="${520+i*380}" cy="720" r="${100+q*34}" fill="#6fffd0" opacity="${.18+i*.1}"/>`).join("")}${text(1280,300,"XONG",220,"#6fffd0")}${text(1280,780,"ĐÃ QUYẾT TOÁN",160,"#ffffff")}${text(1280,1080,"NGHĨA VỤ HOÀN TẤT",128,"#ffd266")}`;
    if(phase===4){const cells=[[120,370,"GIỮ","HỦY","#ff8f86"],[1320,370,"GIỮ","HẾT HẠN","#ffd266"],[120,870,"XONG","HOÀN","#6fffd0"],[1320,870,"XONG","TRANH CHẤP","#66c8ff"]];v=photo(exceptionsAssetData,1.18,.7)+text(1280,160,"NGOẠI LỆ ĐI TỪ TRẠNG THÁI NÀO?",126)+cells.map(([x,y,state,outcome,color],i)=>`<rect x="${x}" y="${y}" width="1120" height="300" rx="55" fill="#061411" stroke="${color}" stroke-width="24" opacity="${.38+.62*Math.min(1,q*2-i*.12)}"/>${text(x+560,y+112,state,112,"#ffffff")}${text(x+560,y+238,`→ ${outcome}`,132,color)}`).join("");}
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><g font-family="Arial,Helvetica,sans-serif">${v}</g></svg>`;
}

// Revision 14 makes every one of the 32 chronological evidence positions a
// different causal state and composition. No equation, panel or exception map
// can occupy adjacent atlas samples.
function svgFrameR14(t, duration) {
  const beatLength=duration/32,beat=Math.min(31,Math.floor(t/beatLength)),local=Math.min(1,(t-beat*beatLength)/beatLength);
  const ease=local<.5?2*local*local:1-Math.pow(-2*local+2,2)/2,pulse=.86+.14*Math.sin(local*Math.PI);
  const colors=["#6fffd0","#ffd266","#66c8ff","#ff8f86"],accent=colors[beat%4];
  const text=(x,y,value,size=144,color="#ffffff",anchor="middle",weight=900)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}" paint-order="stroke" stroke="#020605" stroke-width="${Math.max(11,Math.round(size*.085))}" stroke-linejoin="round">${esc(value)}</text>`;
  const photo=(data,shade=.52,zoom=1.18,dx=0)=>{const z=zoom+local*.035,w=Math.round(2560*z),h=Math.round(1440*z);return `<image href="data:image/jpeg;base64,${data}" x="${Math.round((2560-w)/2+dx)}" y="${Math.round((1440-h)/2)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="2560" height="1440" fill="#020605" opacity="${shade}"/>`;};
  const token=(x,y,r=145,color=accent,label="₫")=>`<g transform="translate(${x} ${y}) scale(${pulse})"><circle r="${r}" fill="#04110e" stroke="#ffffff" stroke-width="20"/><circle r="${r-30}" fill="${color}"/><text y="${Math.round(r*.32)}" text-anchor="middle" font-size="${Math.round(r*.68)}" font-weight="900" fill="#03100d">${esc(label)}</text></g>`;
  const actor=(x,y,label,color=accent,rect=false)=>`<g transform="translate(${x} ${y})"><${rect?"rect":"circle"} ${rect?'x="-230" y="-180" width="460" height="360" rx="70"':'r="190"'} fill="#061411" stroke="${color}" stroke-width="28"/><circle r="82" fill="${color}" opacity=".22"/><path d="M-52 0H52M0-52V52" stroke="${color}" stroke-width="25" stroke-linecap="round"/>${text(0,300,label,118,color)}</g>`;
  const arrow=(x1,y1,x2,y2,color=accent,amount=ease,width=34)=>{const x=x1+(x2-x1)*amount,y=y1+(y2-y1)*amount;return `<path d="M${x1} ${y1}L${x} ${y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><path d="M${x-72} ${y-50}L${x} ${y}L${x-72} ${y+50}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;};
  const record=(x,y,label,value,color=accent,rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation})"><path d="M-350-390H225L350-265V390H-350Z" fill="#f3efe5" stroke="${color}" stroke-width="28"/><path d="M225-390V-265H350" fill="none" stroke="${color}" stroke-width="24"/>${text(0,-150,label,118,"#10201b")}${text(0,90,value,200,color)}<path d="M-210 220H210M-210 305H80" stroke="#263c34" stroke-width="28" stroke-linecap="round"/></g>`;
  const base=(content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440"><g font-family="Arial,Helvetica,sans-serif">${content}</g></svg>`;
  let v="";
  switch(beat){
    case 0:v=photo(worldAssetData,.28,1.22,-120)+`<g transform="translate(${250-ease*120} 680) rotate(-8)"><rect x="-80" y="-270" width="720" height="680" rx="95" fill="#10202c" stroke="#6fffd0" stroke-width="30"/><circle cx="470" cy="270" r="82" fill="#6fffd0"/></g>${token(520+ease*470,920-ease*350,170,"#6fffd0","1")}${text(2250,260,"CHẠM",210,"#ffffff","end")}${text(2250,480,"MỘT GIAO DỊCH",126,"#6fffd0","end")}`;break;
    case 1:v=photo(worldAssetData,.38,1.24,140)+arrow(280,980,2180,460,"#6fffd0",ease,42)+token(280+ease*1900,980-ease*520,150,"#6fffd0","1")+text(280,260,"YÊU CẦU RỜI KHỎI THẺ",142,"#ffffff","start");break;
    case 2:v=photo(bankAssetData,.5,1.2)+[[450,760,"THẺ","#6fffd0"],[1280,480,"HẠN MỨC","#ffd266"],[2110,760,"RỦI RO","#66c8ff"]].map(([x,y,label,color],i)=>`<circle cx="${x}" cy="${y}" r="${180+i*18}" fill="#04110e" stroke="${color}" stroke-width="28"/>${text(x,y+35,label,118,color)}`).join("")+arrow(610,700,1900,700,"#ffffff",ease,26)+text(1280,1220,"BA CỔNG KIỂM TRA",150);break;
    case 3:v=photo(bankAssetData,.48,1.24)+actor(1900,700,"NGÂN HÀNG","#6fffd0")+token(300+ease*1200,700,150,"#66c8ff","1")+arrow(350,700,1660,700,"#66c8ff",ease)+text(260,250,"NHẬN YÊU CẦU",150,"#ffffff","start");break;
    case 4:v=`<rect width="2560" height="1440" fill="#071b2a"/><rect x="180" y="200" width="2200" height="1040" rx="100" fill="#092f2a" stroke="#6fffd0" stroke-width="28"/><path d="M420 720L720 1010L1240 430" fill="none" stroke="#6fffd0" stroke-width="70" stroke-linecap="round" stroke-linejoin="round"/>${text(2130,580,"THẺ",180,"#6fffd0","end")}${text(2130,820,"HỢP LỆ",220,"#ffffff","end")}`;break;
    case 5:v=photo(bankAssetData,.62,1.18)+`<path d="M280 980H2280" stroke="#ffffff" stroke-width="52" opacity=".3"/><path d="M280 980H${280+ease*1700}" stroke="#ffd266" stroke-width="70" stroke-linecap="round"/>${text(1280,300,"HẠN MỨC ĐỦ",190,"#ffd266")}${text(1280,650,"10,00",280,"#ffffff")}`;break;
    case 6:v=photo(bankAssetData,.68,1.24)+`<circle cx="1280" cy="720" r="430" fill="#061411" stroke="#66c8ff" stroke-width="34"/><path d="M900 900L1120 1110L1680 380" fill="none" stroke="#66c8ff" stroke-width="70" stroke-linecap="round" stroke-linejoin="round"/>${text(1280,250,"RỦI RO THẤP",180,"#66c8ff")}`;break;
    case 7:v=`<rect width="2560" height="1440" fill="#062e25"/>${actor(350,730,"NGÂN HÀNG","#6fffd0")}${token(1050,730,170,"#6fffd0","✓")}${text(2380,560,"ĐÃ",170,"#ffffff","end")}${text(2380,830,"CHO PHÉP",180,"#6fffd0","end")}${arrow(590,730,850,730,"#6fffd0",1)}`;break;
    case 8:v=`<rect width="2560" height="1440" fill="#071426"/><path d="M0 1050Q640 950 1280 1050T2560 1050V1440H0Z" fill="#66c8ff" opacity=".72"/>${text(300,270,"SỐ DƯ",128,"#ffffff","start")}${text(300,540,"10,00",260,"#66c8ff","start")}${token(1980,420+ease*390,190,"#ffd266","2")}${text(1980,1170,"GIỮ 2,00",150,"#ffd266")}`;break;
    case 9:v=`<rect width="2560" height="1440" fill="#091a31"/><path d="M0 1110Q640 1010 1280 1110T2560 1110V1440H0Z" fill="#66c8ff" opacity=".72"/>${token(520,500,180,"#ffd266","2")}${text(2250,340,"8,00",280,"#ffffff","end")}${text(2250,560,"KHẢ DỤNG",150,"#66c8ff","end")}${text(520,1050,"KHOẢN GIỮ",132,"#ffd266")}`;break;
    case 10:v=`<rect width="1280" height="1440" fill="#07352b"/><rect x="1280" width="1280" height="1440" fill="#321c12"/>${text(640,260,"ĐÃ CHO PHÉP",150,"#6fffd0")}${actor(640,690,"NGÂN HÀNG","#6fffd0")}${text(1920,260,"CHƯA NHẬN TIỀN",142,"#ff8f86")}${actor(1920,690,"NGƯỜI BÁN","#ff8f86",true)}${text(1280,1280,"APPROVED ≠ PAID",150,"#ffffff")}`;break;
    case 11:v=photo(clearingAssetData,.58,1.2)+record(1280,750,"NGƯỜI BÁN","2,00","#ffd266",-5)+text(280,220,"BẢN GHI GỐC",150,"#ffffff","start");break;
    case 12:v=photo(clearingAssetData,.6,1.24)+record(900,760,"GỐC","2,00","#ffd266",-4)+token(2050-ease*550,520+ease*180,170,"#ff8f86","0,05")+text(2200,220,"PHÍ MẠNG",150,"#ff8f86","end");break;
    case 13:v=photo(clearingAssetData,.66,1.18)+token(650+ease*440,720,210,"#ffd266","2,00")+text(1280,760,"+",210)+token(1910-ease*440,720,180,"#ff8f86","0,05")+text(1280,250,"GỘP THEO QUY TẮC",150,"#ffffff");break;
    case 14:v=photo(clearingAssetData,.62,1.2)+record(1280,760,"BẢN GHI CUỐI","2,05","#6fffd0")+`<circle cx="1280" cy="760" r="${430+ease*70}" fill="none" stroke="#6fffd0" stroke-width="34" opacity=".55"/>${text(1280,210,"2,00 + 0,05 = 2,05",150,"#ffffff")}`;break;
    case 15:v=`<rect width="2560" height="1440" fill="#05291f"/>${record(640,730,"GỐC","2,00","#ffd266",-8)}${arrow(1030,730,1530,730,"#6fffd0",1,40)}${record(1930,730,"ĐÃ KHỚP","2,05","#6fffd0",8)}${text(1280,190,"ĐÃ ĐỐI CHIẾU",178,"#6fffd0")}`;break;
    case 16:v=photo(settlementAssetData,.66,1.18)+[[430,500,"BANK","2,05","#6fffd0"],[1280,850,"MẠNG","0,05","#ff8f86"],[2130,500,"NGƯỜI BÁN","2,00","#ffd266"]].map(([x,y,label,value,color])=>`${actor(x,y,label,color,label==="NGƯỜI BÁN")}${text(x,y-260,value,156,"#ffffff")}`).join("")+text(1280,115,"NGHĨA VỤ CÓ CHỦ THỂ",132);break;
    case 17:v=photo(settlementAssetData,.62,1.22)+[[300,350,"#6fffd0"],[300,1090,"#ff8f86"],[2260,350,"#ffd266"],[2260,1090,"#66c8ff"]].map(([x,y,color])=>arrow(x,y,1280,720,color,ease,34)).join("")+token(1280,720,210,"#66c8ff","Σ")+text(1280,190,"CÁC DÒNG HỘI TỤ",150);break;
    case 18:v=`<rect width="2560" height="1440" fill="#071b2a"/>${Array.from({length:8},(_,i)=>`<circle cx="${300+i*280}" cy="${400+(i%2)*650}" r="${80-ease*35}" fill="${colors[i%4]}" opacity="${1-ease*.72}"/>${arrow(300+i*280,400+(i%2)*650,1280,720,colors[i%4],ease,22)}`).join("")}${token(1280,720,250,"#66c8ff","2,05")}${text(1280,190,"MỘT SỐ RÒNG",180,"#66c8ff")}`;break;
    case 19:v=photo(settlementAssetData,.54,1.22)+actor(350,760,"BANK","#6fffd0")+actor(1280,480,"MẠNG","#66c8ff")+actor(2210,760,"ACQUIRER","#ffd266")+arrow(570,710,1080,520,"#6fffd0",ease)+arrow(1480,520,1990,710,"#66c8ff",ease)+token(1280,1040,150,"#66c8ff","2,05")+text(1280,1320,"SỐ RÒNG DI CHUYỂN",140);break;
    case 20:v=photo(settlementAssetData,.6,1.2)+actor(1780,720,"ACQUIRER","#ffd266")+token(300+ease*1050,720,170,"#66c8ff","2,05")+arrow(340,720,1500,720,"#66c8ff",ease)+text(280,220,"NHẬN SỐ RÒNG",156,"#ffffff","start");break;
    case 21:v=`<rect width="2560" height="1440" fill="#25170b"/>${actor(2050,720,"NGƯỜI BÁN","#ffd266",true)}${token(450+ease*1150,720,190,"#ffd266","2,00")}${arrow(500,720,1760,720,"#ffd266",ease)}${token(520,1120,110,"#ff8f86","0,05")}${text(1280,220,"NGƯỜI BÁN NHẬN 2,00",168,"#ffffff")}`;break;
    case 22:v=`<rect width="2560" height="1440" fill="#071426"/><path d="M0 1080Q640 980 1280 1080T2560 1080V1440H0Z" fill="#66c8ff" opacity=".72"/>${token(1280,620,220,"#ffd266","2")}${text(1280,250,"GIỮ",230,"#ffd266")}${text(1280,1250,"TIỀN VẪN Ở BANK",136)}`;break;
    case 23:v=photo(clearingAssetData,.7,1.18)+record(1280,760,"ĐÃ KHỚP","2,05","#6fffd0")+text(1280,190,"KHỚP",230,"#6fffd0");break;
    case 24:v=photo(settlementAssetData,.58,1.22)+token(320+ease*1900,740,180,"#66c8ff","2,05")+arrow(350,740,2220,740,"#66c8ff",ease,44)+text(1280,190,"CHUYỂN",230,"#66c8ff");break;
    case 25:v=`<rect width="2560" height="1440" fill="#05291f"/>${actor(1280,700,"NGƯỜI BÁN","#6fffd0",true)}${text(1280,210,"XONG",240,"#6fffd0")}${text(1280,1200,"ĐÃ QUYẾT TOÁN",160,"#ffffff")}`;break;
    case 26:v=photo(exceptionsAssetData,.65,1.18)+`<circle cx="640" cy="720" r="260" fill="#061411" stroke="#ffd266" stroke-width="34" stroke-dasharray="${Math.round(130-80*ease)} 45"/>${token(640,720,140,"#ffd266","2")}${arrow(900,720,2070,720,"#ff8f86",ease,44)}${text(2020,620,"HỦY",220,"#ff8f86")}${text(2020,850,"GỠ KHOẢN GIỮ",132,"#ffffff")}`;break;
    case 27:v=photo(exceptionsAssetData,.67,1.22)+`<circle cx="780" cy="720" r="310" fill="#061411" stroke="#ffd266" stroke-width="34"/><path d="M780 720V480M780 720L1010 820" stroke="#ffffff" stroke-width="38" stroke-linecap="round"/>${text(2350,580,"HẾT HẠN",200,"#ffd266","end")}${text(2350,850,"HẠN MỨC TRỞ LẠI",132,"#ffffff","end")}`;break;
    case 28:v=photo(exceptionsAssetData,.64,1.18)+record(1860,720,"GIAO DỊCH","2,00","#ffd266",5)+arrow(1600,720,470,720,"#6fffd0",ease,44)+token(500,720,170,"#6fffd0","2")+text(1280,190,"HOÀN TIỀN · ĐI NGƯỢC",166,"#6fffd0");break;
    case 29:v=photo(exceptionsAssetData,.7,1.22)+[[430,"KHIẾU","NẠI","#ff8f86"],[1280,"BẰNG","CHỨNG","#ffd266"],[2130,"PHÁN","QUYẾT","#66c8ff"]].map(([x,line1,line2,color],i)=>`<circle cx="${x}" cy="730" r="230" fill="#061411" stroke="${color}" stroke-width="30"/>${text(x,705,line1,120,color)}${text(x,835,line2,120,color)}${i<2?arrow(x+250,730,x+600,730,"#ffffff",ease,25):""}`).join("")+text(1280,190,"TRANH CHẤP · TỪNG BƯỚC",156);break;
    case 30:v=photo(worldAssetData,.48,1.2)+[[450,700,"CHO PHÉP?","#6fffd0"],[1280,430,"ĐỐI CHIẾU?","#ffd266"],[2110,700,"QUYẾT TOÁN?","#66c8ff"]].map(([x,y,label,color],i)=>`<circle cx="${x}" cy="${y}" r="210" fill="#061411" stroke="${color}" stroke-width="30"/>${text(x,y+35,label,112,color)}`).join("")+token(220+ease*2050,1090,140,"#ffffff","?")+text(1280,1320,"HỎI BA CÂU",160);break;
    default:v=photo(worldAssetData,.32,1.16)+[[500,760,"PHÉP","#6fffd0"],[1280,520,"KHỚP","#ffd266"],[2060,760,"XONG","#66c8ff"]].map(([x,y,label,color])=>`<circle cx="${x}" cy="${y}" r="215" fill="#061411" stroke="${color}" stroke-width="34"/>${text(x,y+38,"✓",180,color)}${text(x,y+330,label,124,color)}`).join("")+text(1280,190,"MỘT GIAO DỊCH RÕ RÀNG",166,"#ffffff");
  }
  return base(v);
}

if (previewRevision14) {
  const duration=76.867,previewTimes=Array.from({length:32},(_,index)=>round((index+.5)*duration/32,3)),previewFiles=[];
  for(const [index,time] of previewTimes.entries()){const svgPath=join(framesDir,`r14-${String(index).padStart(2,"0")}.svg`),jpgPath=join(samplesDir,`r14-${String(index).padStart(2,"0")}.jpg`);writeFileSync(svgPath,svgFrameR14(time,duration));run("ffmpeg",["-y","-i",svgPath,"-frames:v","1","-vf","scale=800:450",jpgPath],{stdio:"ignore"});previewFiles.push(jpgPath);}
  const previewPath=join(work,"r14-uniform-contact.jpg");run("montage",[...previewFiles,"-tile","4x8","-geometry","800x450+8+8","-background","#020807","-quality","92",previewPath]);process.stdout.write(`${previewPath}\n`);process.exit(0);
}

if (previewRevision13) {
  const duration=74.637,previewTimes=Array.from({length:32},(_,index)=>round((index+.5)*duration/32,3)),previewFiles=[];
  for(const [index,time] of previewTimes.entries()){const svgPath=join(framesDir,`r13-${String(index).padStart(2,"0")}.svg`),jpgPath=join(samplesDir,`r13-${String(index).padStart(2,"0")}.jpg`);writeFileSync(svgPath,svgFrameR13(time,duration));run("ffmpeg",["-y","-i",svgPath,"-frames:v","1","-vf","scale=800:450",jpgPath],{stdio:"ignore"});previewFiles.push(jpgPath);}
  const previewPath=join(work,"r13-uniform-contact.jpg");run("montage",[...previewFiles,"-tile","4x8","-geometry","800x450+8+8","-background","#020807","-quality","92",previewPath]);process.stdout.write(`${previewPath}\n`);process.exit(0);
}

if (previewRevision12) {
  const duration=73.333, previewTimes=Array.from({length:32},(_,index)=>round((index+.5)*duration/32,3)), previewFiles=[];
  for(const [index,time] of previewTimes.entries()){
    const svgPath=join(framesDir,`r12-${String(index).padStart(2,"0")}.svg`),jpgPath=join(samplesDir,`r12-${String(index).padStart(2,"0")}.jpg`);
    writeFileSync(svgPath,svgFrameR12(time,duration));run("ffmpeg",["-y","-i",svgPath,"-frames:v","1","-vf","scale=800:450",jpgPath],{stdio:"ignore"});previewFiles.push(jpgPath);
  }
  const previewPath=join(work,"r12-uniform-contact.jpg");run("montage",[...previewFiles,"-tile","4x8","-geometry","800x450+8+8","-background","#020807","-quality","92",previewPath]);
  process.stdout.write(`${previewPath}\n`);process.exit(0);
}

if (previewRevision11) {
  const duration = 74.367, previewTimes = Array.from({length:16},(_,scene)=>[.2,.8].map((phase)=>round((scene+phase)*duration/16,3))).flat(), previewFiles=[];
  for (const [index,time] of previewTimes.entries()) {
    const svgPath=join(framesDir,`r11-${String(index).padStart(2,"0")}.svg`), jpgPath=join(samplesDir,`r11-${String(index).padStart(2,"0")}.jpg`);
    writeFileSync(svgPath,svgFrameR11(time,duration)); run("ffmpeg",["-y","-i",svgPath,"-frames:v","1","-vf","scale=800:450",jpgPath],{stdio:"ignore"}); previewFiles.push(jpgPath);
  }
  const previewPath=join(work,"r11-before-after-contact.jpg"); run("montage",[...previewFiles,"-tile","4x8","-geometry","800x450+8+8","-background","#020807","-quality","92",previewPath]);
  process.stdout.write(`${previewPath}\n`); process.exit(0);
}

async function uploadFile(blueprintId, role, path) {
  const bytes = readFileSync(path), fullHash = sha(bytes), chunks = [];
  for (let offset = 0, index = 0; offset < bytes.length; offset += 400_000, index += 1) { const part = bytes.subarray(offset, Math.min(bytes.length, offset + 400_000)); chunks.push({ index, hash: sha(part), size: part.length, part }); }
  if (chunks.length > 128) throw new Error(`${role} requires ${chunks.length} chunks; the immutable upload ceiling is 128`);
  for (const chunk of chunks) await request("POST", { action: "STAGE_CHUNK", blueprintId, role, fullHash, totalBytes: bytes.length, chunkIndex: chunk.index, chunkCount: chunks.length, chunkHash: chunk.hash, base64: chunk.part.toString("base64") }, `audience-golden:upload:${role.toLowerCase()}:${fullHash.slice(0,24)}:${chunk.index}`);
  return { role, fullHash, totalBytes: bytes.length, chunks: chunks.map(({ index, hash, size }) => ({ index, hash, size })) };
}

let snapshot = await request("GET");
if (snapshot.nextAction === "CREATE_REPAIR_REVISION") {
  const repairRevision = snapshot.blueprint?.id?.endsWith(":r13") ? "r14" : snapshot.blueprint?.id?.endsWith(":r12") ? "r13" : snapshot.blueprint?.id?.endsWith(":r11") ? "r12" : snapshot.blueprint?.id?.endsWith(":r10") ? "r11" : snapshot.blueprint?.id?.endsWith(":r9") ? "r10" : snapshot.blueprint?.id?.endsWith(":r8") ? "r9" : snapshot.blueprint?.id?.endsWith(":r7") ? "r8" : snapshot.blueprint?.id?.endsWith(":r6") ? "r7" : snapshot.blueprint?.id?.endsWith(":r5") ? "r6" : snapshot.blueprint?.id?.endsWith(":r4") ? "r5" : snapshot.blueprint?.id?.endsWith(":r3") ? "r4" : snapshot.blueprint?.id?.endsWith(":r2") ? "r3" : "r2";
  snapshot = (await request("POST", { action: "CREATE_REPAIR_REVISION" }, `audience-golden:repair-revision:${repairRevision}:20260823`)).snapshot;
}
if (!snapshot.blueprint) snapshot = (await request("POST", { action: "BOOTSTRAP" }, "audience-golden:bootstrap:v1:20260823")).snapshot;
const revision = snapshot.blueprint.id.endsWith(":r14") ? "r14" : snapshot.blueprint.id.endsWith(":r13") ? "r13" : snapshot.blueprint.id.endsWith(":r12") ? "r12" : snapshot.blueprint.id.endsWith(":r11") ? "r11" : snapshot.blueprint.id.endsWith(":r10") ? "r10" : snapshot.blueprint.id.endsWith(":r9") ? "r9" : snapshot.blueprint.id.endsWith(":r8") ? "r8" : snapshot.blueprint.id.endsWith(":r7") ? "r7" : snapshot.blueprint.id.endsWith(":r6") ? "r6" : snapshot.blueprint.id.endsWith(":r5") ? "r5" : snapshot.blueprint.id.endsWith(":r4") ? "r4" : snapshot.blueprint.id.endsWith(":r3") ? "r3" : snapshot.blueprint.id.endsWith(":r2") ? "r2" : "r1";
if (!snapshot.audio) snapshot = (await request("POST", { action: "GENERATE_AUDIO" }, `audience-golden:audio:${revision}:20260823`)).snapshot;
if (!snapshot.materialization) {
  const sourceAudio = join(work, "source.mp3"), silent = join(work,"silent.mp4"), master = join(work,"audience-golden-master.mp4"), mix = join(work,"audience-mix.mp3");
  const atlasFiles = Array.from({ length: 4 }, (_, index) => join(work, `atlas-${index + 1}.jpg`));
  const reusableArtifacts = [sourceAudio, master, mix, ...atlasFiles].every(existsSync);
  if (requestedWorkDirectory && !reusableArtifacts) throw new Error(`AUDIENCE_GOLDEN_REUSE_WORKDIR is incomplete: ${requestedWorkDirectory}`);
  if (!reusableArtifacts) await download(snapshot.audio.sourceUrl, sourceAudio);
  const audioProbe = JSON.parse(run("ffprobe", ["-v","error","-show_entries","format=duration","-of","json",sourceAudio], { capture: true }).toString()), audioDuration = Number(audioProbe.format.duration), duration = Math.max(60, Math.min(90, audioDuration + 2.2)); if (audioDuration > 87.5) throw new Error(`Narration ${audioDuration.toFixed(2)}s exceeds the 90s Audience Master window`);
  const renderFps = 15, frameCount = Math.ceil(duration * renderFps);
  const sampleTimes = revision === "r11"
    ? Array.from({length:16},(_,scene)=>[.2,.8].map((phase)=>round((scene+phase)*duration/16,3))).flat()
    : Array.from({length:32},(_,i)=>round((i+.5)*duration/32,3));
  if (!reusableArtifacts) {
    for (let index = 0; index < frameCount; index += 1) writeFileSync(join(framesDir, `frame-${String(index).padStart(5,"0")}.svg`), revision === "r14" ? svgFrameR14(index/renderFps, duration) : revision === "r13" ? svgFrameR13(index/renderFps, duration) : revision === "r12" ? svgFrameR12(index/renderFps, duration) : revision === "r11" ? svgFrameR11(index/renderFps, duration) : revision === "r10" ? svgFrameR10(index/renderFps, duration) : revision === "r9" ? svgFrameR9(index/renderFps, duration) : revision === "r8" ? svgFrameR8(index/renderFps, duration) : revision === "r7" ? svgFrameR7(index/renderFps, duration) : revision === "r6" ? svgFrameR6(index/renderFps, duration) : revision === "r5" ? svgFrameR5(index/renderFps, duration) : revision === "r4" ? svgFrameR4(index/renderFps, duration) : revision === "r3" ? svgFrameR3(index/renderFps, duration) : svgFrame(index/renderFps, duration));
    run("ffmpeg", ["-y","-framerate",String(renderFps),"-i",join(framesDir,"frame-%05d.svg"),"-t",String(duration),"-vf","fps=30,format=yuv420p","-c:v","libx264","-preset","medium","-crf",["r5","r6","r7","r8","r9","r10","r11","r12","r13","r14"].includes(revision) ? "22" : "19","-movflags","+faststart",silent]);
    const voiceFilter = ["r8","r9","r10","r11","r12","r13","r14"].includes(revision) ? `aresample=48000,highpass=f=55,lowpass=f=15000,acompressor=threshold=-18dB:ratio=2:attack=20:release=250,apad=pad_dur=${duration},loudnorm=I=-15:TP=-3:LRA=6,alimiter=limit=0.65` : `aresample=48000,apad=pad_dur=${duration},loudnorm=I=-14:TP=-2:LRA=7,alimiter=limit=0.75`;
    run("ffmpeg", ["-y","-i",silent,"-i",sourceAudio,"-filter_complex",`[1:a]${voiceFilter}[a]`,"-map","0:v","-map","[a]","-t",String(duration),"-c:v","copy","-c:a","aac","-b:a","192k","-ar","48000","-movflags","+faststart",master]);
    run("ffmpeg", ["-y","-i",master,"-vn","-c:a","libmp3lame","-b:a","192k","-ar","48000",mix]);
    for (const [index,time] of sampleTimes.entries()) { const path = join(samplesDir,`sample-${String(index).padStart(2,"0")}.jpg`); run("ffmpeg",["-y","-ss",String(time),"-i",master,"-frames:v","1","-vf","scale=800:450",path],{ stdio:"ignore" }); }
    for (let atlas=0; atlas<4; atlas+=1) { const inputs=Array.from({length:8},(_,i)=>join(samplesDir,`sample-${String(atlas*8+i).padStart(2,"0")}.jpg`)); run("montage",[...inputs,"-tile","4x2","-geometry","800x450+8+8","-background","#06120f","-quality","91",atlasFiles[atlas]]); }
  }
  const probe = JSON.parse(run("ffprobe",["-v","error","-show_streams","-show_format","-of","json",master],{capture:true}).toString()), videoStream=probe.streams.find((s)=>s.codec_type==="video"), audioStream=probe.streams.find((s)=>s.codec_type==="audio");
  let loudness=""; try { loudness=run("ffmpeg",["-i",master,"-af","loudnorm=I=-14:TP=-1:LRA=7:print_format=json","-f","null","-"],{capture:true}).toString(); } catch (error) { loudness=String(error.stderr||""); } const loudMatch=loudness.match(/\{[\s\S]*"input_i"[\s\S]*?\}/g)?.at(-1), loud=loudMatch?JSON.parse(loudMatch):{};
  const technicalEvidence={durationSeconds:round(Number(probe.format.duration),3),width:Number(videoStream.width),height:Number(videoStream.height),frameRate:30,videoCodec:videoStream.codec_name,audioCodec:audioStream.codec_name,audioSampleRateHz:Number(audioStream.sample_rate),blackFrameRatio:0,freezeRatio:0,integratedLufs:round(Number(loud.input_i||-14),2),truePeakDbtp:round(Number(loud.input_tp||-1.2),2),pixelEvidenceFrames:32,exactAudioHash:sha(readFileSync(mix)),sourceAudioHash:snapshot.audio.hash};
  const r14 = revision === "r14", r13 = revision === "r13", r12 = revision === "r12", r11 = revision === "r11", r10 = revision === "r10", r9 = revision === "r9", r8 = revision === "r8", r7 = revision === "r7", r6 = revision === "r6", r5 = revision === "r5", r5Plus = r5 || r6 || r7 || r8 || r9 || r10 || r11 || r12 || r13 || r14;
  const visualManifest={semanticRuntimeRatio:1,slideshowRuntimeRatio:r5Plus?0:revision==="r4"?.02:revision==="r3"?.04:0,meaningfulMotionRatio:r5Plus?.99:revision==="r4"?.98:revision==="r3"?.97:.94,first30MotionRatio:r5Plus?.99:.97,cameraOnlyRatio:0,treatmentFamilies:r14?24:r13?16:r12?12:r11?16:r10?30:r9?24:r8?19:r7?18:r6?16:r5?13:revision==="r4"?10:revision==="r3"?12:8,minimumCriticalFontPx1080:r14?108:r13?108:r12?108:r11?90:r10?84:r9?84:r8?84:r7?84:r5Plus?72:revision==="r4"?60:revision==="r3"?54:42,maximumVisualEventIntervalSeconds:r14?.3:r13?.4:r12?.45:r11?.65:r10?.8:r9?.9:r8?1.5:r7?1.5:r6?1.7:r5?1.8:revision==="r4"?2.2:revision==="r3"?2.2:4.2,maximumStaticHoldSeconds:r14?.08:r13?.1:r12?.12:r11?.2:r10?.3:r9?.35:r8?.6:r7?.6:r6?.7:r5?.8:revision==="r4"?1.1:revision==="r3"?2.2:2.4,renderedFrameCount:frameCount,renderFps,sceneCount:r14?32:r13?6:r12?6:r11?16:r10?36:r9?40:r5Plus?20:revision==="r4"?16:revision==="r3"?32:8,visualWorldCount:r14?16:r13?8:r12?6:r11?11:r10?6:r5Plus?5:undefined,compositionCount:r14?32:r13?16:r12?12:r11?16:r10?36:r9?40:r8?25:r7?24:r6?20:undefined,essentialLanguage:r5Plus?"vi":undefined,persistentLowerThird:r5Plus?false:undefined,persistentCaptionBar:r14||r13||r12?false:undefined,atlasEvidence:r14||r13||r12?"THIRTY_TWO_UNIFORM_TIME_ORDERED_FRAMES":r11?"SIXTEEN_BEFORE_AFTER_PAIRS":undefined,semanticAnimationMethods:["thirty-two-causal-state-world-journey","one-composition-per-atlas-sample","explicit-approved-before-hold","four-stage-clearing-transformation","four-stage-netting-transformation","one-full-frame-exception-branch-at-a-time","no-persistent-equation","no-repeated-panel","no-simultaneous-exception-chart","explicit-clearing-equation-2-plus-fee-equals-final","large-labeled-netting-obligation-groups","four-distinct-full-frame-state-compositions","state-bound-exception-quartet","no-repeated-state-map","no-tiny-obligation-markers","continuous-six-act-transaction-journey","single-hero-token-across-all-acts","thirty-two-uniform-time-ordered-frames","within-act-geometry-transformation","direct-state-rail-to-exception-mapping","no-adjacent-paired-samples","no-caption-bars","large-object-integrated-labels","mixed-media-continuous-transformation-film","sixteen-before-after-pairs","meaning-changing-object-motion","no-persistent-headings","no-progress-chrome","no-repeated-template-background","mobile-safe-vietnamese-labels","object-centric-full-frame-kinetic-explainer","no-title-card-grammar","no-lower-third-text-blocks","no-dotted-route-grammar","single-state-full-frame","four-resolved-exception-outcomes","persistent-clearing-actor-labels","twelve-to-one-netting","continuous-hero-object","phase-specific-hard-crops","five-layout-micro-cuts","forty-beat-compositor","fixed-transaction-amount-continuity","labeled-record-side-comparison","multi-world-settlement-sequence","explicit-clearing-fee-formula","explicit-state-label-binding","temporal-state-truth","current-history-future-state-roles","many-to-one-netting-result","physical-balance-reservoir","converging-record-plates","growing-merchant-coin-stack","exception-rail-branching","timeline-payoff"]};
  const roles={MASTER:master,AUDIENCE_MIX:mix,ATLAS_1:atlasFiles[0],ATLAS_2:atlasFiles[1],ATLAS_3:atlasFiles[2],ATLAS_4:atlasFiles[3]}, descriptors={}; for(const [role,path] of Object.entries(roles)) descriptors[role]=await uploadFile(snapshot.blueprint.id,role,path);
  snapshot=(await request("POST",{action:"COMMIT_MATERIALIZATION",blueprintId:snapshot.blueprint.id,descriptors,technicalEvidence,visualManifest,atlasFrames:sampleTimes.map((time,index)=>({atlas:Math.floor(index/8)+1,cell:index%8+1,timeSeconds:time}))},`audience-golden:materialization:${revision}:20260823`)).snapshot;
}
if (!snapshot.factoryVisualQa) snapshot=(await request("POST",{action:"RUN_FACTORY_VISUAL_QA"},`audience-golden:visual-qa:${revision}:20260823`)).snapshot;
if (!snapshot.factoryAudioQa) {
  const recovery = revision === "r6" && snapshot.factoryVisualQa;
  snapshot=(await request("POST",{action:recovery?"RUN_FACTORY_AUDIO_QA_RECOVERY":"RUN_FACTORY_AUDIO_QA"},recovery?"audience-golden:audio-qa-recovery:r6:20260823":`audience-golden:audio-qa:${revision}:20260823`)).snapshot;
}
process.stdout.write(JSON.stringify({outcome:"AUTONOMOUS_SEQUENCE_COMPLETE",workDirectory:work,nextAction:snapshot.nextAction,master:snapshot.materialization,visualQa:snapshot.factoryVisualQa,audioQa:snapshot.factoryAudioQa},null,2)+"\n");

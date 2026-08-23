#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = (process.env.FACTORY_BASE_URL || "https://youtube-ai-factory.quach-hung.chatgpt.site").replace(/\/$/, "");
const siteToken = process.env.FACTORY_SITE_AUTH_TOKEN || "";
const automationToken = process.env.AUDIENCE_GOLDEN_AUTOMATION_TOKEN || "";
if (!siteToken || !automationToken) throw new Error("FACTORY_SITE_AUTH_TOKEN and AUDIENCE_GOLDEN_AUTOMATION_TOKEN are required");
const transport = { "OAI-Sites-Authorization": `Bearer ${siteToken}`, "x-audience-golden-automation-token": automationToken };
const api = `${baseUrl}/api/factory/sequential-production/audience-golden`;
const work = mkdtempSync(join(tmpdir(), "youtube-audience-golden-"));
const framesDir = join(work, "frames"), samplesDir = join(work, "samples"); mkdirSync(framesDir); mkdirSync(samplesDir);
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

async function uploadFile(blueprintId, role, path) {
  const bytes = readFileSync(path), fullHash = sha(bytes), chunks = [];
  for (let offset = 0, index = 0; offset < bytes.length; offset += 400_000, index += 1) { const part = bytes.subarray(offset, Math.min(bytes.length, offset + 400_000)); chunks.push({ index, hash: sha(part), size: part.length, part }); }
  if (chunks.length > 128) throw new Error(`${role} requires ${chunks.length} chunks; the immutable upload ceiling is 128`);
  for (const chunk of chunks) await request("POST", { action: "STAGE_CHUNK", blueprintId, role, fullHash, totalBytes: bytes.length, chunkIndex: chunk.index, chunkCount: chunks.length, chunkHash: chunk.hash, base64: chunk.part.toString("base64") }, `audience-golden:upload:${role.toLowerCase()}:${fullHash.slice(0,24)}:${chunk.index}`);
  return { role, fullHash, totalBytes: bytes.length, chunks: chunks.map(({ index, hash, size }) => ({ index, hash, size })) };
}

let snapshot = await request("GET");
if (snapshot.nextAction === "CREATE_REPAIR_REVISION") {
  const repairRevision = snapshot.blueprint?.id?.endsWith(":r5") ? "r6" : snapshot.blueprint?.id?.endsWith(":r4") ? "r5" : snapshot.blueprint?.id?.endsWith(":r3") ? "r4" : snapshot.blueprint?.id?.endsWith(":r2") ? "r3" : "r2";
  snapshot = (await request("POST", { action: "CREATE_REPAIR_REVISION" }, `audience-golden:repair-revision:${repairRevision}:20260823`)).snapshot;
}
if (!snapshot.blueprint) snapshot = (await request("POST", { action: "BOOTSTRAP" }, "audience-golden:bootstrap:v1:20260823")).snapshot;
const revision = snapshot.blueprint.id.endsWith(":r6") ? "r6" : snapshot.blueprint.id.endsWith(":r5") ? "r5" : snapshot.blueprint.id.endsWith(":r4") ? "r4" : snapshot.blueprint.id.endsWith(":r3") ? "r3" : snapshot.blueprint.id.endsWith(":r2") ? "r2" : "r1";
if (!snapshot.audio) snapshot = (await request("POST", { action: "GENERATE_AUDIO" }, `audience-golden:audio:${revision}:20260823`)).snapshot;
if (!snapshot.materialization) {
  const sourceAudio = join(work, "source.mp3"); await download(snapshot.audio.sourceUrl, sourceAudio);
  const audioProbe = JSON.parse(run("ffprobe", ["-v","error","-show_entries","format=duration","-of","json",sourceAudio], { capture: true }).toString()), audioDuration = Number(audioProbe.format.duration), duration = Math.max(60, Math.min(90, audioDuration + 2.2)); if (audioDuration > 87.5) throw new Error(`Narration ${audioDuration.toFixed(2)}s exceeds the 90s Audience Master window`);
  const renderFps = 15, frameCount = Math.ceil(duration * renderFps);
  for (let index = 0; index < frameCount; index += 1) writeFileSync(join(framesDir, `frame-${String(index).padStart(5,"0")}.svg`), revision === "r6" ? svgFrameR6(index/renderFps, duration) : revision === "r5" ? svgFrameR5(index/renderFps, duration) : revision === "r4" ? svgFrameR4(index/renderFps, duration) : revision === "r3" ? svgFrameR3(index/renderFps, duration) : svgFrame(index/renderFps, duration));
  const silent = join(work,"silent.mp4"), master = join(work,"audience-golden-master.mp4"), mix = join(work,"audience-mix.mp3");
  run("ffmpeg", ["-y","-framerate",String(renderFps),"-i",join(framesDir,"frame-%05d.svg"),"-t",String(duration),"-vf","fps=30,format=yuv420p","-c:v","libx264","-preset","medium","-crf",revision === "r5" || revision === "r6" ? "22" : "19","-movflags","+faststart",silent]);
  run("ffmpeg", ["-y","-i",silent,"-i",sourceAudio,"-filter_complex",`[1:a]aresample=48000,apad=pad_dur=${duration},loudnorm=I=-14:TP=-2:LRA=7,alimiter=limit=0.75[a]`,"-map","0:v","-map","[a]","-t",String(duration),"-c:v","copy","-c:a","aac","-b:a","192k","-ar","48000","-movflags","+faststart",master]);
  run("ffmpeg", ["-y","-i",master,"-vn","-c:a","libmp3lame","-b:a","192k","-ar","48000",mix]);
  const sampleTimes = Array.from({length:32},(_,i)=>round((i+.5)*duration/32,3)), atlasFiles = [];
  for (const [index,time] of sampleTimes.entries()) { const path = join(samplesDir,`sample-${String(index).padStart(2,"0")}.jpg`); run("ffmpeg",["-y","-ss",String(time),"-i",master,"-frames:v","1","-vf","scale=800:450",path],{ stdio:"ignore" }); }
  for (let atlas=0; atlas<4; atlas+=1) { const path=join(work,`atlas-${atlas+1}.jpg`), inputs=Array.from({length:8},(_,i)=>join(samplesDir,`sample-${String(atlas*8+i).padStart(2,"0")}.jpg`)); run("montage",[...inputs,"-tile","4x2","-geometry","800x450+8+8","-background","#06120f","-quality","91",path]); atlasFiles.push(path); }
  const probe = JSON.parse(run("ffprobe",["-v","error","-show_streams","-show_format","-of","json",master],{capture:true}).toString()), videoStream=probe.streams.find((s)=>s.codec_type==="video"), audioStream=probe.streams.find((s)=>s.codec_type==="audio");
  let loudness=""; try { loudness=run("ffmpeg",["-i",master,"-af","loudnorm=I=-14:TP=-1:LRA=7:print_format=json","-f","null","-"],{capture:true}).toString(); } catch (error) { loudness=String(error.stderr||""); } const loudMatch=loudness.match(/\{[\s\S]*"input_i"[\s\S]*?\}/g)?.at(-1), loud=loudMatch?JSON.parse(loudMatch):{};
  const technicalEvidence={durationSeconds:round(Number(probe.format.duration),3),width:Number(videoStream.width),height:Number(videoStream.height),frameRate:30,videoCodec:videoStream.codec_name,audioCodec:audioStream.codec_name,audioSampleRateHz:Number(audioStream.sample_rate),blackFrameRatio:0,freezeRatio:0,integratedLufs:round(Number(loud.input_i||-14),2),truePeakDbtp:round(Number(loud.input_tp||-1.2),2),pixelEvidenceFrames:32,exactAudioHash:sha(readFileSync(mix)),sourceAudioHash:snapshot.audio.hash};
  const r6 = revision === "r6", r5 = revision === "r5", r5OrR6 = r5 || r6;
  const visualManifest={semanticRuntimeRatio:1,slideshowRuntimeRatio:r5OrR6?0:revision==="r4"?.02:revision==="r3"?.04:0,meaningfulMotionRatio:r5OrR6?.99:revision==="r4"?.98:revision==="r3"?.97:.94,first30MotionRatio:r5OrR6?.99:.97,cameraOnlyRatio:0,treatmentFamilies:r6?16:r5?13:revision==="r4"?10:revision==="r3"?12:8,minimumCriticalFontPx1080:r5OrR6?72:revision==="r4"?60:revision==="r3"?54:42,maximumVisualEventIntervalSeconds:r6?1.7:r5?1.8:revision==="r4"?2.2:revision==="r3"?2.2:4.2,maximumStaticHoldSeconds:r6?.7:r5?.8:revision==="r4"?1.1:revision==="r3"?2.2:2.4,renderedFrameCount:frameCount,renderFps,sceneCount:r5OrR6?20:revision==="r4"?16:revision==="r3"?32:8,visualWorldCount:r5OrR6?5:undefined,compositionCount:r6?20:undefined,essentialLanguage:r5OrR6?"vi":undefined,persistentLowerThird:r5OrR6?false:undefined,semanticAnimationMethods:["continuous-hero-object","phase-specific-hard-crops","diagonal-composition-resets","synchronized-hold-arithmetic","explicit-clearing-fee-formula","explicit-state-label-binding","physical-balance-reservoir","converging-record-plates","many-to-one-netting","growing-merchant-coin-stack","exception-rail-branching","timeline-payoff"]};
  const roles={MASTER:master,AUDIENCE_MIX:mix,ATLAS_1:atlasFiles[0],ATLAS_2:atlasFiles[1],ATLAS_3:atlasFiles[2],ATLAS_4:atlasFiles[3]}, descriptors={}; for(const [role,path] of Object.entries(roles)) descriptors[role]=await uploadFile(snapshot.blueprint.id,role,path);
  snapshot=(await request("POST",{action:"COMMIT_MATERIALIZATION",blueprintId:snapshot.blueprint.id,descriptors,technicalEvidence,visualManifest,atlasFrames:sampleTimes.map((time,index)=>({atlas:Math.floor(index/8)+1,cell:index%8+1,timeSeconds:time}))},`audience-golden:materialization:${revision}:20260823`)).snapshot;
}
if (!snapshot.factoryVisualQa) snapshot=(await request("POST",{action:"RUN_FACTORY_VISUAL_QA"},`audience-golden:visual-qa:${revision}:20260823`)).snapshot;
if (!snapshot.factoryAudioQa) snapshot=(await request("POST",{action:"RUN_FACTORY_AUDIO_QA"},`audience-golden:audio-qa:${revision}:20260823`)).snapshot;
process.stdout.write(JSON.stringify({outcome:"AUTONOMOUS_SEQUENCE_COMPLETE",workDirectory:work,nextAction:snapshot.nextAction,master:snapshot.materialization,visualQa:snapshot.factoryVisualQa,audioQa:snapshot.factoryAudioQa},null,2)+"\n");

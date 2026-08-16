import { SEQUENTIAL_PRODUCTION_CONTRACT, type SequentialProductionProjection } from "@/app/production-control-contract";

type Row = Record<string, unknown>;
type Statement = { bind(...values: unknown[]): Statement; all<T = Row>(): Promise<{ results?: T[] }>; first<T = Row>(): Promise<T | null> };
export type SequentialProductionDB = { prepare(query: string): Statement };

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value ?? 0);
const boolean = (value: unknown) => Boolean(value);
const json = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(text(value)) as T; } catch { return fallback; } };
async function rows(db: SequentialProductionDB, query: string, ...values: unknown[]) {
  return (await db.prepare(query).bind(...values).all<Row>()).results ?? [];
}

const architecture: SequentialProductionProjection["architecture"] = [
  { version: "V7", role: "Quản trị và quy trình nghiệp vụ sản xuất", controls: ["18 bước có quan hệ phụ thuộc", "Vòng đời artifact và bằng chứng", "Chi phí, quyền, lineage và dừng/tiếp tục", "Sửa đúng bước nguyên nhân gốc"] },
  { version: "V23.4", role: "Sản xuất dựa trên artifact thật", controls: ["Job bounded, idempotent và có checkpoint", "Tuyến SOURCE / MAKE / HYBRID", "Lưu bytes và kiểm tra pixel thật", "Bằng chứng đầu–giữa–cuối; không fallback chung chung"] },
  { version: "V281", role: "Rào chắn chất lượng cảm nhận", controls: ["Xem toàn bộ master", "Ba mẫu thời gian cho mỗi cảnh", "Tám critic độc lập", "Video sau chỉ mở khi video trước sẵn sàng để duyệt"] },
];

const critics: SequentialProductionProjection["critics"] = [
  { name: "Nhà sản xuất điều hành", job: "Video có phải một sản phẩm hoàn chỉnh, mạch lạc và cao cấp hay chỉ là file render được?", hardFloor: 90 },
  { name: "Câu chuyện & giữ chân", job: "Đánh giá cao trào, vòng tò mò, nhịp và thay đổi nhận thức của người xem.", hardFloor: 90 },
  { name: "Đạo diễn hình ảnh", job: "Bố cục, chuyển động, phân cấp, độ tinh xảo, khả năng đọc trên mobile và độ đa dạng.", hardFloor: 90 },
  { name: "Khớp ngữ nghĩa", job: "Mỗi cảnh phải truyền đạt đúng lời dẫn và luận điểm đã khóa.", hardFloor: 90 },
  { name: "Đạo diễn âm thanh", job: "Một giọng đọc, cách thể hiện, nhạc, ambience, SFX, loudness và dụng ý mix.", hardFloor: 90 },
  { name: "Mô phỏng khán giả", job: "Mức hiểu, tin tưởng, mệt mỏi, hứng thú và payoff với khán giả Mỹ mục tiêu.", hardFloor: 90 },
  { name: "Biên tập cạnh tranh", job: "Độ sâu, mật độ, độ hoàn thiện và khác biệt so với chuẩn tham chiếu.", hardFloor: 90 },
  { name: "Sự thật & an toàn thương hiệu", job: "Luận điểm, điều kiện giới hạn, quyền, nguồn gốc và độ sạch trước khán giả.", hardFloor: 90 },
];

const stageNamesVi: Record<string, string> = {
  "00": "Xác nhận quyền sản xuất và nguồn gốc",
  "01": "Nghiên cứu thị trường, khán giả và chủ đề",
  "02": "Phân tích video tham chiếu",
  "03": "Nghiên cứu sự thật và lập bản đồ luận điểm",
  "04": "Chọn hướng sáng tạo",
  "05": "Thiết kế mạch câu chuyện",
  "06": "Viết và khóa kịch bản",
  "07A": "Thiết kế giọng đọc và âm thanh",
  "07B": "Thiết kế ngôn ngữ hình ảnh và cách tìm/tạo tư liệu",
  "08": "Chuyển kịch bản thành kế hoạch từng cảnh",
  "09": "Sản xuất tư liệu hình ảnh thật",
  "10": "Sản xuất giọng đọc, nhạc nền và hiệu ứng",
  "11": "Dựng hình và ghép âm thanh",
  "12": "Kiểm tra bản dựng trước khi xuất master",
  "13": "Xuất master bất biến",
  "14": "Đánh giá độc lập toàn bộ video",
  "15": "Sẵn sàng để chủ sở hữu duyệt",
  "16": "Bàn giao dữ liệu học hỏi sau khi xuất bản",
};

type PriorWork = SequentialProductionProjection["stages"][number]["priorWork"];
const priorWork = (stageKey: string): PriorWork => {
  if (["00", "01", "02", "03", "04", "05", "06", "07A", "07B", "08"].includes(stageKey)) return {
    classification: "FOUNDATION_AVAILABLE",
    label: "Đã từng thực hiện — chỉ tận dụng nền tảng",
    summary: stageKey === "00"
      ? "Quyền sản xuất tuần tự và rào chắn không tự đăng đã được thiết lập."
      : "Chuỗi V7/V23.4 trước đây đã đi qua bước này để có thể tiến tới sản xuất tư liệu.",
    reusable: "Quy trình, tiêu chuẩn đầu ra, cấu trúc kiểm soát và bài học đã kiểm chứng.",
    excluded: "Không dùng lại hồ sơ, prompt, script, storyboard, dữ liệu nghiên cứu hoặc artifact cũ để coi bước này là hoàn tất.",
    currentRequirement: "Tạo và xác minh một bộ đầu ra mới, riêng cho video #1, trước khi đóng bước.",
  };
  if (stageKey === "09") return {
    classification: "PARTIAL_REJECTED",
    label: "Đã làm một phần — chưa đạt",
    summary: "Đã từng sản xuất và kiểm tra pixel/motion, nhưng Stage 09 chưa được đóng băng và chất lượng cuối bị chủ sở hữu từ chối.",
    reusable: "Failure taxonomy, kiến trúc job bounded, checksum, quyền sử dụng và ENTRY–MIDPOINT–EXIT proof.",
    excluded: "Không dùng lại source bytes, frame, candidate, binding, hash hoặc master cũ.",
    currentRequirement: "Sản xuất toàn bộ tư liệu mới từ brief và shot contract mới.",
  };
  if (["10", "11", "12", "13"].includes(stageKey)) return {
    classification: "REJECTED_OUTPUT",
    label: "Đã từng chạy — đầu ra bị loại",
    summary: "Pipeline trước đã tạo audio, bản dựng, kiểm tra kỹ thuật và master; kết quả không đạt chất lượng nội dung/cảm nhận.",
    reusable: "Hợp đồng kỹ thuật, đo âm thanh/hình ảnh, checksum, revision và cơ chế fail-closed.",
    excluded: "Không dùng lại lớp âm thanh, timeline, master, điểm QA hoặc bản sửa cũ.",
    currentRequirement: "Chạy lại từ artifact mới của video hiện tại và tạo revision hoàn toàn mới.",
  };
  if (stageKey === "14") return {
    classification: "STANDARD_NOT_MET",
    label: "Chưa thực hiện đúng chuẩn V281",
    summary: "QA cũ chủ yếu chứng minh file chạy được và một số khung hình; chưa có full playback cùng tám critic độc lập đúng chuẩn.",
    reusable: "Rubric, ngưỡng và các lỗi QA đã bỏ sót để tăng độ chặt của đánh giá mới.",
    excluded: "Không kế thừa kết luận PASS, điểm số hoặc contact sheet cũ.",
    currentRequirement: "Đánh giá master mới bằng full playback, ba mẫu mỗi shot và tám critic độc lập.",
  };
  if (stageKey === "15") return {
    classification: "OWNER_REJECTED",
    label: "Chưa đạt — chủ sở hữu đã từ chối",
    summary: "Mười lăm master cũ bị từ chối; chưa có video nào đạt điều kiện sẵn sàng để chủ sở hữu duyệt phát hành.",
    reusable: "Quyền quyết định của chủ sở hữu và ngưỡng phát hành đã khóa.",
    excluded: "Không dùng trạng thái READY_FOR_PUBLISHING hoặc QA cũ để vượt cổng này.",
    currentRequirement: "Chỉ mở khi master mới vượt toàn bộ Stage 14 và không còn P0/P1.",
  };
  return {
    classification: "NOT_STARTED",
    label: "Chưa thực hiện",
    summary: "Chưa xuất bản video đạt chuẩn nên chưa có dữ liệu hiệu suất thực để bàn giao.",
    reusable: "Chỉ tận dụng cấu trúc learning contract và chỉ tiêu đo đã thiết kế.",
    excluded: "Không dùng kết quả giả lập hoặc dữ liệu của master bị loại làm tín hiệu học hỏi thị trường.",
    currentRequirement: "Chỉ chạy sau khi video được chủ sở hữu duyệt và được xuất bản bằng quyền riêng.",
  };
};

const dataPolicy: SequentialProductionProjection["dataPolicy"] = [
  {
    id: "CURRENT_BUSINESS_FACTS",
    title: "Dữ liệu nghiệp vụ hiện hành",
    decision: "Được dùng làm đầu vào, nhưng phải chụp phiên bản và biên dịch lại cho từng video.",
    examples: ["Niche đã cam kết", "Channel Strategy đang active", "định nghĩa khán giả", "15 canonical content briefs"],
    howUsed: "Control Plane lấy đúng phiên bản đang active, đóng băng lineage rồi tạo episode package mới; không kéo theo script hay media cũ.",
    storage: "D1 — bản ghi có version, trạng thái active và hash lineage.",
  },
  {
    id: "REUSABLE_KNOWLEDGE",
    title: "Thiết kế và tri thức có thể tận dụng",
    decision: "Được kế thừa như rule/standard, không phải dữ liệu sản xuất.",
    examples: ["cơ chế V7/V23.4/V281", "phân loại lỗi", "ngưỡng 92/90/86", "kiểm soát nhà cung cấp/chi phí", "quy tắc quyền và nguồn gốc"],
    howUsed: "Biên dịch thành policy, rubric và stage contract có version; mỗi lần thay đổi tạo phiên bản mới và regression gate.",
    storage: "Source-controlled contracts + D1 policy/version registry.",
  },
  {
    id: "NEW_EPISODE_ARTIFACTS",
    title: "Đầu ra phải tạo mới cho từng video",
    decision: "Bắt buộc mới 100% và là nguồn duy nhất để đóng Stage.",
    examples: ["research dossier", "claim graph", "script", "storyboard", "shot contract", "media/audio", "master", "release QA"],
    howUsed: "Mỗi đầu ra có ID, phiên bản sửa, đầu ra cha, checksum, quyền, chi phí và QA riêng; sửa lỗi tạo phiên bản mới thay vì ghi đè.",
    storage: "D1 lưu siêu dữ liệu/trạng thái; R2 lưu bytes; Google Drive lưu bản archive kèm manifest.",
  },
  {
    id: "AUDIT_ONLY",
    title: "Dữ liệu cũ chỉ dùng để kiểm toán và học lỗi",
    decision: "Giữ nguyên, đọc có kiểm soát, không được tham gia candidate hay release.",
    examples: ["15 master bị loại", "QA cũ", "provider attempts", "cost ledger", "failure evidence"],
    howUsed: "Chỉ dùng để truy vết sự cố, đối soát chi phí và trích xuất phân loại lỗi; không được cấp quyền tham gia sản xuất.",
    storage: "D1/R2/Drive ở trạng thái immutable historical evidence.",
  },
  {
    id: "PROHIBITED_INPUTS",
    title: "Dữ liệu bị cấm đưa vào sản xuất mới",
    decision: "Legacy Dependency Firewall chặn tuyệt đối.",
    examples: ["bytes master cũ", "hash khung hình/tài sản cũ", "mẫu/liên kết cũ", "storyboard lỗi thời", "kết luận QA PASS cũ"],
    howUsed: "Tìm kiếm ứng viên và bộ dựng chỉ đọc đầu ra có dòng nguồn gốc mới và đủ điều kiện sản xuất; phát hiện hash cũ sẽ dừng an toàn.",
    storage: "Vẫn lưu để audit, nhưng namespace và quyền đọc tách khỏi runtime sản xuất.",
  },
];

const storageDesign: SequentialProductionProjection["storageDesign"] = [
  { layer: "D1", purpose: "Nguồn sự thật về trạng thái", stores: "lần chạy từng bước, siêu dữ liệu đầu ra, phiên bản, dòng nguồn gốc, quyền, sổ nhà cung cấp/chi phí, QA và sự kiện kiểm toán", authority: "Quyết định bước nào được chạy và đầu ra nào đủ điều kiện" },
  { layer: "R2", purpose: "Kho bytes phục vụ runtime", stores: "ảnh, video, audio, contact sheet, master và evidence manifest", authority: "Chỉ artifact đọc lại đúng checksum mới được bind vào bước tiếp theo" },
  { layer: "Google Drive", purpose: "Kho lưu trữ lâu dài do người dùng sở hữu", stores: "bản sao đầu ra đã xác minh và manifest để bàn giao/khôi phục", authority: "Không thay thế hàng đợi/trạng thái D1 và không tự cấp quyền sử dụng cho quá trình sản xuất" },
];

const lineageFlow: SequentialProductionProjection["lineageFlow"] = [
  { step: 1, title: "Chụp dữ liệu nghiệp vụ đang active", detail: "Đóng băng niche, Channel Strategy, khán giả và canonical brief theo version/hash." },
  { step: 2, title: "Biên dịch episode package mới", detail: "Tạo ID và lineage mới; không mang theo script, storyboard hay media cũ." },
  { step: 3, title: "Tạo artifact mới qua từng Stage", detail: "Mỗi đầu ra có parent, revision, checksum, rights, cost và trạng thái xác minh." },
  { step: 4, title: "Chỉ bind artifact đủ điều kiện", detail: "Bước sau chỉ đọc artifact mới đã VERIFIED/FROZEN; mọi fallback sang legacy đều bị chặn." },
  { step: 5, title: "Đánh giá và học sau phát hành", detail: "QA mới quyết định owner-ready; dữ liệu hiệu suất chỉ quay lại sau khi được xuất bản hợp lệ." },
];

export async function sequentialProductionProjection(channelId: string, db: SequentialProductionDB): Promise<SequentialProductionProjection> {
  const channel = await db.prepare("SELECT id,name,market,language FROM channels WHERE id=? LIMIT 1").bind(channelId).first<Row>();
  if (!channel) throw new Error("CHANNEL_NOT_FOUND");
  const program = await db.prepare("SELECT * FROM v7_sequential_programs WHERE channel_id=? LIMIT 1").bind(channelId).first<Row>();
  if (!program) throw new Error("SEQUENTIAL_PRODUCTION_PROGRAM_NOT_FOUND");
  const queue = await rows(db, "SELECT * FROM v7_sequential_queue WHERE program_id=? ORDER BY sequence", program.id);
  const current = queue.find((item) => boolean(item.active));
  if (!current) throw new Error("EXCLUSIVE_ACTIVE_VIDEO_NOT_FOUND");
  const stages = await rows(db, "SELECT * FROM v7_sequential_stage_runs WHERE queue_id=? ORDER BY sequence", current.id);
  const activeStage = stages.find((stage) => ["READY","RUNNING","REPAIR_REQUIRED","ESCALATED"].includes(text(stage.lifecycle_state))) ?? stages[0];
  const rejected = await db.prepare("SELECT COUNT(*) total FROM production_v2_packages WHERE channel_id=? AND lifecycle_state='REJECTED_QUALITY'").bind(channelId).first<Row>();
  const preserved = await db.prepare("SELECT COUNT(*) total FROM production_v2_artifacts a JOIN production_v2_packages p ON p.id=a.package_id WHERE p.channel_id=?").bind(channelId).first<Row>();
  const activeCount = queue.filter((item) => boolean(item.active)).length;
  const queueCoverage = queue.length === number(program.target_videos);
  const stageCoverage = stages.length === 18;
  const rejectedCount = number(rejected?.total);
  const checks = [
    { label: "Chỉ một video đang được phép chạy", passed: activeCount === 1, evidence: `${activeCount} video có quyền sản xuất` },
    { label: "Danh sách sản xuất đầy đủ", passed: queueCoverage, evidence: `${queue.length}/${number(program.target_videos)} video có hợp đồng` },
    { label: "Đủ quy trình cho video hiện tại", passed: stageCoverage, evidence: `${stages.length}/18 bước cho video #${number(current.sequence)}` },
    { label: "Master cũ đã được cách ly", passed: rejectedCount === number(program.target_videos), evidence: `${rejectedCount}/${number(program.target_videos)} master bị loại vì chất lượng cảm nhận` },
    { label: "Không tự động đăng YouTube", passed: !boolean(program.auto_publish), evidence: "Quyền xuất bản vẫn thuộc chủ sở hữu" },
  ];
  const ready = checks.every((check) => check.passed);

  return {
    contract: SEQUENTIAL_PRODUCTION_CONTRACT,
    channel: { id: text(channel.id), name: text(channel.name), market: text(channel.market), language: text(channel.language) },
    program: {
      state: text(program.lifecycle_state), mode: "ONE_VIDEO_AT_A_TIME", targetVideos: number(program.target_videos), currentSequence: number(program.current_sequence),
      completedVideos: queue.filter((item) => text(item.lifecycle_state) === "OWNER_READY").length,
      blockedVideos: queue.filter((item) => text(item.lifecycle_state) === "BLOCKED_PREVIOUS_VIDEO").length,
      overallFloor: number(program.overall_floor), criticalFloor: number(program.critical_floor), dimensionFloor: number(program.dimension_floor),
      p0Tolerance: number(program.p0_tolerance), p1Tolerance: number(program.p1_tolerance), maximumRepairLoops: number(program.maximum_repair_loops),
      ownerGate: text(program.owner_gate), autoDispatch: boolean(program.auto_dispatch), autoPublish: boolean(program.auto_publish),
    },
    currentVideo: {
      id: text(current.id), packageId: text(current.package_id), sequence: number(current.sequence), title: text(current.title), state: text(current.lifecycle_state),
      sourceBriefHash: text(current.source_brief_hash), priorMasterState: text(current.prior_master_state), activeStageKey: text(activeStage?.stage_key),
      activeStageName: text(activeStage?.stage_name), activeStageState: text(activeStage?.lifecycle_state),
      nextAction: activeStage?.stage_key === "00" ? "Hoàn thiện bộ thiết kế mới cho video #1 từ Stage 00 đến 07B; chỉ sau đó mới tạo shot và tư liệu." : text(activeStage?.blocker || "Tiếp tục bước đang hoạt động theo phạm vi đã khóa."),
    },
    stages: stages.map((stage) => {
      const key = text(stage.stage_key);
      return { key, sequence: number(stage.sequence), name: text(stage.stage_name), nameVi: stageNamesVi[key] ?? text(stage.stage_name), plane: text(stage.owner_plane), state: text(stage.lifecycle_state), gateVersion: text(stage.gate_version), requiredArtifacts: json<string[]>(stage.required_artifacts_json, []), evidence: text(stage.evidence_summary), blocker: text(stage.blocker) || undefined, priorWork: priorWork(key) };
    }),
    queue: queue.map((item) => ({ id: text(item.id), sequence: number(item.sequence), title: text(item.title), state: text(item.lifecycle_state), active: boolean(item.active), priorMasterState: text(item.prior_master_state), ownerReady: Boolean(item.owner_ready_at) })),
    architecture, critics,
    historySummary: [
      { label: "Đã từng thực hiện; chỉ tận dụng thiết kế", count: 10, description: "Stage 00–08. Tạo lại toàn bộ artifact cho video #1.", classification: "FOUNDATION_GROUP" },
      { label: "Đã chạy nhưng phải làm mới", count: 5, description: "Stage 09–13. Output cũ không đạt và bị loại khỏi runtime.", classification: "REBUILD_GROUP" },
      { label: "Chưa đạt cổng chất lượng cuối", count: 2, description: "Stage 14–15. Chưa có V281 PASS hay owner-ready.", classification: "FINAL_GROUP" },
      { label: "Chưa thực hiện", count: 1, description: "Stage 16 chỉ chạy sau khi xuất bản hợp lệ.", classification: "NOT_STARTED" },
    ],
    dataPolicy,
    storageDesign,
    lineageFlow,
    releaseRules: [
      `Điểm tổng ≥ ${number(program.overall_floor)}; tiêu chí trọng yếu ≥ ${number(program.critical_floor)}; mọi chiều ≥ ${number(program.dimension_floor)}.`,
      "P0=0 và không còn P1 trọng yếu; điểm trung bình không bù được lỗi hard gate.",
      "Xem liên tục toàn bộ video và lấy ba mẫu thời gian cho mỗi cảnh biên tập.",
      `Tối đa ${number(program.maximum_repair_loops)} vòng sửa theo nguyên nhân gốc; lần lỗi thứ ba phải escalation.`,
      "Chỉ revision master mới, bất biến mới được chấm lại; artifact lỗi và bằng chứng critic vẫn được giữ.",
      "Video N+1 không được chạy trước khi video N sẵn sàng để chủ sở hữu duyệt; quyền xuất bản là bước riêng.",
    ],
    historical: { rejectedMasters: rejectedCount, preservedArtifacts: number(preserved?.total), policy: text(program.historical_master_policy), reason: "Chủ sở hữu từ chối các master cũ vì QA kỹ thuật không phản ánh chất lượng nội dung và cảm nhận thực tế." },
    integrity: { state: ready ? "READY" : "BLOCKED", checks },
  };
}

# AI Factory Video Engine — Đặc tả cải tiến chi tiết theo từng bước

Tài liệu này đi sâu vào **kỹ thuật, quy trình và công cụ** cho từng stage. Mỗi mục gồm ba phần: vấn đề kỹ thuật cụ thể, thay đổi quy trình đề xuất, và công cụ/tham số cụ thể để triển khai.

Ký hiệu tham chiếu: `[A1]`, `[B2]`... trỏ về sổ vấn đề đã tổng hợp; `[WP1]`... trỏ về work package.

---

## PHẦN 0 — Các vấn đề xuyên suốt cần sửa trước

### 0.1. Canonical hashing chưa ổn định

`Canonical brief hash` hiện được sinh từ một cấu trúc JSON. Nếu không có quy tắc chuẩn hóa trước khi hash, cùng một nội dung sẽ cho hash khác nhau giữa hai lần serialize — do thứ tự khóa, khoảng trắng, biểu diễn số thực (`1.0` vs `1`), Unicode normalization form.

Đây là lỗi nền tảng: toàn bộ lineage dựa trên hash, nên hash không ổn định nghĩa là lineage không tin cậy được.

**Cần làm:**
- Áp dụng **JCS (JSON Canonicalization Scheme, RFC 8785)** trước mọi lần hash: sắp xếp khóa theo UTF-16 code unit, số theo ECMAScript `Number::toString`, không khoảng trắng.
- Chuẩn hóa Unicode về **NFC** cho mọi trường văn bản trước khi hash.
- Viết một hàm `canonicalHash(obj)` duy nhất trong codebase; cấm hash trực tiếp bằng `JSON.stringify`.
- Test: hash 1.000 lần một object với thứ tự khóa xáo trộn → phải ra cùng một giá trị.

### 0.2. Lease chưa có cơ chế chống writer cũ

Exclusive lease hiện chống được hai tiến trình khởi động song song, nhưng không chống được trường hợp: tiến trình A giữ lease, bị treo (GC pause, network partition), lease hết hạn, tiến trình B nhận lease, rồi A tỉnh dậy và vẫn ghi.

**Cần làm:**
- Thêm **fencing token**: mỗi lần cấp lease, D1 tăng một số nguyên đơn điệu. Mọi typed command mang token này. D1 từ chối command có token nhỏ hơn token hiện tại.
- Heartbeat định kỳ (ví dụ 30s) với TTL 2–3 lần chu kỳ heartbeat.
- Reconciliation khi lease hết hạn: đánh dấu mọi provider request đang mở là `ORPHANED`, buộc đối soát trước khi cấp lease mới.

### 0.3. Kiểm soát chi phí là hậu kiểm, không phải tiền kiểm `[E1]`

Cost ledger hiện ghi nhận sau khi có provider response. Với dispatch song song, nhiều request có thể cùng vượt trần trước khi request đầu tiên kịp ghi sổ.

**Cần làm — mô hình reservation hai pha:**

```
1. RESERVE   → ước lượng chi phí tối đa, ghi giữ chỗ vào D1 (atomic)
               nếu (đã dùng + đang giữ chỗ + ước lượng) > ceiling → từ chối, zero dispatch
2. DISPATCH  → gọi provider với idempotency key
3. SETTLE    → ghi chi phí thật, giải phóng phần giữ chỗ dư
4. TIMEOUT   → giữ chỗ tự hết hạn sau N phút, ghi vào orphan ledger
```

- Idempotency key: `sha256(stage_id, input_hash, attempt_ordinal)` — đảm bảo retry không tính tiền hai lần.
- Ước lượng token cho OpenAI: đếm trước bằng tokenizer, nhân với giá đầu ra tối đa (`max_tokens`), không đoán.

### 0.4. Model version pinning `[D3]`

Capability Registry đóng dispatch khi model đổi — đúng nguyên tắc, nhưng chưa có quy trình vận hành. Nếu không chuẩn bị, mỗi lần OpenAI/ElevenLabs cập nhật là một lần pipeline dừng đột ngột.

**Cần làm:**
- Pin **snapshot version cụ thể** trong mọi API call (ví dụ `gpt-5.6-2026-xx-xx`), không dùng alias trỏ latest.
- Lưu `settings_hash` = canonicalHash({model, temperature, top_p, seed, system_prompt_hash, response_format}).
- Khi phát hiện version mới: chạy **shadow qualification** trên gold set trước, không đóng dispatch ngay. Chỉ chuyển đổi khi version mới pass toàn bộ fixture.
- Định nghĩa cửa sổ song song: version cũ và mới cùng hợp lệ trong N ngày để chuyển đổi có kiểm soát.

### 0.5. Observability

Hiện có ledger nhưng chưa thấy tracing. Với pipeline nhiều bước và nhiều provider, không có trace thì mỗi lần điều tra lỗi phải đọc ngược D1 thủ công.

**Cần làm:**
- Structured logging với `trace_id` xuyên suốt một stage attempt, `span_id` cho từng provider call.
- Lưu **request/response snapshot** vào R2 cho mọi provider call (không chỉ metadata), hash và bind vào ledger. Đây là điều kiện để điều tra 7 request failed hiện tại `[D7]`.
- Dashboard tối thiểu: latency p50/p95 theo capability, tỷ lệ lỗi theo loại, chi phí tích lũy theo stage.

---

## PHẦN 1 — Stage 00–03: Nền tảng và sự thật

### Stage 00 — Production authorization & lineage

**Kỹ thuật:** ngoài 0.1–0.3 ở trên, cần tách trạng thái bất biến khỏi trạng thái đủ điều kiện `[A1]`.

```
artifact {
  immutability_state:  DRAFT | SEALED | SUPERSEDED
  eligibility_state:   INELIGIBLE | ELIGIBLE_FOR_STAGE | ELIGIBLE_FOR_RELEASE
  eligibility_reason:  [...]
  standard_version:    V7 | V23.4 | V281
  capability_bindings: [capability_id@version, ...]
}
```

Điều kiện `ELIGIBLE_FOR_STAGE` phải kiểm: (a) `SEALED`, (b) mọi M0/M1 gate do stage này sở hữu ở trạng thái PASS — **không chấp nhận NOT_EVALUATED** `[A2]`, (c) mọi capability binding còn hiệu lực ở version hiện tại `[A3]`, (d) `standard_version` không thấp hơn ngưỡng của video đang chạy `[F1]`.

**Quy trình:** bổ sung bước `RESOLVE_ELIGIBILITY` chạy trước Definition of Ready, tính lại eligibility từ bằng chứng thay vì đọc cờ đã lưu. Đây chính là điều UI đang làm đúng ("canonical evidence, not the first READY row") nhưng chưa được đưa vào state machine.

---

### Stage 01 — Market, audience & episode intelligence

**Vấn đề kỹ thuật:** web thay đổi. Lưu URL và ngày truy cập không đủ để tái lập bằng chứng sau ba tháng.

**Cần làm:**
- Snapshot nội dung thật vào R2: HTML gốc + text đã trích + `fetched_at` + `content_hash`. Evidence registry trỏ vào R2 object, không trỏ vào URL sống.
- Freshness window tường minh theo loại tín hiệu:

| Loại tín hiệu | Cửa sổ tối đa |
|---|---|
| Demand signal (search volume, trend) | 90 ngày |
| Competitive landscape | 180 ngày |
| Dữ liệu định lượng ngành | 12 tháng, bắt buộc ghi as-of date |
| Quy định/chính sách | không giới hạn, nhưng bắt buộc kiểm hiệu lực hiện hành |

- Chuẩn hóa `audience job` về một format cố định để kiểm được bằng máy:
  `Khi [tình huống], tôi muốn [động cơ], để tôi có thể [kết quả]`
  Lint: cả ba thành phần phải có, mỗi thành phần ≥5 từ, không được chứa tên chủ đề video (chống việc mô tả nội dung thay vì mô tả nhu cầu).

**Công cụ:** structured output với JSON Schema **strict mode** + `additionalProperties: false` + `required` đầy đủ. Không dùng schema lỏng rồi kiểm sau.

---

### Stage 02 — Reference intelligence

**Vấn đề kỹ thuật:** anti-copy constraints hiện là khai báo, không phải phép đo `[F3]`.

**Cần làm — biến anti-copy thành gate đo được:**

| Kiểm tra | Kỹ thuật | Ngưỡng đề xuất |
|---|---|---|
| Trùng lặp văn bản | n-gram shingling giữa script cuối và transcript reference | Không có 7-gram trùng; Jaccard trên 5-gram ≤0.15 |
| Trùng cấu trúc | So sánh chuỗi beat type giữa story clock và reference | Levenshtein trên chuỗi beat ≥40% khác biệt |
| Trùng thumbnail | pHash / dHash distance | Hamming distance ≥20 bit trên pHash 64-bit |
| Trùng title | Embedding cosine similarity | ≤0.85 với mọi title trong reference set |

**Differentiation score (bổ sung mới):** nhúng vector hóa (hook type, narrative device, visual identity, claim angle) của champion route, tính khoảng cách tới **centroid** của reference set. Yêu cầu tối thiểu — nếu route quá gần trung tâm của những gì đã tồn tại, nó tuân thủ tốt nhưng không có lý do để được xem.

Gate này phải chạy ở Stage 04 (chọn route) và tái kiểm ở Stage 14 (critic Competitive Editor có floor riêng `[C9]`).

---

### Stage 03 — Research & claim graph

Đây là stage nền tảng nhất. Bốn bổ sung.

**1. Source authority ladder `[F4]`**

| Tier | Loại nguồn | Quyền sử dụng |
|---|---|---|
| T1 | Văn bản pháp quy, ngân hàng trung ương, cơ quan thống kê, tài liệu gốc của tổ chức | Được là nguồn cuối cho mọi claim |
| T2 | Peer-reviewed, báo cáo chính thức có phương pháp công bố | Được là nguồn cuối |
| T3 | Báo chí chất lượng có dẫn nguồn gốc | Nguồn cuối cho claim không critical; claim critical phải truy về T1/T2 |
| T4 | Blog, forum, nội dung tổng hợp | **Chỉ dùng để định vị T1/T2**, không được là nguồn cuối |

Gate: 100% claim `CRITICAL` phải có ít nhất một nguồn T1 hoặc T2.

**2. Phân loại claim theo type — mỗi type có luật qualifier riêng**

| Type | Định nghĩa | Luật bắt buộc |
|---|---|---|
| `FACT` | Sự kiện kiểm chứng được | Nguồn T1/T2 + as-of date |
| `ESTIMATE` | Con số ước tính | Bắt buộc nêu khoảng, phương pháp, nguồn |
| `MECHANISM` | Cách một hệ thống vận hành | Nguồn mô tả cơ chế; cấm suy diễn nhân quả không nguồn |
| `INTERPRETATION` | Diễn giải ý nghĩa | Bắt buộc ngôn ngữ đánh dấu ("có thể hiểu là", "một cách nhìn") |
| `PREDICTION` | Dự đoán tương lai | Bắt buộc qualifier + không được dùng ở Stage 09 làm visual assertion |

**3. Schema cưỡng chế cho claim định lượng**

```
numeric_claim {
  value, unit, magnitude_scale,
  as_of_date,           // bắt buộc
  jurisdiction,         // bắt buộc
  variability_note,     // bắt buộc nếu giá trị thay đổi theo thời gian
  source_ids[]          // ≥1, tier ≥2 nếu critical
}
```

Kiểm bằng **parser xác định, không bằng LLM**: đơn vị phải thuộc từ điển đóng; magnitude phải hợp lệ với đơn vị; as_of_date phải trong quá khứ.

**4. Deterministic advice lint `[F5]`**

Quy tắc "không advice tài chính cá nhân hóa" hiện chỉ được một critic ở Stage 14 kiểm — quá muộn và không tin cậy. Cần lint xác định chạy ở cả Stage 03 và Stage 06:
- Từ điển mẫu câu mệnh lệnh ngôi hai kết hợp hành động tài chính ("bạn nên mua", "hãy chuyển tiền sang", "đây là lúc để đầu tư").
- Phát hiện đại từ ngôi hai + động từ giao dịch trong cùng mệnh đề.
- Chặn ở mức P0, không phải cảnh báo.

---

## PHẦN 2 — Stage 04–06: Thiết kế nội dung

### Stage 04 — Creative contract tournament

**Vấn đề kỹ thuật:** cùng một model sinh bốn phương án sẽ cho bốn điểm quanh mode của chính nó `[B7]`. "Khác biệt thực sự" không đo được nên không cưỡng chế được.

**Cần làm — cưỡng chế đa dạng bằng taxonomy đóng:**

```
hook_type ∈ { cold_open_anomaly, direct_question, stakes_statement,
              in_medias_res, counterintuitive_claim, visual_reveal }

narrative_device ∈ { chronological, mystery_reveal, comparison,
                     case_study, mechanism_teardown, counterfactual }
```

Ràng buộc: bốn route phải khác nhau **trên cả hai trục** (không hai route nào trùng cặp `hook_type × narrative_device`). Lint xác định trước khi cho phép chấm.

**Chống tự sinh tự duyệt — kỹ thuật cụ thể `[B3]`:**

| Khía cạnh | Sinh route | Chấm route |
|---|---|---|
| Temperature | Cao (0.9–1.1) | 0 hoặc gần 0 |
| System prompt | Prompt sáng tạo | Prompt giám khảo có rubric |
| Ngữ cảnh | Đầy đủ brief | **Blind** — ẩn metadata về route nào do đâu ra, xáo thứ tự |
| Call | 1 call sinh 4 route | **7 call độc lập**, không chia sẻ context |

**Rubric anchoring:** mỗi tiêu chí kèm ba ví dụ mẫu (fail / borderline / pass) đặt trong prompt. Không có anchor, điểm số của LLM trôi giữa các phiên và ngưỡng 92/95 mất ý nghĩa.

**Ngưỡng:** champion ≥95, không phải 92 `[C3]`.

**Bổ sung packaging contract:** title và thumbnail concept phải được chốt **tại đây**, cùng creative route — để video giao đúng lời hứa, thay vì đóng gói lời hứa quanh video đã hoàn thành. Đây là thay đổi contract, làm bây giờ rẻ, làm sau là breaking change.

---

### Stage 05 — Story architecture

**Vấn đề kỹ thuật:** "mỗi beat phải thay đổi knowledge, expectation, emotion hoặc mental model" là tiêu chí đúng nhưng không kiểm được vì không có biểu diễn máy đọc được.

**Cần làm — beat có state assertion tường minh:**

```
beat {
  id, t_start, t_end, beat_type,
  knowledge_before[],      // các mệnh đề người xem đã biết
  knowledge_after[],       // phải khác knowledge_before
  expectation_delta,
  claim_ids[],
  loop_opened: loop_id?,
  loop_closed: loop_id?
}
```

Lint xác định:
- `knowledge_after` ≠ `knowledge_before` cho **mọi** beat — bắt được beat rỗng, exposition lặp, ending chỉ tóm tắt.
- Mọi `loop_opened` phải có `loop_closed` tương ứng; khoảng cách mở–đóng ≤ 40% tổng thời lượng.
- Không quá 2 entity mới trong bất kỳ cửa sổ trượt 15 giây nào nếu không có recap beat.
- Hook beat kết thúc ≤15s; promise beat ≤30s; midpoint re-hook trong [40%, 60%]; payoff bắt đầu trong 20% cuối.

**Đây là nơi sinh `PredictedPerformanceArtifact` `[B6, WP2]`.**

Mô hình dự báo retention khởi đầu đơn giản, hiệu chỉnh dần bằng dữ liệu Stage 16:

```
risk(t) = w1 · (thời gian kể từ state-change gần nhất)
        + w2 · (mật độ entity mới trong cửa sổ 15s)
        + w3 · (khoảng cách tới curiosity loop đang mở gần nhất)
        + w4 · (độ dài đoạn không có visual archetype change)

retention_predicted(t) = baseline_curve(channel, pillar, length) − Σ risk
```

Ban đầu `w` đặt bằng phán đoán và `baseline_curve` lấy từ dữ liệu kênh tham chiếu. Sau 5–8 video, hiệu chỉnh bằng hồi quy trên dữ liệu thật. **Điểm mấu chốt: phải seal artifact này ngay từ video #1, kể cả khi mô hình còn thô** — không có prediction thì Stage 16 không có gì để so.

---

### Stage 06 — Script development

Bộ chuẩn WPM/câu/breath group đã đúng. Bốn bổ sung kỹ thuật.

**1. Đo tốc độ nói bằng âm tiết, không bằng từ.** Word count sai lệch lớn khi mật độ từ đa âm tiết cao — đúng trường hợp nội dung tài chính ("authorization", "settlement", "reconciliation"). Dùng syllable count hoặc phoneme count từ lexicon; quy đổi WPM sang **syllables per second** (140–160 WPM ≈ 3.3–3.8 syl/s cho tiếng Anh) và kiểm trên đơn vị đó.

**2. Number audit xác định.** Mọi token số trong narration phải:
- trace về một `claim_id` có `numeric_claim` tương ứng;
- khớp value/unit/magnitude sau khi chuẩn hóa cách đọc ("một phần tư" ↔ 25%);
- có as-of date được nói ra hoặc được hiển thị trên màn hình (bind vào ShotCue).

Parser xác định, **không dùng LLM để kiểm số**.

**3. Terminology ledger là đầu vào của forced alignment.** Đây là liên kết quan trọng nhất giữa Stage 06 và Stage 10 `[B2]`. Ledger phải sinh ra:
- Từ điển phát âm dạng IPA hoặc ARPAbet cho mọi thuật ngữ, tên riêng, viết tắt.
- Danh sách này nạp vào aligner làm custom lexicon ở Stage 10, và vào TTS làm pronunciation dictionary ở Stage 07A.
- Không có bước này, aligner sẽ báo mismatch trên thuật ngữ chuyên ngành và gate `<1%` trở nên vô nghĩa.

**4. Đồng bộ chuẩn V7 → V281 `[F1]`.** Đây là hạng mục nguyên nhân gốc. Cách làm cụ thể: lấy rubric của 8 critic ở Stage 14, chuyển mỗi dimension thành một tiêu chí kiểm ở Stage 05/06:

| Critic Stage 14 | Tiêu chí tương ứng cần thêm vào Stage 05/06 |
|---|---|
| Story & Retention | Beat state assertion + loop closure lint (đã nêu) |
| Semantic Alignment | Mỗi beat phải khai báo visual intent kiểm được ở Stage 08 |
| Audience Simulation | Comprehension check: mọi thuật ngữ mới phải có plain-meaning trong 2 câu |
| Truth & Brand Safety | Advice lint + claim type rule (Stage 03) |
| Competitive Editor | Differentiation score (Stage 02/04) |
| Visual Direction | Archetype diversity plan chốt ở Stage 05, không để Stage 08 tự quyết |
| Audio Direction | Prosody intent gắn vào từng beat |
| Executive Producer | Packaging contract ↔ nội dung consistency check |

Nếu bỏ qua bảng này, revision mới sẽ fail V281 vì đúng lý do đã làm hỏng 15 master trước.

---

## PHẦN 3 — Stage 07A–08: Thiết kế sản xuất

### Stage 07A — Voice & sound production design

**Kỹ thuật quan trọng nhất: request stitching để chống seam.**

ElevenLabs hỗ trợ truyền ngữ cảnh trước/sau khi tổng hợp từng đoạn (`previous_text` / `next_text`, hoặc `previous_request_ids`). Không dùng thì mỗi đoạn được tổng hợp như một câu độc lập, và ranh giới đoạn sẽ có gãy prosody — nghe rõ trên nội dung dài.

Quy tắc cắt đoạn:
- Cắt **chỉ ở ranh giới câu**, xác định bằng parser câu, không bằng đếm ký tự.
- Không cắt giữa: một entity nhiều từ, một chuỗi số, một mệnh đề nhân quả (phát hiện bằng liên từ nhân quả).
- Mỗi đoạn 300–800 ký tự **sau khi** thỏa hai điều kiện trên; nếu không thỏa, mở rộng đoạn thay vì cắt.
- Luôn truyền 200–300 ký tự ngữ cảnh mỗi phía.

**Settings envelope phải hash:** `{voice_id, model_id, stability, similarity_boost, style, use_speaker_boost, speed}` → `voice_settings_hash`. Bất kỳ thay đổi nào làm mất hiệu lực qualification.

**Voice fingerprint để chống mất giọng `[D6]`:** lưu một mẫu chuẩn 30 giây + embedding của giọng. Nếu provider deprecate voice, đây là cơ sở để tìm giọng thay thế gần nhất và đo độ lệch — với kênh nhiều video, đây là bảo hiểm tài sản thương hiệu.

**Chọn `TBD_PRODUCTION_AUDIO` `[D4]` — tiêu chí quyết định:**

| Tiêu chí | Vì sao bắt buộc |
|---|---|
| License cho phép monetization trên YouTube | Không có thì không dùng được |
| Có cơ chế clear Content ID / whitelist kênh | Tránh claim tự động làm mất doanh thu |
| Truy cập **stem-level** (tách nhạc cụ) | Cần cho arrangement theo beat và ducking chính xác |
| Thư viện đủ sâu cho 15+ video cùng identity | Kênh cần nhất quán âm nhạc |
| Metadata BPM/key/mood có cấu trúc | Cần cho cue placement tự động |
| Điều khoản ổn định, không hồi tố | Rủi ro pháp lý về sau |

Quyết định này là thương mại, không phải kỹ thuật — nên tách khỏi FP5 và chạy song song ngay.

---

### Stage 07B — Visual grammar & source routing

**Vấn đề 1: quyết định route đang để LLM tùy ý.** Cần luật xác định dẫn trước, LLM chỉ xử lý phần còn lại:

```
if claim_type ∈ {MECHANISM, PROCESS} và không có observable referent
    → MAKE
elif claim cần bằng chứng quan sát được (địa điểm, vật thể, hành vi thật)
    → SOURCE
elif cần cả bằng chứng quan sát và lớp giải thích
    → HYBRID
```

**Vấn đề 2: quy tắc phân loại shot lai `[B8]`.** Đây là kẽ hở khiến bộ tỷ lệ 35/45/20 bị bẻ. Phân loại theo **nguồn của chuyển động mang nghĩa**, ba nhóm rời nhau:

| Nhóm | Định nghĩa | Cách đo |
|---|---|---|
| `CAMERA_ONLY` | Thông tin không đổi theo thời gian; chỉ có pan/zoom | Optical flow gần như thuần global; entropy nội dung theo thời gian thấp |
| `LAYERED_SEMANTIC` | Thông tin thay đổi do layer authored (element xuất hiện, giá trị thay đổi, đường đi được vẽ) | Scene graph có event thay đổi trạng thái |
| `SOURCE_SEMANTIC` | Chuyển động mang nghĩa nằm trong source video (dòng người, máy vận hành) | Optical flow có thành phần local đáng kể sau khi trừ global motion |

Shot có cả camera motion và layer animation → phân vào `LAYERED_SEMANTIC` (nguồn nghĩa là layer). Quy tắc này phải viết vào standard, không để phán đoán từng lần.

**Vấn đề 3: cấp của identity `[WP1]`.** Với đa kênh, voice identity và visual grammar phải là tài sản **cấp kênh**, không phải quyết định lại mỗi video:

```
ChannelIdentityContract@v {
  voice: { voice_id, settings_hash, pronunciation_lexicon_ref }
  visual: { palette, type_scale, motion_language, layout_grid, lower_third_spec }
  music:  { genre_range, instrumentation, tempo_range, cue_library_ref }
  terminology: { ledger_ref }
}
```

Stage 07A/07B chuyển từ "thiết kế" sang "chuyên biệt hóa trong ràng buộc kế thừa". **Quyết định này phải chốt trước FP4/FP5** vì nó đổi phạm vi qualification: qualify archetype ở cấp kênh (tái dùng cho 15 video) khác hoàn toàn qualify ở cấp video.

---

### Stage 08 — Semantic ShotCueProgram

**Bỏ hard limit 90–180 shots `[C2]`.** Fixture cho 80,252s / 8 shots ≈ 10,0 s/shot; ngoại suy sang 480–720s ra 48–72 shots, dưới floor 90 ở cả hai đầu.

**Thay bằng adaptive validation:**

| Ràng buộc | Giá trị đề xuất |
|---|---|
| Thời lượng mỗi shot | 3–20 s |
| Median shot duration | 6–12 s |
| Shot liên tiếp cùng archetype | Tối đa 2 |
| Mỗi claim CRITICAL | ≥1 shot bind |
| Khoảng không có archetype change | ≤25 s |
| Tổng thời lượng | khớp canonical duration trong ±1 frame `[C6]` |

**Lint timeline bằng interval tree** (`O(n log n)`, xác định) thay vì so sánh từng cặp: phát hiện gap, overlap, và shot không phủ claim.

**Acceptance test sinh tự động, dạng máy kiểm được.** Mỗi shot sinh ba assertion:

```
ENTRY    t=t0    : element_set = E0, trạng thái = S0
MIDPOINT t=t0+Δ/2: element_set ⊇ E0, ∃ e: state(e) ≠ S0(e)   // phải có thay đổi
EXIT     t=t1    : element_set = E1, |E1 △ E0| ≥ 1           // phải khác entry
```

Đây là điều biến "semantic motion" từ nhận định thành phép đo — và là thứ Stage 09 phải chứng minh.

---

## PHẦN 4 — Stage 09–10: Sản xuất media

### Stage 09 — Actual-pixel visual production

Đây là stage nặng nhất và rủi ro throughput cao nhất `[D1]`.

**Vấn đề: render từng frame bằng Sharp không khả thi ở quy mô.** Ước lượng: 10 s × 30 fps × 3 composition × ~60 shot ≈ 54.000 lần render frame cho **một** video, chưa tính candidate bị loại.

**Kiến trúc lai đề xuất:**

| Loại chuyển động | Kỹ thuật | Chi phí tương đối |
|---|---|---|
| Layer tĩnh, pan/zoom | Sharp render **1 lần** → FFmpeg `zoompan` | Rất thấp |
| Fade, wipe, chuyển cảnh | FFmpeg `xfade`, `overlay` với biểu thức theo `t` | Rất thấp |
| Element xuất hiện/biến mất theo thời gian | `overlay` với `enable='between(t,a,b)'` | Thấp |
| Đường đi, chart động, morph | Headless Chromium + CSS/SVG animation, capture theo frame | Cao — chỉ dùng khi cần |
| Composite phức tạp nhiều layer | Một `filter_complex` graph duy nhất | Trung bình |

Nguyên tắc: **render pixel một lần, hoạt hóa bằng filter graph.** Chỉ rơi xuống render-per-frame khi filter graph không biểu diễn được.

**Bắt buộc benchmark trước khi qualify FP4:** đo thời gian và chi phí thực cho một shot đại diện của **mỗi trong 8 archetype**, ngoại suy ra full video. Nếu tổng vượt ngân sách hoặc thời gian chấp nhận được, phải đổi kiến trúc trước, không phải sau.

**Eligibility filter trước khi tải bytes** — tiết kiệm băng thông và chi phí license:
```
lọc theo: duration ≥ shot_duration + biên, resolution ≥ 1920×1080,
          fps ∈ {24,25,30,50,60}, aspect ratio, license_type,
          không có watermark (kiểm metadata), có thông tin provenance
```
Chỉ tải bytes cho candidate qua được filter.

**Đo semantic motion bằng optical flow.** Đây là cách biến `camera-only ≤35%` từ nhãn thành phép đo:
```
1. Ước lượng global motion (FFmpeg vidstabdetect hoặc OpenCV estimateAffinePartial2D)
2. Trừ global motion khỏi dense optical flow (Farnebäck)
3. residual_energy = năng lượng flow còn lại
4. residual_energy thấp → CAMERA_ONLY
   residual_energy có cụm local → SOURCE_SEMANTIC
```

**Duplicate ≤2%:** perceptual hash (pHash 64-bit) trên frame lấy mẫu 1 fps, so sánh Hamming distance trong nội bộ video và với asset library. Ngưỡng trùng: distance ≤10.

**Frame rate normalization `[C5]`:**
- Ưu tiên source 30/60 fps → decimate đơn giản.
- 24/25 fps → `fps=30` với duplicate frame gây judder nhẹ; chấp nhận được cho B-roll ngắn.
- Chỉ dùng `minterpolate` (motion interpolation) cho shot dài có chuyển động mượt — rất đắt và có artifact trên cạnh phức tạp.
- Ghi `source_fps` và `conversion_method` vào lineage để Stage 12 truy được nguyên nhân judder.

---

### Stage 10 — Narration, music, ambience & SFX production

**Vấn đề nghiêm trọng nhất: gate `transcript mismatch <1%` hiện không đo được `[B2]`.**

WER của ASR phổ thông trên thuật ngữ tài chính thường cao hơn chính ngưỡng 1%. Nghĩa là gate không phân biệt được lỗi TTS với lỗi của công cụ đo.

**Quy trình sửa:**

```
1. Pin công cụ:      WhisperX (large-v3) hoặc Montreal Forced Aligner
2. Nạp custom lexicon từ terminology ledger (Stage 06)
3. Dùng FORCED ALIGNMENT, không free-form ASR
   — aligner biết trước text đúng, chỉ tìm timing
   — bài toán dễ hơn nhiều so với nhận dạng tự do
4. CALIBRATE: chạy aligner trên 10-15 mẫu audio người đọc chuẩn
   → đo error floor của chính công cụ
5. Ngưỡng thật = max(1%, error_floor × 2)
6. So sánh ở mức PHONEME, không mức từ
   — tách được "TTS đọc sai âm" khỏi "aligner nghe nhầm"
```

**Seam detection kỹ thuật cụ thể:**
- Cross-correlation trên cửa sổ 100 ms hai bên ranh giới đoạn.
- Spectral discontinuity: so sánh MFCC hai bên ranh giới; khoảng cách vượt ngưỡng → seam.
- F0 (pitch) continuity: đo pitch contour hai bên; bước nhảy >2 semitone tại ranh giới → gãy prosody.

**Ducking và mix — tham số FFmpeg:**
```
sidechaincompress = threshold, ratio, attack=80-250ms, release=300-800ms
→ khớp đúng chuẩn đã có trong tài liệu
```

**Loudness normalization phải 2 pass:**
```
Pass 1: ffmpeg -af loudnorm=I=-14:TP=-1:LRA=7:print_format=json  → đo
Pass 2: ffmpeg -af loudnorm=I=-14:TP=-1:LRA=7:measured_I=...:linear=true
```
Một pass dùng chế độ động, gây pumping và không đạt chính xác target. Hai pass cho linear gain, chính xác và không biến dạng.

**A/V sync theo archetype `[C4]`:**

| Archetype | Dung sai |
|---|---|
| Documentary live action (có mặt người, có lip movement) | ≤45 ms |
| Source-authored hybrid | ≤80 ms |
| Đồ họa authored (không có referent chuyển động thật) | ≤120 ms |

**Khoanh phạm vi `gpt-audio-1.5` `[B9]`:** chỉ dùng cho intelligibility, naturalness, pronunciation correctness, emotional appropriateness. **Không** dùng để phán xét loudness, dynamic range, hay balance — BS.1770 và `astats` đo chính xác hơn nhiều bậc.

---

## PHẦN 5 — Stage 11–13: Dựng và master

### Stage 11 — Clean edit & composition

**Dùng OpenTimelineIO (OTIO) thay cho EDL schema riêng.** Lợi ích: mở đường cho công cụ dựng ngoài khi cần can thiệp thủ công, audit bằng công cụ chuẩn, và không phải tự bảo trì một định dạng timeline.

**Caption sinh từ forced alignment, không từ script.** Đây là điểm hay bị làm sai: caption sinh từ script sẽ lệch khi TTS đọc nhanh/chậm khác dự tính. Dùng word-level timestamp từ aligner (Stage 10) → caption khớp audio thật.

Với ràng buộc ≤5 từ mỗi display unit `[C8]`, hãy đo trước tác động: 600 s narration ở 150 WPM ≈ 1.500 từ ≈ **300 caption event**. Mỗi event là một điểm có thể lệch sync. Cân nhắc nới lên 7 từ cho đoạn tốc độ cao, hoặc chuyển sang đơn vị theo breath group thay vì đếm từ cứng.

**Near-static detection xác định:**
```
Lấy mẫu frame mỗi 500 ms
SSIM(frame[i], frame[i-1]) > 0.98 liên tục > 7 s  → vi phạm
Trừ trường hợp shot được khai báo static có chủ đích (khai báo ở Stage 08)
```

**Safe zone kiểm bằng bbox, không bằng vision model.** Compositor biết chính xác vị trí mọi text element — kiểm hình học, kết quả xác định và miễn phí. Chỉ dùng vision model cho occlusion do source video (text bị vật thể trong footage che).

---

### Stage 12 — Pre-master deterministic verification

Toàn bộ stage này nên là FFmpeg thuần, không LLM. Công cụ cụ thể:

| Kiểm tra | Filter/lệnh |
|---|---|
| Black frame | `blackdetect=d=0.1:pix_th=0.10` |
| Freeze frame | `freezedetect=n=0.001:d=2` |
| Silence | `silencedetect=n=-50dB:d=0.5` |
| Clipping | `astats=metadata=1` → đọc `Peak_level`, `Flat_factor` |
| Drop frame | so `nb_read_frames` (ffprobe `-count_frames`) với `duration × fps` |
| Stream profile | `ffprobe -show_streams` → codec, profile, level, pix_fmt, color primaries |
| A/V duration lệch | so `duration` của stream video và audio |

**Mobile QA 25% scale — đo được thay vì cảm quan:**
- Downscale về 480×270, đo **x-height tính bằng pixel** của mọi text element; ngưỡng tối thiểu ~10 px.
- Đo **contrast ratio** text/nền theo WCAG; ngưỡng ≥4.5:1 cho text thường, ≥3:1 cho text lớn.
- Cả hai đều tính toán được từ compositor metadata + render, không cần model.

**Tách NOT_EVALUATED khỏi FAIL trong báo cáo `[A4]`** — hai hồ sơ rủi ro khác nhau, không được gộp vào một con số.

---

### Stage 13 — Immutable master render

**Vấn đề nghiêm trọng: VP9 là codec phân phối, không phải codec master `[C1]`.** Master hóa bằng chính định dạng giao hàng nghĩa là mọi lần tái sử dụng chịu hao hụt thế hệ, và vĩnh viễn không thể xuất 4K hoặc re-frame.

**Kiến trúc hai lớp:**

| Lớp | Định dạng | Mục đích |
|---|---|---|
| **Archival master** | FFV1 trong MKV (lossless, mã nguồn mở, hỗ trợ lâu dài) hoặc ProRes 422 HQ; audio PCM 48 kHz | Nguồn chân lý, tái sử dụng, xuất lại về sau |
| **Distribution render** | VP9 hoặc AV1 + Opus, 1080p30, Rec.709 | Bản giao YouTube |

Cả hai đều checksum, đều lưu R2 + Drive, và **lineage phải ghi rõ distribution derive từ archival**.

**Checksum ở hai mức:**
```
File-level:   sha256 toàn file          → phát hiện lỗi truyền/lưu trữ
Stream-level: ffmpeg -f framemd5        → phát hiện lỗi nội dung độc lập với container
```
Chỉ hash file không phân biệt được "container khác nhau" với "nội dung khác nhau" — quan trọng khi đối soát giữa R2 và Drive `[A10]`, vì Drive có thể thay đổi metadata container.

**Đối soát R2 ↔ Drive:** Drive dùng MD5 cho file nhỏ nhưng multipart cho file lớn — không so trực tiếp được với sha256. Cần tải về và hash lại, hoặc lưu sẵn cả hai giá trị trong ledger.

---

## PHẦN 6 — Stage 14–16: Bảo đảm và học

### Stage 14 — Independent full-master assurance

**Vấn đề gốc: chính critic chưa được qualify, và không có ground truth để qualify `[B1]`.**

**Giải pháp — gold set lấy nhãn từ 595 output bị loại `[WP7]`:**

```
1. Chọn 12-15 master/đoạn từ kho đã bị reject
2. Với mỗi mẫu, ghi nhãn defect thật do owner đã xác định
   (owner đã từ chối 15/15 master — nhãn đã tồn tại, chỉ cần cấu trúc hóa)
3. Bổ sung mẫu tổng hợp: cố ý gài defect đã biết
   — lệch sync 200 ms
   — seam audio ở một ranh giới đoạn
   — narration nói A trong khi visual thể hiện B
   — near-static 12 s
   — footage không có rights lineage
4. Chạy 8 critic trên gold set
5. Đo: recall (bắt được bao nhiêu defect), precision (báo nhầm bao nhiêu)
6. Qualification pass khi recall ≥ ngưỡng trên MỌI loại defect P0
```

Đây là hạng mục có tỷ lệ giá trị/công sức cao nhất trong toàn bộ danh sách — nó vừa qualify được assurance capability, vừa biến kho thất bại thành regression suite vĩnh viễn.

**Độ tin cậy giữa các lần chấm `[B4]`:**
- Pin `temperature=0` và `seed` cố định cho mọi critic call.
- Khi điểm rơi vào **floor ± 3**, chạy lại n=3 và lấy median. Vùng biên là nơi sai số ngẫu nhiên quyết định pass/fail.
- Ghi phương sai vào evidence; nếu phương sai của một critic vượt ngưỡng, critic đó cần requalify.

**Blind thật sự:** ẩn khỏi input của critic mọi metadata về quá trình sản xuất — route nào thắng, capability nào dùng, đã revision lần thứ mấy. Rò rỉ những thông tin này tạo thiên lệch.

**Rubric anchoring:** mỗi dimension kèm 3 ví dụ mẫu (fail / borderline / pass). Không có anchor, thang điểm 0–100 của LLM không ổn định và ngưỡng 92/94 mất ý nghĩa.

**Critic thứ 9 — Packaging/CTR**, có floor riêng. Cùng với floor riêng cho Executive Producer và Competitive Editor `[C9]`.

---

### Stage 15 — Owner-ready gate

**Thiết kế ngân sách chú ý ngay từ bây giờ.** Owner hiện là điểm phê duyệt duy nhất; với đa kênh sẽ thành nút thắt cứng và trôi thành phê duyệt hình thức.

| Quyết định | Chế độ pilot | Chế độ scale |
|---|---|---|
| Publish authorization | Owner, 100% | Owner, 100% — **không nới** |
| Promote learning → strategy | Owner, 100% | Owner, 100% — **không nới** |
| Rights exception | Owner, 100% | Owner, 100% — **không nới** |
| Stage 15 release gate | Owner review toàn bộ | Sampling khi ≥N video liên tiếp pass không có P1 |
| Creative champion (Stage 04) | Owner xem | Tự động, owner xem mẫu |

Ba dòng đầu là những quyết định có hậu quả cấp kênh — không được tự động hóa dù ở quy mô nào.

---

### Stage 16 — Post-publish learning

**Metric cần lấy từ YouTube Analytics API:**
- `audienceWatchRatio` theo `elapsedVideoTimeRatio` — đường cong retention tương đối
- `relativeRetentionPerformance` — so với video cùng độ dài trên nền tảng
- `impressions`, `impressionClickThroughRate` — hiệu quả packaging
- `averageViewDuration`, `averageViewPercentage`
- Traffic source breakdown — phân biệt hiệu ứng thuật toán với hiệu ứng nội dung

**So sánh với prediction — metric cụ thể:**
```
MAE  = mean|retention_actual(t) − retention_predicted(t)|  trên lưới 5%
Beat-level error: sai số tại mỗi beat boundary → chỉ ra beat nào dự báo sai
CTR delta: actual − predicted, phân tách theo thumbnail variant
```
Sai số theo beat là thứ có giá trị học tập cao nhất — nó chỉ ra **cấu trúc** nào dự báo sai, không chỉ tổng thể.

**Experiment registry — điều kiện để learning có nghĩa `[WP3]`:**

```
experiment {
  hypothesis,
  variable_tested,          // đúng MỘT biến
  variables_held_constant[],// bắt buộc liệt kê
  min_sample_size,          // số video tối thiểu
  decision_criterion,       // ngưỡng và hướng
  status: RUNNING | INSUFFICIENT_EVIDENCE | CONCLUDED
}
```

Quy tắc: learning chỉ được `PROMOTE` khi (a) đạt cỡ mẫu tối thiểu, (b) kết quả nhất quán qua **≥2 video độc lập**, (c) owner phê duyệt bằng identity-bound command. Không đạt → trạng thái `INSUFFICIENT_EVIDENCE`, giữ lại nhưng không tác động.

Không có kỷ luật này, với n=15 video, mọi chênh lệch retention sẽ bị chi phối bởi nhiễu chủ đề và thumbnail — và hệ thống sẽ **học sai, tệ hơn không học**.

**Typed command thứ sáu:**
```
PROMOTE_LEARNING(learning_id, target: CHANNEL_STRATEGY | PRODUCTION_STANDARD,
                 owner_identity, evidence_hash)
→ tạo version mới có lineage, không sửa tại chỗ
```

---

## PHẦN 7 — Thứ tự triển khai

### Trước khi viết thêm bất kỳ dòng code nào

1. **Chốt nhịp mục tiêu**: bao nhiêu video/kênh/tuần, bao nhiêu kênh. Mọi thông số concurrency và kinh tế derive từ đây.
2. **Mô hình kinh tế thật** `[E1]`: làm rõ $20 là ceiling video hay ceiling slice; dựng cost model từ benchmark.
3. **Cấp của identity** `[WP1]`: kênh hay video. Quyết định này đổi phạm vi FP4/FP5.

### Song song với xử lý P0 hiện có

4. Canonical hashing + fencing token + cost reservation (Phần 0) — nền tảng, rẻ, sửa sau thì đắt.
5. Gold set từ 595 output bị loại `[WP7]` → mở khóa `[B1]`.
6. Pin và calibrate forced alignment `[B2]` → mở khóa gate `<1%`.
7. Benchmark compositor 8 archetype `[D1]` → quyết định kiến trúc FP4.
8. `PredictedPerformanceArtifact` schema `[WP2]` — chỉ là schema, nhưng phải có trước khi Stage 11 được viết lại.
9. Packaging contract vào Stage 04 — breaking change nếu làm sau.
10. Tách archival/distribution master `[C1]` — không sửa được sau khi đã có master.

### Sau khi FP4/FP5 pass, trước video #2

11. Đồng bộ V7 → V281 cho Stage 04/05/06 `[F1]` — nếu bỏ qua, revision mới lặp lại thất bại cũ.
12. Animatic gate giữa Stage 08 và 09 `[F2]`.
13. Learning closure + experiment registry `[WP3]`.
14. Asset & rights library `[WP5]`.
15. Platform compliance plane `[WP6]`.

### Trước kênh thứ hai

16. Portfolio & concurrency plane `[WP4]`.
17. Ngân sách chú ý và mô hình ủy quyền.

---

## Ghi chú cuối

Ba hạng mục rẻ nhất nhưng đổi được bản chất hệ thống — từ cỗ máy sản xuất thành hệ thống có khả năng học:

- **PredictedPerformanceArtifact** (Stage 05, chỉ là schema)
- **Packaging contract** (Stage 04, chỉ là contract)
- **Gold set từ failure corpus** (dữ liệu đã có, chỉ cần cấu trúc hóa)

Cả ba là thay đổi schema và policy, không phải capability. Chi phí thấp, nhưng phải làm **trước** khi Stage 09–11 được viết lại — sau đó chúng trở thành breaking change.

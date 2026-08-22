export const metadata = { title: "Factory-first QA Fixture · YouTube AI Factory" };

const card = { border: "1px solid #315247", borderRadius: 16, background: "#0d1915", padding: 18 } as const;

export default function FactoryQaFixturePage() {
  return <main style={{ minHeight: "100vh", background: "#07110e", color: "#e8f4ef", padding: "clamp(18px,4vw,54px)", fontFamily: "Arial,sans-serif" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 20 }}>
      <header>
        <p style={{ color: "#78c8a5", fontSize: 11, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase" }}>Factory QA trước · Owner xác minh sau</p>
        <h1 style={{ margin: "8px 0", font: "600 clamp(32px,5vw,58px)/1.02 Georgia,serif", letterSpacing: "-.04em" }}>Anh không cần đánh giá tuần tự 80 mẫu còn lại.</h1>
        <p style={{ maxWidth: 800, color: "#a9bdb5", lineHeight: 1.65 }}>Hai phán quyết đã lưu là mẫu chuẩn hiệu chỉnh. Factory chỉ được xử lý hàng đợi sau khi bắt đúng toàn bộ lỗi owner đã ghi nhận trên cả hai mẫu.</p>
      </header>
      <section aria-label="Trạng thái Factory QA" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
        <article style={card}><small style={{ color: "#78c8a5" }}>MẪU HIỆU CHỈNH</small><h2 style={{ margin: "8px 0 0" }}>2 / 2 đã lưu</h2></article>
        <article style={card}><small style={{ color: "#78c8a5" }}>HÀNG ĐỢI FACTORY</small><h2 style={{ margin: "8px 0 0" }}>80 mẫu chính</h2></article>
        <article style={card}><small style={{ color: "#78c8a5" }}>OWNER CẦN LÀM</small><h2 style={{ margin: "8px 0 0" }}>0 lúc này</h2></article>
      </section>
      <section style={card}>
        <h2 style={{ marginTop: 0, fontFamily: "Georgia,serif" }}>Cơ chế an toàn</h2>
        <ol style={{ color: "#b5c8c0", lineHeight: 1.75, paddingLeft: 22 }}>
          <li>Đọc lại đúng bytes R2 và kiểm tra SHA-256 trước khi chấm.</li>
          <li>Vision đánh giá toàn bộ taxonomy có thể quan sát; không được giả lập phán quyết owner.</li>
          <li>Hai mẫu chuẩn phải đồng thuận đầy đủ trước khi batch được mở.</li>
          <li>Video/audio đi vào Browser playback lane; chưa có bằng chứng thì giữ chặn.</li>
          <li>Owner chỉ nhận ngoại lệ P0, kết quả không chắc chắn hoặc mẫu kiểm toán.</li>
        </ol>
        <details style={{ marginTop: 14, borderTop: "1px solid #294238", paddingTop: 14 }}>
          <summary style={{ cursor: "pointer", color: "#9ee3c3", fontWeight: 800 }}>Xem ranh giới thẩm quyền</summary>
          <p style={{ color: "#9db2aa", lineHeight: 1.65 }}>Receipt của Factory dùng nguồn INDEPENDENT_REVIEW, không đặt OWNER_CONFIRMED, không mở dataset, không qualify assurance và không tạo release eligibility.</p>
        </details>
      </section>
      <aside style={{ ...card, borderColor: "#654d2b", background: "#211a10" }}>
        <strong style={{ color: "#f5cf86" }}>Trạng thái fixture</strong>
        <p style={{ color: "#c9b99b", marginBottom: 0 }}>Đây là bề mặt QA giao diện không kết nối production data; nó không tạo receipt và không có release authority.</p>
      </aside>
    </div>
  </main>;
}

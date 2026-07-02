import Link from "next/link";
import dynamic from "next/dynamic";
import BackButton from "@/components/BackButton";

const HowItWorksSection   = dynamic(() => import("./_GuideIcons").then(m => ({ default: m.HowItWorksSection })),   { ssr: false });
const CustomerFeaturesSection = dynamic(() => import("./_GuideIcons").then(m => ({ default: m.CustomerFeaturesSection })), { ssr: false });
const DriverCardsSection  = dynamic(() => import("./_GuideIcons").then(m => ({ default: m.DriverCardsSection })),  { ssr: false });

export const metadata = { title: "Hướng dẫn sử dụng – Thuận Chuyến" };

export default function GuidePage() {
  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "#e2e8f0" }}>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(2,6,23,.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(99,102,241,.2)",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton fallback="/" />
          <Link href="/" style={{
            fontWeight: 800, fontSize: 18, color: "#f1f5f9", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            🚌 <span style={{ background: "linear-gradient(90deg,#6366f1,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Thuận Chuyến</span>
          </Link>
        </div>
        <Link href="/login" style={{
          padding: "8px 18px", background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600,
          boxShadow: "0 0 16px rgba(99,102,241,.35)",
        }}>
          Đăng nhập →
        </Link>
      </header>

      {/* Hero */}
      <section style={{
        padding: "80px 24px 60px",
        textAlign: "center",
        background: "radial-gradient(ellipse at top,rgba(99,102,241,.12) 0%,transparent 60%)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)",
          borderRadius: 999, padding: "5px 14px", marginBottom: 20,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d3ee", display: "inline-block", boxShadow: "0 0 8px #22d3ee" }} />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Hướng dẫn chi tiết</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5vw,56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
          Bắt đầu với{" "}
          <span style={{ background: "linear-gradient(90deg,#6366f1,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Thuận Chuyến
          </span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 17, maxWidth: 600, margin: "0 auto 40px" }}>
          Nền tảng ghép chuyến xe liên tỉnh thông minh — tài xế kiếm thêm thu nhập,
          khách hàng tiết kiệm chi phí, tất cả trong một ứng dụng.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <StatPill icon="🚗" label="Tài xế" value="1,200+" />
          <StatPill icon="👥" label="Chuyến/ngày" value="3,500+" />
          <StatPill icon="🗺️" label="Tỉnh thành" value="63" />
          <StatPill icon="⭐" label="Đánh giá TB" value="4.8" />
        </div>
      </section>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* How it works */}
        <Section title="Cách hoạt động" subtitle="3 bước đơn giản">
          <HowItWorksSection />
        </Section>

        {/* For customers */}
        <Section title="Dành cho Khách hàng" subtitle="Đặt xe chưa bao giờ dễ đến thế">
          <CustomerFeaturesSection />
        </Section>

        {/* For drivers */}
        <Section title="Dành cho Tài xế" subtitle="Kiếm thêm trên mỗi chuyến đã có sẵn">
          <DriverCardsSection />
          <div style={{
            marginTop: 20, padding: "20px 24px",
            background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)",
            borderRadius: 12,
          }}>
            <h4 style={{ color: "#a5b4fc", fontWeight: 600, marginBottom: 12 }}>📈 Thu nhập ví dụ</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              {[
                { route: "HN → Thanh Hóa", seats: 3, earn: "360.000đ" },
                { route: "HCM → Đà Lạt", seats: 4, earn: "520.000đ" },
                { route: "Đà Nẵng → Huế", seats: 2, earn: "160.000đ" },
              ].map((r) => (
                <div key={r.route} style={{
                  background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "12px 14px",
                }}>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>{r.route}</div>
                  <div style={{ color: "#e2e8f0", fontSize: 12 }}>{r.seats} khách</div>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: 16, marginTop: 4 }}>{r.earn}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Step by step customer */}
        <Section title="Hướng dẫn đặt xe" subtitle="Chi tiết từng bước">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              {
                step: "01", title: "Tạo tài khoản",
                desc: "Truy cập thuanduong.vn → Đăng ký bằng Email hoặc Google. Xác thực bằng OTP gửi về email.",
                icon: "👤", color: "#6366f1",
              },
              {
                step: "02", title: "Xem báo giá",
                desc: "Vào mục Đặt chuyến → Nhập điểm đón, điểm trả, ngày giờ → Nhấn Xem giá để xem ước tính chi phí.",
                icon: "💰", color: "#22d3ee",
              },
              {
                step: "03", title: "Chọn tài xế hoặc đặt mở",
                desc: "Xem Feed tài xế → chọn người phù hợp và đặt trực tiếp. Hoặc đặt Mở và hệ thống tự ghép.",
                icon: "🚗", color: "#a855f7",
              },
              {
                step: "04", title: "Thanh toán",
                desc: "Sau khi tài xế nhận cuốc, thanh toán qua VNPay hoặc MoMo. Tiền được giữ an toàn đến khi hoàn thành.",
                icon: "💳", color: "#f59e0b",
              },
              {
                step: "05", title: "Lên xe & theo dõi",
                desc: "Nhận thông báo khi xe đến. Theo dõi vị trí real-time. Bạn biết chính xác mình là khách số mấy.",
                icon: "📍", color: "#34d399",
              },
              {
                step: "06", title: "Đánh giá",
                desc: "Sau khi đến nơi, đánh giá tài xế từ 1-5 sao. Giúp cộng đồng chọn được tài xế tốt nhất.",
                icon: "⭐", color: "#ec4899",
              },
            ].map((s, i, arr) => (
              <div key={s.step} style={{ display: "flex", gap: 20, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: `${s.color}20`, border: `2px solid ${s.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, zIndex: 1,
                    boxShadow: `0 0 16px ${s.color}40`,
                  }}>
                    {s.icon}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: "rgba(99,102,241,.15)", minHeight: 40, margin: "4px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: 28, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ color: s.color, fontSize: 11, fontWeight: 700 }}>BƯỚC {s.step}</span>
                    <h4 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{s.title}</h4>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section title="Câu hỏi thường gặp" subtitle="FAQ">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                q: "Tài xế có thể đón tối đa bao nhiêu khách?",
                a: "Tùy loại xe. Ô tô 4-7 chỗ thường đón 2-4 khách, xe van/minibus có thể đón 7-12 khách. Hệ thống tự kiểm tra còn chỗ trống.",
              },
              {
                q: "Nếu tài xế không đến, tôi có được hoàn tiền không?",
                a: "Có. Tiền được giữ trong escrow cho đến khi chuyến hoàn thành. Admin có thể ra lệnh hoàn tiền thủ công trong trường hợp tranh chấp.",
              },
              {
                q: "Tài xế nhận tiền khi nào?",
                a: "Sau khi chuyến hoàn thành, tiền vào ví Đang chờ. Sau 3 ngày tự chuyển sang Có thể rút. Tài xế rút bất cứ lúc nào, admin duyệt trong 24h.",
              },
              {
                q: "Ứng dụng có hoạt động ngoài giờ không?",
                a: "Có. Thuận Chuyến hoạt động 24/7. Tài xế bật trạng thái Online khi muốn nhận chuyến, tắt khi muốn nghỉ.",
              },
              {
                q: "Làm sao biết xe đang đến đón tôi?",
                a: "Khi tài xế bắt đầu chuyến, bạn nhận thông báo Email/Zalo. Trong app, màn hình theo dõi chuyến hiển thị vị trí xe real-time.",
              },
              {
                q: "Tôi có thể book chuyến trước bao lâu?",
                a: "Có thể book trước tối đa 30 ngày. Yêu cầu sẽ hết hạn sau 24h nếu chưa có tài xế nhận.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(99,102,241,.15)",
                  borderRadius: 10, overflow: "hidden",
                }}
              >
                <summary style={{
                  padding: "14px 18px", cursor: "pointer",
                  color: "#e2e8f0", fontWeight: 500, fontSize: 14,
                  listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  {faq.q}
                  <span style={{ color: "#6366f1", fontSize: 18, fontWeight: 300 }}>+</span>
                </summary>
                <div style={{
                  padding: "0 18px 14px",
                  color: "#94a3b8", fontSize: 14, lineHeight: 1.7,
                  borderTop: "1px solid rgba(99,102,241,.1)", paddingTop: 12,
                }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div style={{
          textAlign: "center", padding: "48px 32px",
          background: "radial-gradient(ellipse at center,rgba(99,102,241,.12) 0%,transparent 70%)",
          border: "1px solid rgba(99,102,241,.2)", borderRadius: 20,
          marginTop: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <h3 style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>
            Sẵn sàng bắt đầu?
          </h3>
          <p style={{ color: "#94a3b8", marginBottom: 28 }}>
            Đăng ký miễn phí, sử dụng ngay hôm nay
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              borderRadius: 10, color: "#fff", textDecoration: "none",
              fontWeight: 600, fontSize: 15,
              boxShadow: "0 0 24px rgba(99,102,241,.4)",
            }}>
              Đặt xe ngay
            </Link>
            <Link href="/login?tab=register" style={{
              padding: "12px 28px",
              border: "1px solid rgba(99,102,241,.3)",
              borderRadius: 10, color: "#94a3b8", textDecoration: "none",
              fontWeight: 500, fontSize: 15,
            }}>
              Đăng ký làm tài xế
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,.04)", border: "1px solid rgba(99,102,241,.2)",
      borderRadius: 999, padding: "8px 18px",
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>{value}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 60 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ color: "#6366f1", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          {subtitle}
        </div>
        <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, color: "#f1f5f9" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}


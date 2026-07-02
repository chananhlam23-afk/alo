"use client";
import dynamic from "next/dynamic";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

type GeoIconType = "route" | "realtime" | "payment" | "notification" | "backhaul" | "cargo" | "ai";

/* ── How it works — 3 Steps ─────────────────────────────────────────────────── */

const HOW_STEPS: { icon: GeoIconType; title: string; desc: string; color: string; num: string }[] = [
  {
    num: "01", icon: "route", color: "#6366f1",
    title: "Nhập điểm đón & trả",
    desc:  "Nhập điểm đón, điểm trả và giờ khởi hành mong muốn. Hệ thống tự tìm tài xế phù hợp.",
  },
  {
    num: "02", icon: "ai", color: "#22d3ee",
    title: "AI ghép chuyến",
    desc:  "Thuật toán tự động xếp bạn vào cuốc gần nhất. Bạn nhận thông báo khi có tài xế nhận.",
  },
  {
    num: "03", icon: "realtime", color: "#a855f7",
    title: "Lên xe & đi",
    desc:  "Theo dõi xe real-time trên bản đồ. Trả tiền qua VNPay, MoMo hoặc ví Thuận Chuyến.",
  },
];

export function HowItWorksSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
      {HOW_STEPS.map((s) => (
        <div key={s.num} style={{
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(99,102,241,.12)",
          borderRadius: 14, padding: "22px 20px", position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          <div style={{
            position: "absolute", top: 10, right: 14,
            fontSize: 46, fontWeight: 900, color: s.color, opacity: .07, fontFamily: "monospace",
          }}>{s.num}</div>
          <GeoIcon type={s.icon} size={72} style={{ marginBottom: 14 }}/>
          <h3 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{s.title}</h3>
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Customer features ───────────────────────────────────────────────────────── */

const CUSTOMER_FEATURES: { icon: GeoIconType; title: string; desc: string }[] = [
  { icon: "ai",           title: "Xem Feed tài xế",        desc: "Duyệt danh sách tài xế khớp lộ trình, so sánh giá và đánh giá trực tiếp" },
  { icon: "payment",      title: "Báo giá tức thì",         desc: "Nhập điểm đón/trả → nhận ngay giá ước tính trước khi đặt" },
  { icon: "realtime",     title: "Theo dõi real-time",      desc: "Biết mình là khách số mấy, xe đang đón ai, ETA chính xác" },
  { icon: "notification", title: "Đánh giá tài xế",         desc: "Sau mỗi chuyến, đánh giá và để lại nhận xét giúp cộng đồng" },
  { icon: "backhaul",     title: "Nhiều cổng thanh toán",   desc: "VNPay, MoMo, chuyển khoản. Tự động hoàn tiền nếu có sự cố" },
  { icon: "route",        title: "Bảo vệ người dùng",       desc: "Báo cáo tài xế trực tiếp, admin xử lý trong 24h" },
];

export function CustomerFeaturesSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
      {CUSTOMER_FEATURES.map((item) => (
        <div key={item.title} style={{
          background: "rgba(255,255,255,.02)", border: "1px solid rgba(99,102,241,.12)",
          borderRadius: 12, padding: "20px 18px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
          transition: "border-color .2s",
        }}>
          <GeoIcon type={item.icon} size={60} style={{ marginBottom: 12 }}/>
          <h4 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</h4>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Driver info cards ───────────────────────────────────────────────────────── */

const DRIVER_CARDS: { icon: GeoIconType; title: string; desc: string; color: string }[] = [
  { icon: "cargo",        color: "#6366f1", title: "Đăng ký KYC dễ dàng",  desc: "Upload CCCD, bằng lái, đăng ký xe. Admin duyệt trong 24-48h." },
  { icon: "route",        color: "#22d3ee", title: "Đăng lộ trình cố định", desc: "Mỗi ngày bạn chạy tuyến nào, đăng một lần. Hệ thống tự ghép khách." },
  { icon: "notification", color: "#a855f7", title: "Gom nhiều khách/cuốc",  desc: "1 chuyến HN – ĐN có thể đón 3-4 khách dọc đường, tối ưu lợi nhuận." },
  { icon: "payment",      color: "#34d399", title: "Ví an toàn",             desc: "Tiền tự cộng vào ví sau 3 ngày hoàn thành chuyến. Rút bất cứ lúc nào." },
];

export function DriverCardsSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {DRIVER_CARDS.map((item) => (
        <div key={item.title} style={{
          background: "rgba(255,255,255,.02)", border: `1px solid ${item.color}25`,
          borderRadius: 12, padding: "20px 18px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          <GeoIcon type={item.icon} size={64} style={{ marginBottom: 12 }}/>
          <h4 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{item.title}</h4>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

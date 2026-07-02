"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import { TicketIcon, ClockIcon, CheckCircleIcon, XIcon, GiftIcon } from "@/components/ui/Icons";
import { summarizeConditions } from "@/lib/vouchers/conditions";

type VoucherType = "PERCENT" | "FIXED_AMOUNT" | "FREE_TRIP";
type VoucherStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "EXHAUSTED";

interface Voucher {
  id: string; code: string; name: string; description?: string;
  type: VoucherType; value: number; minOrderValue: number; maxDiscount?: number;
  usageLimit?: number; usedCount: number; userLimit: number;
  startsAt: string; expiresAt: string; status: VoucherStatus;
  conditions?: Record<string, unknown>;
}

const fmtMoney = (n: number) => n.toLocaleString("vi-VN") + "đ";

function daysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function VoucherValueBadge({ type, value, maxDiscount }: { type: VoucherType; value: number; maxDiscount?: number }) {
  if (type === "PERCENT") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>
          {value}<span style={{ fontSize: 20 }}>%</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {maxDiscount ? `Tối đa ${fmtMoney(maxDiscount)}` : "Không giới hạn"}
        </div>
      </div>
    );
  }
  if (type === "FIXED_AMOUNT") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Giảm</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>
          {fmtMoney(value)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center" }}>
      <GiftIcon size={28} color="#f97316" />
      <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", marginTop: 4 }}>Miễn phí</div>
    </div>
  );
}

function VoucherCard({ v, onCopy, copied }: { v: Voucher; onCopy: (code: string) => void; copied: boolean }) {
  const days = daysLeft(v.expiresAt);
  const urgent = days <= 3;
  const usedPct = v.usageLimit ? Math.min(100, v.usedCount / v.usageLimit * 100) : 0;

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      display: "flex", flexDirection: "column",
      boxShadow: "0 2px 16px rgba(0,0,0,.12)",
      transition: "transform .2s, box-shadow .2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,.12)"; }}
    >
      {/* Top stripe */}
      <div style={{
        height: 6,
        background: "linear-gradient(90deg, #f97316, var(--brand-amber))",
      }} />

      {/* Body */}
      <div style={{ padding: "20px 20px 0", display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Value */}
        <div style={{
          width: 80, flexShrink: 0, padding: "12px 8px",
          background: "rgba(249,115,22,.08)", borderRadius: 12,
          border: "1px solid rgba(249,115,22,.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <VoucherValueBadge type={v.type} value={v.value} maxDiscount={v.maxDiscount} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>{v.name}</div>
          {v.description && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, lineHeight: 1.5 }}>{v.description}</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {summarizeConditions({ minOrderValue: v.minOrderValue, userLimit: v.userLimit }, v.conditions).map((t, i) => (
              <span key={i} style={{ fontSize: 11, background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "2px 6px", color: "var(--text-muted)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Usage progress */}
      {v.usageLimit && (
        <div style={{ padding: "8px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            <span>Đã dùng</span>
            <span>{v.usedCount} / {v.usageLimit} lượt</span>
          </div>
          <div style={{ height: 4, background: "var(--bg-overlay)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: usedPct > 80 ? "var(--danger)" : "#f97316", width: `${usedPct}%`, transition: "width .4s" }} />
          </div>
        </div>
      )}

      {/* Divider – dashed cut effect */}
      <div style={{ margin: "16px 20px", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", marginLeft: -28, flexShrink: 0 }} />
        <div style={{ flex: 1, borderTop: "1.5px dashed var(--border-subtle)" }} />
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", marginRight: -28, flexShrink: 0 }} />
      </div>

      {/* Footer */}
      <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {/* Expiry */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: urgent ? "var(--danger)" : "var(--text-muted)" }}>
          <ClockIcon size={13} color={urgent ? "var(--danger)" : "currentColor"} />
          {days === 0 ? "Hết hạn hôm nay!" : `Còn ${days} ngày`}
        </div>

        {/* Copy code + use button */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Code + copy */}
          <button
            onClick={() => onCopy(v.code)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8, cursor: "pointer",
              background: copied ? "rgba(52,211,153,.1)" : "var(--bg-overlay)",
              border: `1px solid ${copied ? "rgba(52,211,153,.4)" : "var(--border-subtle)"}`,
              color: copied ? "var(--brand-emerald)" : "var(--text-secondary)",
              fontSize: 12, fontWeight: 600, transition: "all .2s",
            }}>
            {copied ? <CheckCircleIcon size={13} /> : <TicketIcon size={13} />}
            <span style={{ fontFamily: "monospace", letterSpacing: "0.06em" }}>{v.code}</span>
            <span style={{ fontSize: 10, opacity: .7 }}>{copied ? "Đã sao!" : "Sao chép"}</span>
          </button>

          {/* Use in booking */}
          <a href="/customer"
            style={{
              padding: "7px 14px", borderRadius: 8,
              background: "linear-gradient(90deg,#f97316,var(--brand-amber))",
              color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none",
              boxShadow: "0 2px 8px rgba(249,115,22,.4)",
              whiteSpace: "nowrap",
            }}>
            Đặt ngay →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CustomerVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "percent" | "fixed" | "free">("all");

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ vouchers: Voucher[] }>("/customer/vouchers")
      .then(r => setVouchers(r.data.vouchers ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = vouchers.filter(v => {
    if (filter === "percent") return v.type === "PERCENT";
    if (filter === "fixed")   return v.type === "FIXED_AMOUNT";
    if (filter === "free")    return v.type === "FREE_TRIP";
    return true;
  });

  const urgentCount = vouchers.filter(v => daysLeft(v.expiresAt) <= 3).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TicketIcon size={20} color="#f97316" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Voucher của tôi</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Các mã giảm giá khả dụng cho tài khoản của bạn</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: "14px 18px", background: "linear-gradient(135deg, rgba(249,115,22,.1), rgba(251,191,36,.05))", border: "1px solid rgba(249,115,22,.2)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Khả dụng</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f97316" }}>{vouchers.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>voucher đang chờ bạn</div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Sắp hết hạn</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: urgentCount > 0 ? "var(--danger)" : "var(--text-muted)" }}>{urgentCount}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>hết hạn trong 3 ngày</div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Tiết kiệm tối đa</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--brand-emerald)" }}>
            {vouchers.length > 0
              ? fmtMoney(Math.max(...vouchers.map(v => v.type === "FIXED_AMOUNT" ? v.value : v.maxDiscount ?? 0)))
              : "–"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>từ một voucher</div>
        </div>
      </div>

      {/* How to use banner */}
      <div style={{
        marginBottom: 20, padding: "12px 16px", borderRadius: 12,
        background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <GiftIcon size={16} color="var(--brand-primary)" />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-primary)" }}>Cách dùng:</strong> Sao chép mã voucher → Vào <a href="/customer" style={{ color: "var(--brand-primary)" }}>Đặt chuyến</a> → Nhập mã ở bước Xác nhận → Nhấn <strong>Áp dụng</strong> để giảm giá ngay.
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "all",     label: `Tất cả (${vouchers.length})` },
          { key: "percent", label: `Giảm % (${vouchers.filter(v => v.type === "PERCENT").length})` },
          { key: "fixed",   label: `Giảm tiền (${vouchers.filter(v => v.type === "FIXED_AMOUNT").length})` },
          { key: "free",    label: `Miễn phí (${vouchers.filter(v => v.type === "FREE_TRIP").length})` },
        ].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setFilter(key as typeof filter)}
            style={{
              padding: "7px 14px", borderRadius: 99, border: "1px solid var(--border-subtle)",
              background: filter === key ? "#f97316" : "var(--bg-overlay)",
              color: filter === key ? "#fff" : "var(--text-secondary)",
              fontWeight: filter === key ? 700 : 400, fontSize: 12, cursor: "pointer",
              transition: "all .15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Voucher grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(249,115,22,.2)", borderTopColor: "#f97316", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải voucher...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--bg-surface)", borderRadius: 16,
          border: "1px dashed var(--border-subtle)",
        }}>
          <XIcon size={40} color="var(--text-muted)" style={{ opacity: .3, margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            {filter === "all" ? "Chưa có voucher nào" : "Không có voucher loại này"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Theo dõi các chương trình khuyến mãi của Thuận Chuyến để nhận voucher mới
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {filtered.map(v => (
            <VoucherCard
              key={v.id}
              v={v}
              onCopy={copyCode}
              copied={copied === v.code}
            />
          ))}
        </div>
      )}

      {/* Sắp hết hạn warning section */}
      {urgentCount > 0 && (
        <div style={{ marginTop: 24, padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
            <ClockIcon size={14} /> {urgentCount} voucher sẽ hết hạn trong 3 ngày — Dùng ngay để không bỏ lỡ!
          </div>
        </div>
      )}
    </div>
  );
}

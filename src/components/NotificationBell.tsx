"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api/client";

interface Notification {
  id: string;
  event: string;
  channel: string;
  status: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  TRIP_ACCEPTED:        { label: "Tài xế đã nhận cuốc",    icon: "🚗" },
  PAYMENT_SUCCESS:      { label: "Thanh toán thành công",   icon: "💳" },
  TRIP_STARTED:         { label: "Chuyến đã bắt đầu",       icon: "🟢" },
  TRIP_COMPLETED:       { label: "Chuyến hoàn thành",       icon: "✅" },
  WALLET_CREDIT:        { label: "Tiền vào ví",             icon: "💰" },
  WITHDRAWAL_APPROVED:  { label: "Rút tiền được duyệt",     icon: "✅" },
  WITHDRAWAL_REJECTED:  { label: "Rút tiền bị từ chối",     icon: "❌" },
  KYC_APPROVED:         { label: "KYC được duyệt",          icon: "🎉" },
  KYC_REJECTED:         { label: "KYC bị từ chối",          icon: "⚠️" },
  DIRECT_BOOK_REQUESTED:{ label: "Có yêu cầu đặt xe mới",  icon: "📋" },
};

export default function NotificationBell() {
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch recent notification logs
    api.get<{ items: Notification[] }>("/me/notifications").then((r) => {
      setItems(r.data.items ?? []);
      setUnread((r.data.items ?? []).filter((n) => n.status === "SENT").length);
    }).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) setUnread(0);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          background: "none", border: "none", cursor: "pointer",
          width: 38, height: 38, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-secondary)", fontSize: 20, position: "relative",
          transition: "background .15s",
        }}
        title="Thông báo"
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--danger)", color: "#fff",
            fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulse4 2s infinite",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 9999,
          width: 320, maxHeight: 420, overflowY: "auto",
          background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
          borderRadius: 14, boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Thông báo</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{items.length} gần nhất</span>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              Chưa có thông báo nào
            </div>
          ) : (
            items.slice(0, 10).map((n) => {
              const ev = EVENT_LABELS[n.event] ?? { label: n.event, icon: "📢" };
              return (
                <div key={n.id} style={{
                  display: "flex", gap: 12, padding: "12px 16px",
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "transparent", transition: "background .15s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "var(--bg-overlay)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {ev.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(n.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, flexShrink: 0, alignSelf: "flex-start", marginTop: 4,
                    color: n.status === "SENT" ? "var(--brand-emerald)" : n.status === "FAILED" ? "var(--danger)" : "var(--text-secondary)",
                  }}>
                    {n.status === "SENT" ? "✓" : n.status === "FAILED" ? "✗" : "…"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <style>{`@keyframes pulse4{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}`}</style>
    </div>
  );
}

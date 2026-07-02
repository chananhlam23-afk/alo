"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PackageIcon, MapPinIcon, CoinIcon, ClockIcon, RefreshIcon, CheckCircleIcon } from "@/components/ui/Icons";

interface CargoItem {
  id: string;
  description: string;
  weightKg: number;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number; pickupLng: number;
  dropoffLat: number; dropoffLng: number;
  quotedPrice: number;
  status: string;
  createdAt: string;
  customer?: { fullName: string | null };
}

export default function DriverCargoPage() {
  const [items,    setItems]    = useState<CargoItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [noAccess, setNoAccess] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError("");
    api.get<{ items: CargoItem[]; message?: string }>("/driver/cargo")
      .then((r) => {
        if (r.data.message) setNoAccess(r.data.message);
        else setNoAccess(null);
        setItems(r.data.items);
      })
      .catch((e: { status?: number; message?: string }) => {
        if (e?.status === 403 || e?.status === 404) setNoAccess(e.message ?? "Chưa có quyền xem hàng ghép");
        else setError("Không tải được danh sách hàng ghép");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <PackageIcon size={22} color="var(--brand-secondary)"/> Hàng ghép
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Đơn hàng nhỏ gần tuyến đường của bạn</p>
        </div>
        <button onClick={load} disabled={loading} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)" }}>
          <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {noAccess && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(34,211,238,.06)", border: "1px solid rgba(34,211,238,.25)", borderRadius: 18 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-secondary)", marginBottom: 6 }}>Chưa bật ghép hàng</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px" }}>
            {noAccess === "Tài xế chưa bật ghép hàng"
              ? "Bạn cần bật tính năng ghép hàng trong hồ sơ KYC để xem và nhận đơn hàng."
              : noAccess}
          </div>
          <a href="/driver/kyc" style={{ display: "inline-block", padding: "10px 24px", background: "var(--grad-primary)", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none", boxShadow: "var(--glow-sm)" }}>
            Cập nhật hồ sơ →
          </a>
        </div>
      )}

      {loading && !noAccess && (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "var(--brand-primary)", animation: "spin .8s linear infinite" }}/>
        </div>
      )}

      {!loading && !noAccess && !error && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)", borderRadius: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Không có hàng ghép gần đây</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Hệ thống sẽ hiển thị đơn hàng nhỏ gần tuyến đường của bạn khi có.</div>
        </div>
      )}

      {!noAccess && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item) => (
            <div key={item.id} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 16, overflow: "hidden",
              transition: "border-color .2s, box-shadow .2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-secondary)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(34,211,238,.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ padding: "9px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                  <PackageIcon size={12} color="var(--brand-secondary)"/> {item.weightKg} kg
                </span>
                <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(52,211,153,.15)", color: "var(--brand-emerald)", border: "1px solid rgba(52,211,153,.3)" }}>
                  Chờ ghép
                </span>
              </div>

              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                  {item.description}
                </div>

                <div style={{ background: "var(--bg-overlay)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <MapPinIcon size={13} color="var(--brand-secondary)" style={{ flexShrink: 0, marginTop: 2 }}/>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--brand-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>Lấy hàng</div>
                      <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{item.pickupAddress}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <MapPinIcon size={13} color="var(--brand-pink)" style={{ flexShrink: 0, marginTop: 2 }}/>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--brand-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>Giao hàng</div>
                      <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{item.dropoffAddress}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <CoinIcon size={14} color="var(--brand-amber)"/>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--brand-amber)" }}>
                      {item.quotedPrice.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                    <ClockIcon size={11} color="var(--brand-primary)"/>
                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

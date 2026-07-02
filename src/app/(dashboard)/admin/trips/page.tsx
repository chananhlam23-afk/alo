"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import {
  RouteIcon, RefreshIcon, AlertTriangleIcon, CheckCircleIcon,
  WalletIcon, ClockIcon, UserIcon, PhoneIcon, MapPinIcon,
  ChevronDownIcon, ChevronUpIcon, MergeIcon,
} from "@/components/ui/Icons";

interface Passenger {
  id: string;
  legStatus: string;
  pickupOrder: number | null;
  seats: number;
  fareShare: number;
  request: {
    id: string;
    passengerName: string;
    passengerPhone: string;
    pickupAddress: string;
    dropoffAddress: string;
    departureTime: string;
    seats: number;
    quotedPrice: number;
  } | null;
}

interface Trip {
  id: string;
  status: string;
  seatsTotal: number;
  seatsFilled: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  driverProfile: { id: string; vehiclePlate: string; user: { fullName: string | null; phone: string } };
  passengers: Passenger[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ", ACTIVE: "Đã đặt", ONGOING: "Đang chạy",
  COMPLETED: "Hoàn thành", CANCELLED: "Hủy",
};

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  PENDING:   { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.3)"  },
  ACTIVE:    { color: "#22d3ee", bg: "rgba(34,211,238,.12)",  border: "rgba(34,211,238,.3)"  },
  ONGOING:   { color: "#6366f1", bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.3)"  },
  COMPLETED: { color: "#34d399", bg: "rgba(52,211,153,.12)",  border: "rgba(52,211,153,.3)"  },
  CANCELLED: { color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.3)" },
};

const LEG_STATUS_LABEL: Record<string, string> = {
  WAITING:   "Chờ đón",
  PICKED_UP: "Đã lên xe",
  DROPPED:   "Đã trả",
  NO_SHOW:   "Không lên",
};
const LEG_STATUS_COLOR: Record<string, string> = {
  WAITING:   "#fbbf24",
  PICKED_UP: "#34d399",
  DROPPED:   "#94a3b8",
  NO_SHOW:   "#f87171",
};

interface RefundState { tripId: string; amount: string; reason: string }

// ── Passenger row ─────────────────────────────────────────────────────────────
function PassengerPanel({ passengers }: { passengers: Passenger[] }) {
  if (passengers.length === 0) {
    return (
      <div style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>
        Chưa có hành khách
      </div>
    );
  }
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10, paddingTop: 4 }}>
        {passengers.length} hành khách
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {passengers.map((p, idx) => (
          <div key={p.id} style={{
            background: "var(--bg-base)", border: "1px solid var(--border-subtle)",
            borderRadius: 10, padding: "10px 14px",
            display: "grid", gridTemplateColumns: "24px 1fr 1fr auto", gap: 10, alignItems: "start",
          }}>
            {/* order badge */}
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(99,102,241,.15)", color: "var(--brand-violet)", fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{idx + 1}</div>

            {/* Name + phone */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                <UserIcon size={12} color="var(--text-muted)"/>
                {p.request?.passengerName ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <PhoneIcon size={11} color="var(--text-muted)"/>
                {p.request?.passengerPhone ?? "—"}
              </div>
            </div>

            {/* Route */}
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 3 }}>
                <MapPinIcon size={11} color="#22d3ee" style={{ marginTop: 1, flexShrink: 0 }}/>
                <span style={{ lineHeight: 1.4 }}>{p.request?.pickupAddress ?? "—"}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "flex-start", gap: 4 }}>
                <MapPinIcon size={11} color="#f472b6" style={{ marginTop: 1, flexShrink: 0 }}/>
                <span style={{ lineHeight: 1.4 }}>{p.request?.dropoffAddress ?? "—"}</span>
              </div>
            </div>

            {/* Leg status + fare */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: LEG_STATUS_COLOR[p.legStatus] ?? "#94a3b8",
                background: (LEG_STATUS_COLOR[p.legStatus] ?? "#94a3b8") + "20",
                border: `1px solid ${(LEG_STATUS_COLOR[p.legStatus] ?? "#94a3b8")}40`,
                borderRadius: 99, padding: "2px 8px", marginBottom: 4, whiteSpace: "nowrap",
              }}>
                {LEG_STATUS_LABEL[p.legStatus] ?? p.legStatus}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {p.fareShare.toLocaleString("vi-VN")}đ · {p.seats} ghế
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminTripsPage() {
  const [items, setItems]         = useState<Trip[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [status, setStatus]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [refund, setRefund]       = useState<RefundState | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundErr, setRefundErr] = useState("");
  const [success, setSuccess]     = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [merging, setMerging]     = useState(false);

  const load = useCallback((p = page, s = status) => {
    setLoading(true); setError("");
    const q = new URLSearchParams({ page: String(p), limit: "20", ...(s ? { status: s } : {}) });
    api.get<{ items: Trip[]; total: number }>(`/admin/trips?${q}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => setError("Không tải được danh sách chuyến"))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { load(); }, []);

  const submitRefund = async () => {
    if (!refund) return;
    const amount = Number(refund.amount);
    if (!amount || amount <= 0) { setRefundErr("Nhập số tiền hợp lệ"); return; }
    if (!refund.reason.trim())  { setRefundErr("Nhập lý do hoàn tiền"); return; }
    setRefunding(true); setRefundErr("");
    try {
      await api.post(`/admin/trips/${refund.tripId}/refund`, { amount, reason: refund.reason });
      setRefund(null);
      setSuccess("Đã hoàn tiền thành công");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch (e) { setRefundErr((e as Error).message); }
    finally { setRefunding(false); }
  };

  // Gộp tất cả PENDING trips của cùng tài xế
  const consolidate = async (driverProfileId: string) => {
    if (!confirm("Gộp tất cả chuyến PENDING của tài xế này thành một chuyến?")) return;
    setMerging(true); setError("");
    try {
      const r = await api.post<{ mergedTripId: string; cancelledTripIds: string[]; totalPassengers: number }>(
        "/admin/trips/consolidate",
        { driverProfileId },
      );
      setSuccess(`Đã gộp thành công! ${r.data.totalPassengers} hành khách trong chuyến ${r.data.mergedTripId.slice(-8)}`);
      setTimeout(() => setSuccess(""), 5000);
      setExpanded(r.data.mergedTripId);
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setMerging(false); }
  };

  const totalPages = Math.ceil(total / 20);

  // Nhóm các PENDING trips theo driverProfileId để hiện nút "Gộp"
  const pendingByDriver = items
    .filter((t) => t.status === "PENDING")
    .reduce<Record<string, Trip[]>>((acc, t) => {
      const key = t.driverProfile.id;
      acc[key] = [...(acc[key] ?? []), t];
      return acc;
    }, {});

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <RouteIcon size={22} color="#a78bfa"/> Quản lý chuyến xe
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:13 }}>Tổng {total} chuyến</p>
        </div>
        <button onClick={() => load()} disabled={loading} style={{
          width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
          background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
          cursor:"pointer", color:"var(--text-muted)",
        }}>
          <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
        </button>
      </div>

      {/* Filter */}
      <div style={{
        display:"flex", alignItems:"center", gap:12, marginBottom:20,
        background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
        borderRadius:14, padding:"12px 16px", flexWrap:"wrap",
      }}>
        {["", "PENDING", "ACTIVE", "ONGOING", "COMPLETED", "CANCELLED"].map((s) => {
          const active = status === s;
          const col = s ? STATUS_COLORS[s] : null;
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); load(1, s); }}
              style={{
                padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:600, cursor:"pointer",
                background: active ? (col?.bg ?? "rgba(99,102,241,.15)") : "transparent",
                border: `1px solid ${active ? (col?.border ?? "rgba(99,102,241,.35)") : "var(--border-subtle)"}`,
                color: active ? (col?.color ?? "var(--brand-violet)") : "var(--text-muted)",
                transition:"all .15s",
              }}
            >
              {s === "" ? "Tất cả" : STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* Consolidate suggestion banners */}
      {Object.entries(pendingByDriver).filter(([, trips]) => trips.length > 1).map(([driverId, trips]) => (
        <div key={driverId} style={{
          display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderRadius:12, marginBottom:12,
          background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.3)",
        }}>
          <MergeIcon size={16} color="#fbbf24"/>
          <div style={{ flex:1, fontSize:13, color:"var(--text-secondary)" }}>
            Tài xế <strong style={{ color:"var(--text-primary)" }}>{trips[0].driverProfile.user.fullName ?? trips[0].driverProfile.vehiclePlate}</strong>{" "}
            có <strong style={{ color:"var(--brand-amber)" }}>{trips.length} chuyến PENDING</strong> — có thể gộp lại thành 1 chuyến
          </div>
          <button
            disabled={merging}
            onClick={() => consolidate(driverId)}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
              background:"rgba(251,191,36,.15)", border:"1px solid rgba(251,191,36,.4)",
              borderRadius:8, color:"var(--brand-amber)", fontWeight:700, fontSize:12, cursor:"pointer",
              opacity: merging ? .6 : 1, whiteSpace:"nowrap",
            }}>
            <MergeIcon size={12}/> {merging ? "Đang gộp..." : "Gộp chuyến"}
          </button>
        </div>
      ))}

      {/* Alerts */}
      {error && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
          <AlertTriangleIcon size={13}/> {error}
        </div>
      )}
      {success && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)", color:"var(--brand-emerald)", fontSize:13 }}>
          <CheckCircleIcon size={13}/> {success}
        </div>
      )}

      {/* Refund modal */}
      {refund && (
        <div style={{
          background:"var(--bg-surface)", border:"1px solid var(--border-medium)",
          borderRadius:16, padding:20, marginBottom:20, boxShadow:"var(--shadow-md)",
        }}>
          <div style={{ fontWeight:700, fontSize:15, color:"var(--text-primary)", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <WalletIcon size={16} color="#34d399"/> Hoàn tiền cho chuyến #{refund.tripId.slice(-8)}
          </div>
          {refundErr && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, marginBottom:12,
              background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:12 }}>
              <AlertTriangleIcon size={12}/> {refundErr}
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:6 }}>
                Số tiền hoàn (VND)
              </label>
              <input type="number" value={refund.amount}
                onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
                placeholder="150000"
                style={{ width:"100%", padding:"10px 12px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                  borderRadius:8, color:"var(--text-primary)", fontSize:13, outline:"none" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:6 }}>
                Lý do
              </label>
              <input type="text" value={refund.reason}
                onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
                placeholder="Tài xế hủy chuyến..."
                style={{ width:"100%", padding:"10px 12px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                  borderRadius:8, color:"var(--text-primary)", fontSize:13, outline:"none" }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={submitRefund} disabled={refunding}
              style={{ padding:"9px 20px", background:"linear-gradient(135deg,#34d399,#059669)", border:"none",
                borderRadius:10, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
                opacity: refunding ? .7 : 1, display:"flex", alignItems:"center", gap:6 }}>
              {refunding ? "Đang xử lý..." : <><CheckCircleIcon size={14}/> Xác nhận hoàn tiền</>}
            </button>
            <button onClick={() => { setRefund(null); setRefundErr(""); }}
              style={{ padding:"9px 20px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                borderRadius:10, color:"var(--text-muted)", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620, fontSize:13 }}>
            <thead>
              <tr style={{ background:"var(--bg-overlay)" }}>
                {["ID", "Tài xế", "Biển số", "Ghế", "Trạng thái", "Bắt đầu", "Hoàn thành", ""].map((h) => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700,
                    color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.8,
                    borderBottom:"1px solid var(--border-subtle)", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr><td colSpan={8} style={{ textAlign:"center", padding:40 }}>
                  <div style={{ width:28, height:28, border:"3px solid rgba(167,139,250,.2)", borderTopColor:"var(--brand-violet)",
                    borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto" }}/>
                </td></tr>
              </tbody>
            ) : items.length === 0 ? (
              <tbody>
                <tr><td colSpan={8} style={{ textAlign:"center", padding:40, color:"var(--text-muted)" }}>
                  Không có dữ liệu
                </td></tr>
              </tbody>
            ) : items.map((t) => {
              const sc  = STATUS_COLORS[t.status] ?? STATUS_COLORS.CANCELLED;
              const isExpanded = expanded === t.id;
              return (
                <tbody key={t.id}>
                  <tr
                      onClick={() => setExpanded(isExpanded ? null : t.id)}
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        background: isExpanded ? "var(--bg-overlay)" : "transparent",
                        transition: "background .15s",
                      }}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:"var(--text-muted)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          {isExpanded
                            ? <ChevronUpIcon size={13} color="#a78bfa"/>
                            : <ChevronDownIcon size={13} color="var(--text-muted)"/>
                          }
                          {t.id.slice(-8)}
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px", fontWeight:500, color:"var(--text-primary)" }}>
                        {t.driverProfile.user.fullName ?? t.driverProfile.user.phone}
                      </td>
                      <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--text-secondary)" }}>{t.driverProfile.vehiclePlate}</td>
                      <td style={{ padding:"12px 14px", color:"var(--text-secondary)" }}>
                        <span style={{ fontWeight:700, color: t.seatsFilled > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {t.seatsFilled}
                        </span>/{t.seatsTotal}
                        {t.passengers.length > 0 && (
                          <span style={{ marginLeft:6, fontSize:10, color:"var(--brand-violet)", fontWeight:600 }}>
                            ({t.passengers.length} KH)
                          </span>
                        )}
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                          background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                        {t.startedAt ? (
                          <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <ClockIcon size={11} color="#6366f1"/>
                            {new Date(t.startedAt).toLocaleString("vi-VN")}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                        {t.completedAt ? new Date(t.completedAt).toLocaleString("vi-VN") : "—"}
                      </td>
                      <td style={{ padding:"12px 14px" }} onClick={(e) => e.stopPropagation()}>
                        {t.status === "COMPLETED" && (
                          <button onClick={() => { setRefund({ tripId: t.id, amount: "", reason: "" }); setRefundErr(""); }}
                            style={{ padding:"5px 12px", background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)",
                              borderRadius:8, color:"var(--brand-emerald)", fontWeight:600, fontSize:11, cursor:"pointer",
                              display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
                            <WalletIcon size={11}/> Hoàn tiền
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded passenger panel */}
                    {isExpanded && (
                      <tr key={`${t.id}-passengers`}>
                        <td colSpan={8} style={{
                          background: "var(--bg-overlay)",
                          borderBottom: "1px solid var(--border-subtle)",
                          padding: 0,
                        }}>
                          <div style={{ borderLeft: "3px solid var(--brand-violet)", margin: "0 0 0 16px" }}>
                            <PassengerPanel passengers={t.passengers} />
                          </div>
                        </td>
                      </tr>
                    )}
                </tbody>
              );
            })}
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderTop:"1px solid var(--border-subtle)" }}>
            <button disabled={page === 1} onClick={() => { setPage(page - 1); load(page - 1); }}
              style={{ padding:"6px 14px", borderRadius:8, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize:12, fontWeight:600 }}>
              ← Trước
            </button>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>Trang {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}
              style={{ padding:"6px 14px", borderRadius:8, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                color: page >= totalPages ? "var(--text-muted)" : "var(--text-secondary)", cursor: page >= totalPages ? "not-allowed" : "pointer",
                fontSize:12, fontWeight:600 }}>
              Sau →
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import {
  HistoryIcon, SeatIcon, ClockIcon, CheckCircleIcon,
  AlertTriangleIcon, RefreshIcon, XIcon, ActivityIcon,
} from "@/components/ui/Icons";
import dynamic from "next/dynamic";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

interface Trip {
  id: string;
  status: string;
  seatsTotal: number;
  seatsFilled: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label:"Chờ",         color:"#fbbf24", bg:"rgba(251,191,36,.12)",  border:"rgba(251,191,36,.3)"  },
  ACTIVE:    { label:"Đã đặt",      color:"#22d3ee", bg:"rgba(34,211,238,.12)",  border:"rgba(34,211,238,.3)"  },
  ONGOING:   { label:"Đang chạy",   color:"#6366f1", bg:"rgba(99,102,241,.12)",  border:"rgba(99,102,241,.3)"  },
  COMPLETED: { label:"Hoàn thành",  color:"#34d399", bg:"rgba(52,211,153,.12)",  border:"rgba(52,211,153,.3)"  },
  CANCELLED: { label:"Đã hủy",      color:"#94a3b8", bg:"rgba(148,163,184,.12)", border:"rgba(148,163,184,.3)" },
};

const FILTERS = ["", "ACTIVE", "ONGOING", "COMPLETED", "CANCELLED"];

export default function DriverTripsPage() {
  const [items,   setItems]   = useState<Trip[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = (p = page, s = status) => {
    setLoading(true); setError("");
    const q = new URLSearchParams({ page: String(p), limit: "20", ...(s ? { status: s } : {}) });
    api.get<{ items: Trip[]; total: number; totalPages: number }>(`/driver/trips?${q}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => setError("Không tải được lịch sử chuyến"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ maxWidth:720 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <HistoryIcon size={22} color="var(--brand-violet)"/> Lịch sử chuyến
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:13 }}>Tổng {total} chuyến</p>
        </div>
        <button onClick={() => load()} disabled={loading} style={{
          width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
          background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)", cursor:"pointer", color:"var(--text-muted)",
        }}>
          <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
        </button>
      </div>

      {/* Filter chips */}
      <div style={{
        display:"flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap",
        background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
        borderRadius:14, padding:"10px 14px",
      }}>
        {FILTERS.map((s) => {
          const active = status === s;
          const sc = s ? STATUS_CFG[s] : null;
          return (
            <button key={s} onClick={() => { setStatus(s); setPage(1); load(1, s); }}
              style={{
                padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:600, cursor:"pointer",
                background: active ? (sc?.bg ?? "rgba(167,139,250,.15)") : "transparent",
                border:`1px solid ${active ? (sc?.border ?? "rgba(167,139,250,.35)") : "var(--border-subtle)"}`,
                color: active ? (sc?.color ?? "var(--brand-violet)") : "var(--text-muted)",
                transition:"all .15s",
              }}>
              {s === "" ? "Tất cả" : STATUS_CFG[s]?.label ?? s}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
          <AlertTriangleIcon size={13}/> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:48 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(167,139,250,.2)", borderTopColor:"var(--brand-violet)", animation:"spin .8s linear infinite" }}/>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 20px", background:"var(--bg-surface)", border:"1px dashed var(--border-subtle)", borderRadius:18 }}>
          <div style={{ marginBottom:16, display:"flex", justifyContent:"center" }}>
            <GeoIcon type="route" size={72}/>
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 }}>Chưa có chuyến nào</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>
            {status ? "Không có chuyến nào với trạng thái này." : "Các chuyến hoàn thành sẽ hiển thị ở đây."}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {items.map((t) => {
              const sc = STATUS_CFG[t.status] ?? STATUS_CFG.CANCELLED;
              return (
                <div key={t.id} style={{
                  background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
                  borderRadius:14, padding:"14px 18px",
                  transition:"border-color .2s, box-shadow .2s",
                  display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--border-medium)"; e.currentTarget.style.boxShadow="var(--shadow-sm)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.boxShadow="none"; }}
                >
                  {/* Status pill */}
                  <div style={{
                    width:44, height:44, borderRadius:12, flexShrink:0,
                    background:sc.bg, border:`1px solid ${sc.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {t.status === "COMPLETED" ? <CheckCircleIcon size={20} color={sc.color}/>
                     : t.status === "CANCELLED" ? <XIcon size={20} color={sc.color}/>
                     : t.status === "ONGOING"   ? <ActivityIcon size={20} color={sc.color}/>
                     : <ClockIcon size={20} color={sc.color}/>}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"monospace", fontSize:12, color:"var(--text-muted)", background:"var(--bg-overlay)", padding:"1px 6px", borderRadius:4 }}>
                        #{t.id.slice(-8)}
                      </span>
                      <span style={{
                        padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                        background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`,
                      }}>{sc.label}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                      <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"var(--text-secondary)" }}>
                        <SeatIcon size={12} color="var(--brand-primary)"/>
                        {t.seatsFilled}/{t.seatsTotal} ghế
                      </span>
                      {t.startedAt && (
                        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"var(--text-muted)" }}>
                          <ClockIcon size={12} color="var(--brand-secondary)"/>
                          {new Date(t.startedAt).toLocaleString("vi-VN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" })}
                        </span>
                      )}
                      {t.completedAt && (
                        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"var(--text-muted)" }}>
                          <CheckCircleIcon size={12} color="var(--brand-emerald)"/>
                          {new Date(t.completedAt).toLocaleString("vi-VN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Created date */}
                  <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"right", flexShrink:0 }}>
                    {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:20 }}>
              <button disabled={page === 1} onClick={() => { setPage(page - 1); load(page - 1); }}
                style={{ padding:"7px 16px", borderRadius:8, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                  color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer",
                  fontSize:12, fontWeight:600 }}>
                ← Trước
              </button>
              <span style={{ fontSize:12, color:"var(--text-muted)" }}>Trang {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}
                style={{ padding:"7px 16px", borderRadius:8, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                  color: page >= totalPages ? "var(--text-muted)" : "var(--text-secondary)", cursor: page >= totalPages ? "not-allowed" : "pointer",
                  fontSize:12, fontWeight:600 }}>
                Sau →
              </button>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

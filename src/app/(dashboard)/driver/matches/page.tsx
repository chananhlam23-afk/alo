"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import dynamic from "next/dynamic";
import {
  MapPinIcon, ClockIcon, SeatIcon, RouteIcon, CoinIcon,
  CheckCircleIcon, AlertTriangleIcon, RefreshIcon, RulerIcon, SearchIcon,
} from "@/components/ui/Icons";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────

interface Match {
  id: string; detourKm: number; fareShare: number; driverNet: number; expiresAt: string;
  request: {
    pickupAddress: string; dropoffAddress: string;
    departureTime: string; seats: number; distanceKm: number;
  };
}

interface OpenRequest {
  id: string;
  pickupAddress: string; dropoffAddress: string;
  passengerName?: string;
  departureTime: string; seats: number;
  quotedPrice: number; distanceKm: number; durationMin: number;
  bookingMode?: string;
  alreadyOffered?: boolean;
  customer?: { fullName: string | null };
}

type Tab = "suggested" | "browse";

// ── Page ─────────────────────────────────────────────────────────────

export default function DriverMatchesPage() {
  const [tab, setTab] = useState<Tab>("suggested");

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-overlay)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        <TabBtn active={tab === "suggested"} onClick={() => setTab("suggested")} label="Gợi ý từ hệ thống"/>
        <TabBtn active={tab === "browse"} onClick={() => setTab("browse")} label="Tìm đơn" icon="🔍"/>
      </div>

      {tab === "suggested" ? <SuggestedTab/> : <BrowseTab/>}
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 9, cursor: "pointer",
      background: active ? "var(--grad-primary)" : "transparent",
      border: "none", color: active ? "#fff" : "var(--text-muted)",
      fontWeight: active ? 700 : 500, fontSize: 13,
      boxShadow: active ? "var(--glow-sm)" : "none",
      transition: "all .2s",
    }}>
      {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
      {label}
    </button>
  );
}

// ── Tab 1: Gợi ý từ hệ thống ─────────────────────────────────────────

function SuggestedTab() {
  const [items,        setItems]        = useState<Match[]>([]);
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [actionId,     setActionId]     = useState<string | null>(null);
  const [error,        setError]        = useState("");

  const load = useCallback(() => {
    setLoading(true); setError("");
    api.get<{ items: Match[]; openRequests: OpenRequest[] }>("/driver/matches")
      .then((r) => { setItems(r.data.items); setOpenRequests(r.data.openRequests ?? []); })
      .catch((e: Error) => setError(e.message || "Không tải được danh sách chuyến"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const accept = async (id: string) => {
    setActionId(id); setError("");
    try {
      await api.post(`/driver/matches/${id}/accept`, {});
      window.location.href = "/driver";
    } catch (e) { setError((e as Error).message); setActionId(null); }
  };

  const reject = async (id: string) => {
    setActionId(id);
    try { await api.post(`/driver/matches/${id}/reject`, {}); load(); }
    finally { setActionId(null); }
  };

  const takeOpen = async (id: string) => {
    setActionId(id); setError("");
    try {
      await api.post(`/driver/open-requests/${id}/take`, {});
      window.location.href = "/driver";
    } catch (e) { setError((e as Error).message); setActionId(null); }
  };

  const total = items.length + openRequests.length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <RouteIcon size={18} color="var(--brand-secondary)"/>
            Chuyến chờ nhận
            {total > 0 && (
              <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: "rgba(34,211,238,.15)", color: "var(--brand-secondary)", border: "1px solid rgba(34,211,238,.3)" }}>
                {total}
              </span>
            )}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Gợi ý từ hệ thống + đơn đang mở</p>
        </div>
        <button onClick={load} disabled={loading} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)", transition: "all .2s" }}>
          <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
        </button>
      </div>

      {error && <ErrorBanner msg={error}/>}

      {loading ? (
        <Spinner/>
      ) : total === 0 ? (
        <EmptyState onRefresh={load}/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((m) => (
            <MatchCard key={m.id} match={m} actionId={actionId} onAccept={accept} onReject={reject}/>
          ))}
          {openRequests.length > 0 && items.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}/>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>Đơn đang mở</span>
              <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}/>
            </div>
          )}
          {openRequests.map((r) => (
            <OpenRequestCard key={r.id} req={r} actionId={actionId} onTake={takeOpen}/>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ── Tab 2: Tìm đơn (browse mở) ────────────────────────────────────────

function BrowseTab() {
  const [items,   setItems]   = useState<OpenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [taking,  setTaking]  = useState<string | null>(null);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await api.get<{ items: OpenRequest[]; total: number }>(
        `/driver/open-requests?page=${page}&limit=${limit}`
      );
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const takeOrder = async (id: string) => {
    if (!confirm("Xác nhận nhận đơn hàng này?")) return;
    setTaking(id); setError(""); setSuccess("");
    try {
      await api.post(`/driver/open-requests/${id}/take`, {});
      setSuccess("Bạn đã nhận đơn thành công! Chuyển sang mục chuyến xe.");
      void load();
      setTimeout(() => { window.location.href = "/driver"; }, 1500);
    } catch (e) { setError((e as Error).message); }
    finally { setTaking(null); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <SearchIcon size={18} color="var(--brand-primary)"/>
            Đơn đang chờ tài xế
            {total > 0 && (
              <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: "rgba(99,102,241,.15)", color: "var(--brand-primary)", border: "1px solid rgba(99,102,241,.3)" }}>
                {total}
              </span>
            )}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Tất cả đơn chưa được nhận — bạn có thể nhận bất kỳ đơn nào</p>
        </div>
        <button onClick={load} disabled={loading} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)", transition: "all .2s" }}>
          <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
        </button>
      </div>

      {error && <ErrorBanner msg={error}/>}
      {success && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)", color: "var(--brand-emerald)", fontSize: 13, fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}

      {loading ? (
        <Spinner/>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)", borderRadius: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>Hiện không có đơn nào đang chờ tài xế.</p>
          <button onClick={load} style={{ padding: "8px 20px", background: "var(--grad-primary)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Kiểm tra lại</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((r) => (
              <div key={r.id} style={{
                background: "var(--bg-surface)", border: `1px solid ${r.alreadyOffered ? "rgba(99,102,241,.3)" : "var(--border-subtle)"}`,
                borderRadius: 16, overflow: "hidden", transition: "border-color .2s, box-shadow .2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.boxShadow = "var(--glow-sm)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = r.alreadyOffered ? "rgba(99,102,241,.3)" : "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Top bar */}
                <div style={{ padding: "9px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                      <SeatIcon size={12} color="var(--brand-primary)"/> {r.seats} ghế
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border-medium)" }}/>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                      <RulerIcon size={12} color="var(--brand-violet)"/> {r.distanceKm.toFixed(1)} km
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border-medium)" }}/>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                      <ClockIcon size={12} color="var(--brand-secondary)"/> ~{r.durationMin} phút
                    </span>
                  </div>
                  {r.alreadyOffered && (
                    <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,.15)", color: "var(--brand-primary)", border: "1px solid rgba(99,102,241,.3)" }}>
                      Đã quan tâm
                    </span>
                  )}
                </div>

                <div style={{ padding: 16 }}>
                  {/* Route */}
                  <div style={{ background: "var(--bg-overlay)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand-secondary)", marginTop: 4, flexShrink: 0 }}/>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--brand-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 1 }}>Điểm đón</div>
                        <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{r.pickupAddress}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--brand-pink)", marginTop: 4, flexShrink: 0 }}/>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--brand-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 1 }}>Điểm trả</div>
                        <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{r.dropoffAddress}</div>
                      </div>
                    </div>
                  </div>

                  {/* Time + price */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Giờ khởi hành</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {new Date(r.departureTime).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--brand-emerald)" }}>
                        {Math.round(r.quotedPrice * 0.85).toLocaleString("vi-VN")}đ
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        bạn nhận (~85%) · tổng {r.quotedPrice.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => takeOrder(r.id)}
                    disabled={taking === r.id}
                    style={{
                      width: "100%", padding: "10px",
                      background: "linear-gradient(135deg,#34d399,#059669)",
                      border: "none", borderRadius: 10, cursor: "pointer",
                      color: "#fff", fontWeight: 700, fontSize: 14,
                      boxShadow: "0 0 20px rgba(52,211,153,.35)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: taking === r.id ? .7 : 1, transition: "opacity .2s",
                    }}
                  >
                    {taking === r.id ? (
                      <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite", display: "inline-block" }}/>
                    ) : <CheckCircleIcon size={15}/>}
                    {taking === r.id ? "Đang nhận đơn..." : "Nhận đơn ngay"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 14px", borderRadius: 8, cursor: page === 1 ? "not-allowed" : "pointer", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: page === 1 ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13 }}>← Trước</button>
              <span style={{ padding: "6px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 14px", borderRadius: 8, cursor: page === totalPages ? "not-allowed" : "pointer", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13 }}>Sau →</button>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────

function OpenRequestCard({ req: r, actionId, onTake }: {
  req: OpenRequest; actionId: string | null;
  onTake: (id: string) => void;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: 16, overflow: "hidden", transition: "border-color .2s, box-shadow .2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.boxShadow = "var(--glow-sm)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ padding: "9px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10, background: "var(--bg-elevated)" }}>
        <SeatIcon size={12} color="var(--brand-primary)"/>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{r.seats} ghế</span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border-medium)" }}/>
        <RulerIcon size={12} color="var(--brand-violet)"/>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.distanceKm.toFixed(1)} km</span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border-medium)" }}/>
        <ClockIcon size={12} color="var(--brand-secondary)"/>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>~{r.durationMin} phút</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "var(--bg-overlay)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand-secondary)", marginTop: 4, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 10, color: "var(--brand-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 1 }}>Điểm đón</div>
              <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{r.pickupAddress}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--brand-pink)", marginTop: 4, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 10, color: "var(--brand-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 1 }}>Điểm trả</div>
              <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{r.dropoffAddress}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <ClockIcon size={13} color="var(--brand-primary)"/>
            {new Date(r.departureTime).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--brand-emerald)" }}>
              {Math.round(r.quotedPrice * 0.85).toLocaleString("vi-VN")}đ
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              bạn nhận (~85%) · tổng {r.quotedPrice.toLocaleString("vi-VN")}đ
            </div>
          </div>
        </div>
        <button
          onClick={() => onTake(r.id)}
          disabled={actionId === r.id}
          style={{
            width: "100%", padding: "10px",
            background: "linear-gradient(135deg,#34d399,#059669)",
            border: "none", borderRadius: 10, cursor: "pointer",
            color: "#fff", fontWeight: 700, fontSize: 14,
            boxShadow: "0 0 20px rgba(52,211,153,.35)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: actionId === r.id ? .7 : 1, transition: "opacity .2s",
          }}
        >
          {actionId === r.id ? (
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite", display: "inline-block" }}/>
          ) : <CheckCircleIcon size={15}/>}
          {actionId === r.id ? "Đang nhận..." : "Nhận đơn ngay"}
        </button>
      </div>
    </div>
  );
}

function MatchCard({ match: m, actionId, onAccept, onReject }: {
  match: Match; actionId: string | null;
  onAccept: (id: string) => void; onReject: (id: string) => void;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: 16, overflow: "hidden", transition: "border-color .2s, box-shadow .2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-secondary)"; e.currentTarget.style.boxShadow = "var(--glow-sm)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Top bar */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SeatIcon size={13} color="var(--brand-primary)"/>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{m.request.seats} ghế</span>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--border-medium)" }}/>
          <RulerIcon size={12} color="var(--brand-violet)"/>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {m.request.distanceKm.toFixed(1)} km{m.detourKm > 0 ? ` (+${m.detourKm.toFixed(1)} km vòng)` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--brand-amber)" }}>
          <ClockIcon size={11}/> <Countdown expiresAt={m.expiresAt}/>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ background: "var(--bg-overlay)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <MapPinIcon size={14} color="var(--brand-secondary)" style={{ flexShrink: 0, marginTop: 2 }}/>
            <div>
              <div style={{ fontSize: 10, color: "var(--brand-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 1 }}>Điểm đón</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{m.request.pickupAddress}</div>
            </div>
          </div>
          <div style={{ width: 2, height: 10, background: "var(--border-medium)", margin: "0 7px" }}/>
          <div style={{ display: "flex", gap: 10 }}>
            <MapPinIcon size={14} color="var(--brand-pink)" style={{ flexShrink: 0, marginTop: 2 }}/>
            <div>
              <div style={{ fontSize: 10, color: "var(--brand-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 1 }}>Điểm trả</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{m.request.dropoffAddress}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ClockIcon size={13} color="var(--brand-primary)"/>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {new Date(m.request.departureTime).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand-emerald)", letterSpacing: -.5 }}>
              {m.driverNet.toLocaleString("vi-VN")}đ
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>bạn nhận · tổng {m.fareShare.toLocaleString("vi-VN")}đ</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onAccept(m.id)} disabled={actionId === m.id} style={{
            flex: 2, padding: "11px", background: "linear-gradient(135deg,#34d399,#059669)",
            border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 0 20px rgba(52,211,153,.35)", opacity: actionId === m.id ? .7 : 1,
          }}>
            {actionId === m.id ? (
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite", display: "inline-block" }}/>
            ) : <CheckCircleIcon size={15}/>}
            Nhận chuyến
          </button>
          <button onClick={() => onReject(m.id)} disabled={actionId === m.id} style={{
            flex: 1, padding: "11px", background: "var(--bg-overlay)",
            border: "1px solid var(--border-subtle)", borderRadius: 10,
            color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger-border)"; e.currentTarget.style.color = "var(--danger)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  const noProfile = msg.toLowerCase().includes("hồ sơ") || msg.toLowerCase().includes("not found") || msg.includes("404");
  if (noProfile) {
    return (
      <div style={{ padding: "20px 20px", borderRadius: 14, marginBottom: 16, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.25)", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Bạn chưa có hồ sơ tài xế</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Hoàn thành KYC để bắt đầu nhận chuyến từ hệ thống.</div>
        <a href="/driver/kyc" style={{ display: "inline-block", padding: "9px 24px", background: "var(--grad-primary)", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
          Hoàn thành KYC ngay →
        </a>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 13 }}>
      <AlertTriangleIcon size={13}/> {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(34,211,238,.2)", borderTopColor: "var(--brand-secondary)", animation: "spin .8s linear infinite" }}/>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)", borderRadius: 16 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
        <GeoIcon type="route" size={72}/>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Không có chuyến đang chờ</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Hệ thống sẽ gửi thông báo khi có chuyến phù hợp.</div>
      <button onClick={onRefresh} style={{ padding: "8px 20px", background: "var(--grad-primary)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Kiểm tra lại</button>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState("--:--");
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setLabel("Hết hạn"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${m}:${String(s).padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);
  return <span>{label}</span>;
}

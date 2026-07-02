"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/lib/api/client";
import dynamic from "next/dynamic";
import {
  WalletIcon, ClockIcon, CheckCircleIcon,
  MapPinIcon, ZapIcon, CarIcon, RouteIcon,
  ToggleRightIcon, ToggleLeftIcon, DocumentIcon,
  NavigationIcon, ShieldIcon,
} from "@/components/ui/Icons";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

interface KycStatus { verificationStatus: string; rejectReason: string | null; }
interface WalletData { withdrawableBalance: number; pendingBalance: number; }
interface ActiveTrip {
  id: string; status: string; currentStopIndex: number;
  stops: Array<{ id: string; type: string; address: string; status: string; order: number }>;
  passengers: Array<{ id: string; customerId: string; legStatus: string; pickupOrder: number }>;
}
interface PendingMatch {
  id: string; detourKm: number; fareShare: number; driverNet: number; expiresAt: string;
  request: {
    pickupAddress: string; dropoffAddress: string;
    departureTime: string; seats: number; distanceKm: number;
  };
}

const KYC_STATUS = {
  NONE:     { color:"#94a3b8", bg:"rgba(148,163,184,.1)", label:"Chưa gửi KYC",       cta:"Gửi ngay →",      href:"/driver/kyc" },
  PENDING:  { color:"#fbbf24", bg:"rgba(251,191,36,.1)",  label:"KYC đang chờ duyệt", cta:null,              href:null },
  APPROVED: { color:"#34d399", bg:"rgba(52,211,153,.1)",  label:"KYC đã được duyệt",  cta:null,              href:null },
  REJECTED: { color:"#f87171", bg:"rgba(248,113,113,.1)", label:"KYC bị từ chối",      cta:"Gửi lại →",      href:"/driver/kyc" },
};

export default function DriverHome() {
  const [kyc,        setKyc]        = useState<KycStatus | null>(null);
  const [wallet,     setWallet]     = useState<WalletData | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [matches,    setMatches]    = useState<PendingMatch[]>([]);
  const [online,     setOnline]     = useState(false);
  const [toggling,   setToggling]   = useState(false);
  const [accepting,  setAccepting]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<KycStatus>("/driver/kyc").then((r) => setKyc(r.data)).catch(() => null),
      api.get<WalletData>("/driver/wallet").then((r) => setWallet(r.data)).catch(() => null),
      api.get<{ trip: ActiveTrip | null }>("/driver/trips/active").then((r) => setActiveTrip(r.data.trip)).catch(() => null),
      api.get<{ items: PendingMatch[] }>("/driver/matches").then((r) => setMatches(r.data.items ?? [])).catch(() => null),
      api.get<{ isOnline: boolean }>("/driver/profile").then((r) => setOnline(!!r.data.isOnline)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  // ── Tự động làm mới khi online: poll matches + active trip mỗi ~15s ──
  // CHỈ thêm — không phá luồng load ban đầu ở trên.
  useEffect(() => {
    if (!online) return;
    const refresh = () => {
      api.get<{ items: PendingMatch[] }>("/driver/matches")
        .then((r) => setMatches(r.data.items ?? [])).catch(() => null);
      api.get<{ trip: ActiveTrip | null }>("/driver/trips/active")
        .then((r) => setActiveTrip(r.data.trip)).catch(() => null);
    };
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [online]);

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const res = await api.post<{ isOnline: boolean }>("/driver/availability", { online: !online });
      setOnline(res.data.isOnline);
    } finally { setToggling(false); }
  };

  const acceptMatch = async (id: string) => {
    setAccepting(true);
    setError(null);
    try {
      await api.post(`/driver/matches/${id}/accept`, {});
      window.location.reload();
    } catch (e) { setError((e as Error).message); setAccepting(false); }
  };

  const startTrip = async (id: string) => {
    setError(null);
    try {
      await api.post(`/driver/trips/${id}/start`, {});
      window.location.reload();
    } catch (e) { setError((e as Error).message); }
  };
  const completeStop = async (id: string, stopId: string) => {
    setError(null);
    try {
      await api.post(`/driver/trips/${id}/stops/${stopId}/complete`, {});
      window.location.reload();
    } catch (e) { setError((e as Error).message); }
  };
  const completeTrip = async (id: string) => {
    setError(null);
    try {
      await api.post(`/driver/trips/${id}/complete`, {});
      window.location.reload();
    } catch (e) { setError((e as Error).message); }
  };

  const kycStatus = kyc?.verificationStatus ?? "NONE";
  const kycCfg    = KYC_STATUS[kycStatus as keyof typeof KYC_STATUS] ?? KYC_STATUS.NONE;
  const approved  = kycStatus === "APPROVED";

  const currentStop = activeTrip?.stops.find((s) => s.order === activeTrip.currentStopIndex + 1 && s.status === "PENDING");
  const allDone     = activeTrip?.stops.every((s) => s.status !== "PENDING");
  const firstMatch  = matches[0];

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:48 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(99,102,241,.2)", borderTopColor:"var(--brand-primary)", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>

      {/* ── KYC banner ────────────────────────────────────────── */}
      {kycStatus !== "APPROVED" && (
        <div style={{
          display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
          borderRadius:12, marginBottom:20,
          background:kycCfg.bg, border:`1px solid ${kycCfg.color}35`,
        }}>
          <DocumentIcon size={16} color={kycCfg.color} style={{ flexShrink:0 }}/>
          <span style={{ flex:1, fontSize:13, color:kycCfg.color, fontWeight:500 }}>
            {kycCfg.label}
            {kycStatus === "REJECTED" && kyc?.rejectReason && `: ${kyc.rejectReason}`}
          </span>
          {kycCfg.cta && kycCfg.href && (
            <a href={kycCfg.href} style={{ fontSize:12, fontWeight:700, color:kycCfg.color, textDecoration:"none", background:`${kycCfg.color}20`, padding:"4px 12px", borderRadius:99, border:`1px solid ${kycCfg.color}40` }}>
              {kycCfg.cta}
            </a>
          )}
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────── */}
      {error && (
        <div style={{
          display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
          borderRadius:12, marginBottom:20,
          background:"rgba(248,113,113,.1)", border:"1px solid #f8717135",
        }}>
          <span style={{ flex:1, fontSize:13, color:"var(--danger)", fontWeight:500 }}>{error}</span>
          <button onClick={() => setError(null)} style={{
            fontSize:12, fontWeight:700, color:"var(--danger)", background:"rgba(248,113,113,.12)",
            padding:"4px 12px", borderRadius:99, border:"1px solid rgba(248,113,113,.4)", cursor:"pointer",
          }}>
            Đóng
          </button>
        </div>
      )}

      {/* ── Title ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <CarIcon size={22} color="var(--brand-primary)"/> Bảng điều khiển
        </h1>
      </div>

      {/* ── ONLINE HERO — control nổi bật, 1 chạm ─────────────── */}
      <button
        onClick={toggleOnline}
        disabled={toggling || !approved}
        aria-label={online ? "Tắt nhận chuyến" : "Bật nhận chuyến"}
        className="online-hero"
        style={{
          width:"100%", textAlign:"left", marginBottom:18,
          display:"flex", alignItems:"center", gap:16, padding:"18px 22px",
          borderRadius:18,
          background: online
            ? "linear-gradient(135deg,#059669,#34d399)"
            : "var(--bg-surface)",
          border: `2px solid ${online ? "rgba(52,211,153,.55)" : "var(--border-medium)"}`,
          boxShadow: online ? "0 0 32px rgba(52,211,153,.35)" : "var(--shadow-sm)",
          cursor: approved ? "pointer" : "not-allowed",
          opacity: !approved ? .6 : 1,
          transition:"all .3s",
        }}
      >
        <div style={{
          width:54, height:54, borderRadius:"50%", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background: online ? "rgba(255,255,255,.18)" : "var(--bg-overlay)",
          border: `2px solid ${online ? "rgba(255,255,255,.4)" : "var(--border-subtle)"}`,
          position:"relative",
        }}>
          {online ? <ToggleRightIcon size={28} color="#fff"/> : <ToggleLeftIcon size={28} color="var(--text-muted)"/>}
          {online && <span style={{ position:"absolute", top:2, right:2, width:12, height:12, borderRadius:"50%", background:"#fff", boxShadow:"0 0 0 3px rgba(52,211,153,.6)", animation:"pulse2 1.5s infinite" }}/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:.6, color: online ? "rgba(255,255,255,.85)" : "var(--text-muted)" }}>
            {online ? "Bạn đang trực tuyến" : "Bạn đang nghỉ"}
          </div>
          <div style={{ fontSize:20, fontWeight:800, color: online ? "#fff" : "var(--text-primary)", letterSpacing:-.3 }}>
            {toggling ? "Đang cập nhật..." : online ? "Đang nhận chuyến" : "Bật để nhận chuyến"}
          </div>
          {!approved && <div style={{ fontSize:11, color:"var(--warning)", fontWeight:600, marginTop:2 }}>Cần KYC được duyệt trước khi nhận chuyến</div>}
        </div>
        <span style={{
          flexShrink:0, padding:"10px 18px", borderRadius:99,
          fontSize:14, fontWeight:800, whiteSpace:"nowrap",
          background: online ? "rgba(255,255,255,.2)" : "var(--grad-primary)",
          color:"#fff", border: online ? "1px solid rgba(255,255,255,.35)" : "none",
        }}>
          {online ? "TẮT" : "BẬT"}
        </span>
      </button>

      {/* ── Chỉ báo "Đang tìm chuyến..." — online nhưng chưa có match ─── */}
      {online && !activeTrip && !firstMatch && (
        <div style={{
          display:"flex", alignItems:"center", gap:12, marginBottom:18,
          padding:"14px 18px", borderRadius:16,
          background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
          boxShadow:"var(--shadow-sm)",
        }}>
          <span style={{
            width:22, height:22, flexShrink:0, borderRadius:"50%",
            border:"3px solid rgba(52,211,153,.25)", borderTopColor:"var(--success)",
            animation:"spin .8s linear infinite", display:"inline-block",
          }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)" }}>Đang tìm chuyến...</div>
            <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
              Hệ thống đang tự động quét — chuyến mới sẽ hiện ngay tại đây.
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ACTION — hành động quan trọng nhất, 1 chạm ───── */}
      {activeTrip ? (
        <a href="#chuyen-dang-chay" className="hero-action" style={{
          display:"flex", alignItems:"center", gap:16, marginBottom:18,
          padding:"18px 22px", borderRadius:18, textDecoration:"none",
          background:"var(--grad-primary)",
          boxShadow:"0 0 32px rgba(99,102,241,.4)", border:"1px solid rgba(99,102,241,.5)",
        }}>
          <div style={{ width:48, height:48, borderRadius:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.3)" }}>
            <NavigationIcon size={24} color="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>Tiếp tục chuyến</span>
              <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#fff", fontWeight:700, background:"rgba(255,255,255,.2)", padding:"2px 8px", borderRadius:99 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#fff", animation:"pulse2 1.5s infinite", display:"inline-block" }}/> ĐANG CHẠY
              </span>
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.85)", marginTop:2 }}>
              Mốc {activeTrip.currentStopIndex + 1}/{activeTrip.stops.length} · {activeTrip.passengers.length} hành khách
            </div>
          </div>
          <span style={{ flexShrink:0, fontSize:22, fontWeight:800, color:"#fff" }}>→</span>
        </a>
      ) : firstMatch ? (
        <div className="hero-action" style={{
          marginBottom:18, padding:"18px 22px", borderRadius:18,
          background:"linear-gradient(135deg,#059669,#34d399)",
          boxShadow:"0 0 32px rgba(52,211,153,.4)", border:"1px solid rgba(52,211,153,.5)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:48, height:48, borderRadius:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.3)" }}>
              <RouteIcon size={24} color="#fff"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>Chuyến mới phù hợp</span>
                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#fff", fontWeight:700, background:"rgba(255,255,255,.2)", padding:"2px 8px", borderRadius:99 }}>
                  <ClockIcon size={11} color="#fff"/> <MatchCountdown expiresAt={firstMatch.expiresAt}/>
                </span>
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.9)", marginTop:2 }}>
                Bạn nhận <b style={{ color:"#fff" }}>{firstMatch.driverNet.toLocaleString("vi-VN")}đ</b> · {firstMatch.request.seats} ghế · {firstMatch.request.distanceKm.toFixed(1)} km
              </div>
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,.12)", borderRadius:12, padding:"10px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", gap:8, marginBottom:6 }}>
              <MapPinIcon size={14} color="#fff" style={{ flexShrink:0, marginTop:2 }}/>
              <div style={{ fontSize:13, color:"#fff", fontWeight:500 }}>{firstMatch.request.pickupAddress}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <MapPinIcon size={14} color="rgba(255,255,255,.7)" style={{ flexShrink:0, marginTop:2 }}/>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.9)" }}>{firstMatch.request.dropoffAddress}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => acceptMatch(firstMatch.id)} disabled={accepting} style={{
              flex:1, padding:"13px", borderRadius:12, border:"none", cursor:"pointer",
              background:"#fff", color:"var(--brand-emerald)", fontWeight:800, fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              opacity: accepting ? .7 : 1, transition:"opacity .2s",
            }}>
              {accepting
                ? <span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(5,150,105,.3)", borderTopColor:"var(--brand-emerald)", animation:"spin .7s linear infinite", display:"inline-block" }}/>
                : <CheckCircleIcon size={17} color="var(--brand-emerald)"/>}
              {accepting ? "Đang nhận..." : "Nhận chuyến"}
            </button>
            <a href="/driver/matches" style={{
              flexShrink:0, padding:"13px 18px", borderRadius:12, textDecoration:"none",
              background:"rgba(255,255,255,.18)", color:"#fff", fontWeight:700, fontSize:14,
              border:"1px solid rgba(255,255,255,.35)", display:"flex", alignItems:"center",
            }}>
              Tất cả{matches.length > 1 ? ` (${matches.length})` : ""}
            </a>
          </div>
        </div>
      ) : null}

      {/* ── Quick links (thao tác phụ) ────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:24 }}>
        <a href="/driver/wallet" className="quick-link" style={quickLinkStyle}>
          <WalletIcon size={18} color="var(--brand-emerald)"/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600 }}>Ví</div>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--brand-emerald)", letterSpacing:-.3 }}>
              {(wallet?.withdrawableBalance ?? 0).toLocaleString("vi-VN")}đ
            </div>
          </div>
        </a>
        <a href="/driver/matches" className="quick-link" style={quickLinkStyle}>
          <RouteIcon size={18} color="var(--brand-secondary)"/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600 }}>Chuyến chờ</div>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)" }}>
              {matches.length > 0 ? `${matches.length} mới` : "Tìm đơn"}
            </div>
          </div>
        </a>
        <a href="/driver/routes" className="quick-link" style={quickLinkStyle}>
          <MapPinIcon size={18} color="var(--brand-violet)"/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600 }}>Tuyến</div>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--text-primary)" }}>Quản lý</div>
          </div>
        </a>
        <a href="/driver/kyc" className="quick-link" style={quickLinkStyle}>
          <ShieldIcon size={18} color={approved ? "var(--brand-emerald)" : "var(--brand-amber)"}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600 }}>KYC</div>
            <div style={{ fontSize:15, fontWeight:800, color: approved ? "var(--brand-emerald)" : "var(--brand-amber)" }}>
              {approved ? "Đã duyệt" : "Hồ sơ"}
            </div>
          </div>
        </a>
      </div>

      {/* ── Active trip ───────────────────────────────────────── */}
      {activeTrip ? (
        <div id="chuyen-dang-chay" style={{ scrollMarginTop:16, background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden", marginBottom:20 }}>
          {/* Header */}
          <div style={{
            padding:"14px 20px", borderBottom:"1px solid var(--border-subtle)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background: activeTrip.status === "ONGOING" ? "rgba(52,211,153,.06)" : "transparent",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <RouteIcon size={16} color="var(--brand-primary)"/>
              <span style={{ fontWeight:700, fontSize:15, color:"var(--text-primary)" }}>Chuyến đang chạy</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {activeTrip.status === "ONGOING" && (
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--brand-emerald)", fontWeight:600 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--brand-emerald)", animation:"pulse2 1.5s infinite", display:"inline-block" }}/>
                  LIVE
                </span>
              )}
              <span style={{
                padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                background:"rgba(99,102,241,.15)", color:"var(--brand-primary)", border:"1px solid rgba(99,102,241,.3)",
              }}>
                {activeTrip.status}
              </span>
            </div>
          </div>

          <div style={{ padding:20 }}>
            <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:14 }}>
              Mốc {activeTrip.currentStopIndex + 1}/{activeTrip.stops.length} · {activeTrip.passengers.length} hành khách
            </div>

            {activeTrip.status === "ACTIVE" && (
              <button onClick={() => startTrip(activeTrip.id)} style={{
                padding:"10px 20px", background:"var(--grad-primary)", border:"none",
                borderRadius:10, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer",
                marginBottom:14, display:"flex", alignItems:"center", gap:8,
                boxShadow:"var(--glow-sm)",
              }}>
                <ZapIcon size={14}/> Bắt đầu chuyến
              </button>
            )}

            {currentStop && (
              <div style={{
                padding:"14px 16px", borderRadius:12, marginBottom:14,
                background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.25)",
              }}>
                <div style={{ fontSize:11, color:"var(--brand-primary)", fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>
                  Điểm dừng tiếp theo #{currentStop.order}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <MapPinIcon size={15} color={currentStop.type === "PICKUP" ? "var(--brand-secondary)" : "var(--brand-pink)"}/>
                  <div>
                    <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:13 }}>{currentStop.address}</div>
                    <div style={{ fontSize:11, color: currentStop.type === "PICKUP" ? "var(--brand-secondary)" : "var(--brand-pink)" }}>
                      {currentStop.type === "PICKUP" ? "Điểm đón" : "Điểm trả"}
                    </div>
                  </div>
                </div>
                <button onClick={() => completeStop(activeTrip.id, currentStop.id)} style={{
                  padding:"8px 18px", background:"var(--grad-primary)", border:"none",
                  borderRadius:8, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <CheckCircleIcon size={13}/> Hoàn tất mốc #{currentStop.order}
                </button>
              </div>
            )}

            {allDone && activeTrip.status === "ONGOING" && (
              <button onClick={() => completeTrip(activeTrip.id)} style={{
                padding:"11px 24px", background:"linear-gradient(135deg,#34d399,#059669)", border:"none",
                borderRadius:10, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer",
                display:"flex", alignItems:"center", gap:8, boxShadow:"0 0 20px rgba(52,211,153,.4)",
              }}>
                <CheckCircleIcon size={15}/> Hoàn thành chuyến
              </button>
            )}

            {/* Stops */}
            <div style={{ marginTop:14 }}>
              {activeTrip.stops.map((s, i) => {
                const isCur  = s.order === activeTrip.currentStopIndex + 1;
                const isDone = s.status === "DONE";
                const isSkip = s.status === "SKIPPED";
                return (
                  <div key={s.id} style={{ display:"flex", gap:12, padding:"8px 0", borderBottom: i < activeTrip.stops.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:24, flexShrink:0 }}>
                      <div style={{
                        width:22, height:22, borderRadius:"50%",
                        background: isDone ? "var(--brand-emerald)" : isSkip ? "var(--text-muted)" : isCur ? "var(--brand-primary)" : "var(--bg-elevated)",
                        border:`2px solid ${isDone?"var(--brand-emerald)":isSkip?"var(--text-muted)":isCur?"var(--brand-primary)":"var(--border-medium)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:9, color:"#fff", fontWeight:700,
                        boxShadow: isCur ? "0 0 10px rgba(99,102,241,.5)" : "none",
                      }}>
                        {isDone ? "✓" : isSkip ? "×" : s.order}
                      </div>
                      {i < activeTrip.stops.length - 1 && (
                        <div style={{ width:2, flex:1, minHeight:12, background: isDone ? "var(--brand-emerald)" : "var(--border-subtle)", margin:"3px 0" }}/>
                      )}
                    </div>
                    <div style={{ flex:1, paddingTop:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
                        <span style={{ fontSize:10, fontWeight:700, color: s.type==="PICKUP"?"var(--brand-secondary)":"var(--brand-pink)" }}>
                          {s.type === "PICKUP" ? "ĐÓN" : "TRẢ"}
                        </span>
                        {isCur && <span style={{ fontSize:9, background:"rgba(99,102,241,.2)", color:"var(--brand-violet)", padding:"1px 5px", borderRadius:4, fontWeight:600 }}>HIỆN TẠI</span>}
                      </div>
                      <div style={{ fontSize:12, color: isDone || isSkip ? "var(--text-muted)" : "var(--text-primary)", textDecoration: isSkip ? "line-through" : "none" }}>
                        {s.address}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background:"var(--bg-surface)", border:"1px dashed var(--border-subtle)",
          borderRadius:16, padding:"40px 20px", textAlign:"center",
        }}>
          <div style={{ marginBottom:16, display:"flex", justifyContent:"center" }}>
            <GeoIcon type="route" size={72}/>
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--text-secondary)", marginBottom:8 }}>
            Không có chuyến đang chạy
          </div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>
            {matches.length > 0
              ? `Có ${matches.length} chuyến phù hợp đang chờ bạn nhận`
              : online ? "Bạn đang online — chờ nhận chuyến mới" : "Bật nhận chuyến để bắt đầu"}
          </div>
          <a href="/driver/matches" style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"10px 22px", background:"var(--grad-primary)",
            borderRadius:10, color:"#fff", fontWeight:600, fontSize:13, textDecoration:"none",
            boxShadow:"var(--glow-sm)",
          }}>
            <RouteIcon size={14}/> Xem chuyến chờ nhận
          </a>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        .online-hero:not(:disabled):hover { transform: translateY(-1px); }
        .hero-action:hover { transform: translateY(-1px); }
        .quick-link:hover { border-color: var(--border-strong) !important; background: var(--bg-hover) !important; }
        @media (max-width: 600px) {
          .online-hero { padding: 14px 16px !important; gap: 12px !important; }
        }
      `}</style>
    </div>
  );
}

const quickLinkStyle: CSSProperties = {
  display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
  borderRadius:14, textDecoration:"none",
  background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
  boxShadow:"var(--shadow-sm)", transition:"all .15s",
};

function MatchCountdown({ expiresAt }: { expiresAt: string }) {
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

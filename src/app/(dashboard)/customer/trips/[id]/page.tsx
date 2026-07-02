"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CarIcon, StarIcon, PhoneIcon, MapIcon, MapPinIcon,
  CheckCircleIcon, XIcon, ClockIcon, AlertTriangleIcon,
  ArrowLeftIcon, ActivityIcon, UsersIcon,
} from "@/components/ui/Icons";

const TripTrackingMap = dynamic(() => import("@/components/TripTrackingMap"), { ssr: false });
const ChatWindow = dynamic(() => import("@/components/ChatWindow"), { ssr: false });

interface Stop { id: string; type: string; address: string; order: number; status: string; lat: number; lng: number }
interface TripDetail {
  trip: {
    id: string; status: string; currentStopIndex: number;
    driverProfile: { vehiclePlate: string; vehicleType: string; rating: number; user: { fullName: string | null; phone: string } };
  };
  myPickupOrder: number | null;
  myLegStatus: string;
  totalPassengers: number;
  stops: Stop[];
  driverProfile: { user: { fullName: string | null; phone: string }; vehiclePlate: string; vehicleType: string; rating: number };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  WAITING:   { label: "Chờ đón",       color: "#fbbf24", bg: "rgba(251,191,36,.1)"  },
  PICKED_UP: { label: "Đã lên xe",     color: "#34d399", bg: "rgba(52,211,153,.1)"  },
  DROPPED:   { label: "Đã đến nơi",    color: "#94a3b8", bg: "rgba(148,163,184,.1)" },
  COMPLETED: { label: "Hoàn thành",    color: "#34d399", bg: "rgba(52,211,153,.1)"  },
  ONGOING:   { label: "Đang chạy",     color: "#6366f1", bg: "rgba(99,102,241,.1)"  },
  PENDING:   { label: "Chờ khởi hành", color: "#fbbf24", bg: "rgba(251,191,36,.1)"  },
  ACTIVE:    { label: "Đã đặt",        color: "#22d3ee", bg: "rgba(34,211,238,.1)"  },
  CANCELLED: { label: "Đã hủy",        color: "#f87171", bg: "rgba(248,113,113,.1)" },
};

export default function TripDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [data,      setData]      = useState<TripDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [rating,    setRating]    = useState(5);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment,   setComment]   = useState("");
  const [rated,     setRated]     = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingErr,  setRatingErr]  = useState("");
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelErr,   setCancelErr]   = useState("");
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [chatOpen,  setChatOpen]  = useState(false);

  const load = useCallback(() => {
    api.get<TripDetail>(`/customer/trips/${params.id}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [params.id]);

  const pollDriverLocation = useCallback(() => {
    api.get<{ status: string; location: { lat: number; lng: number; updatedAt: string } | null }>(
      `/customer/trips/${params.id}/driver-location`
    )
      .then((r) => {
        if (r.data.location) setDriverPos({ lat: r.data.location.lat, lng: r.data.location.lng });
      })
      .catch(() => {});
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data?.trip.status !== "ONGOING") return;
    // Poll stops every 15s, driver location every 6s
    const stopIv = setInterval(load, 15000);
    pollDriverLocation();
    const locIv  = setInterval(pollDriverLocation, 6000);
    return () => { clearInterval(stopIv); clearInterval(locIv); };
  }, [data?.trip.status, load, pollDriverLocation]);

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setRatingSubmitting(true); setRatingErr("");
    try {
      await api.post("/customer/ratings", { tripId: params.id, stars: rating, comment });
      setRated(true);
    } catch (e) { setRatingErr((e as Error).message); }
    finally { setRatingSubmitting(false); }
  };

  const cancelTrip = async () => {
    if (!confirm("Bạn có chắc muốn hủy chuyến này?")) return;
    setCancelling(true); setCancelErr("");
    try {
      await api.post(`/customer/trips/${params.id}/cancel`, {});
      load();
    } catch (e) { setCancelErr((e as Error).message); }
    finally { setCancelling(false); }
  };

  if (loading) return <LoadingState />;
  if (!data) return (
    <div style={{ textAlign:"center", padding:48, color:"var(--text-muted)" }}>
      Không tìm thấy chuyến đi
    </div>
  );

  const { trip, myPickupOrder, myLegStatus, totalPassengers, stops } = data;
  const currentStop = stops.find((s) => s.order === trip.currentStopIndex + 1 && s.status === "PENDING");
  const tripStatus  = STATUS_MAP[trip.status]  ?? STATUS_MAP.PENDING;
  const myStatus    = STATUS_MAP[myLegStatus]  ?? STATUS_MAP.WAITING;
  const canCancel   = trip.status === "PENDING" || trip.status === "ACTIVE";

  return (
    <div style={{ maxWidth:720, margin:"0 auto" }}>
      {/* Back */}
      <a href="/customer/trips" style={{
        fontSize:13, color:"var(--text-muted)", display:"inline-flex",
        alignItems:"center", gap:4, marginBottom:16, textDecoration:"none",
      }}>
        <ArrowLeftIcon size={13}/> Quay lại lịch sử
      </a>

      {/* Status banner */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 18px", borderRadius:14, marginBottom:20,
        background:tripStatus.bg, border:`1px solid ${tripStatus.color}33`,
      }}>
        <div>
          <div style={{ fontWeight:700, color:tripStatus.color, fontSize:16, display:"flex", alignItems:"center", gap:8 }}>
            <CarIcon size={18} color={tripStatus.color}/>
            {trip.status === "ONGOING" ? "Chuyến đang di chuyển" : tripStatus.label}
          </div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
            ID: {trip.id.slice(-12)}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {trip.status === "ONGOING" && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--brand-emerald)",
                animation:"pulse2 1.5s infinite", display:"inline-block" }} />
              <span style={{ fontSize:12, color:"var(--brand-emerald)", fontWeight:600 }}>LIVE</span>
            </div>
          )}
          {canCancel && (
            <button onClick={cancelTrip} disabled={cancelling}
              style={{ padding:"6px 14px", background:"var(--danger-bg)", border:"1px solid var(--danger-border)",
                borderRadius:8, color:"var(--danger)", fontWeight:600, fontSize:12, cursor:"pointer",
                display:"flex", alignItems:"center", gap:5, opacity: cancelling ? .7 : 1 }}>
              <XIcon size={12}/> {cancelling ? "Đang hủy..." : "Hủy chuyến"}
            </button>
          )}
        </div>
      </div>

      {cancelErr && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
          <AlertTriangleIcon size={13}/> {cancelErr}
        </div>
      )}

      {/* Info cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
        {/* My position */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:14, padding:18 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <UsersIcon size={11}/> Vị trí của bạn
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:36, fontWeight:800, color:"var(--brand-primary)" }}>
              {myPickupOrder ?? "—"}
            </span>
            <span style={{ fontSize:14, color:"var(--text-muted)" }}>/ {totalPassengers} khách</span>
          </div>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:600,
            background:myStatus.bg, color:myStatus.color, border:`1px solid ${myStatus.color}33`,
          }}>
            {myStatus.label}
          </div>
        </div>

        {/* Driver info */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:14, padding:18 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <CarIcon size={11}/> Tài xế
          </div>
          <div style={{ fontWeight:700, color:"var(--text-primary)", marginBottom:4 }}>
            {trip.driverProfile.user.fullName ?? "Tài xế"}
          </div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>
            {trip.driverProfile.vehiclePlate} · {trip.driverProfile.vehicleType}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, color:"var(--brand-amber)" }}>
              <StarIcon size={13} color="var(--brand-amber)"/>
              {trip.driverProfile.rating.toFixed(1)}
            </span>
            <a href={`tel:${trip.driverProfile.user.phone}`} style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"4px 12px", background:"rgba(52,211,153,.12)",
              border:"1px solid rgba(52,211,153,.3)", borderRadius:8,
              fontSize:12, color:"var(--brand-emerald)", textDecoration:"none", fontWeight:600,
            }}>
              <PhoneIcon size={11}/> Gọi
            </a>
            <button onClick={() => setChatOpen(true)} style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"4px 12px", background:"rgba(99,102,241,.12)",
              border:"1px solid rgba(99,102,241,.3)", borderRadius:8,
              fontSize:12, color:"var(--brand-violet)", cursor:"pointer", fontWeight:600,
            }}>
              💬 Nhắn tin
            </button>
          </div>
        </div>
      </div>

      {/* Live map */}
      {stops.length > 0 && (
        <div style={{ background:"var(--bg-surface)", border:`1px solid ${trip.status === "ONGOING" ? "rgba(99,102,241,.35)" : "var(--border-subtle)"}`, borderRadius:16, overflow:"hidden", marginBottom:20, boxShadow: trip.status === "ONGOING" ? "0 0 0 1px rgba(99,102,241,.1)" : "none" }}>
          <div style={{
            padding:"12px 18px", borderBottom:"1px solid var(--border-subtle)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            fontWeight:600, fontSize:14, color:"var(--text-primary)",
          }}>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <MapIcon size={15} color="var(--brand-primary)"/>
              {trip.status === "ONGOING" ? "Theo dõi tài xế trực tiếp" : "Lộ trình chuyến đi"}
            </span>
            {trip.status === "ONGOING" && (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {driverPos ? (
                  <span style={{ fontSize:11, color:"var(--brand-emerald)", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--brand-emerald)", display:"inline-block", animation:"pulse2 1.5s infinite" }}/>
                    Vị trí trực tiếp
                  </span>
                ) : (
                  <span style={{ fontSize:11, color:"var(--brand-amber)", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                    <ActivityIcon size={11} color="var(--brand-amber)"/> Chờ GPS tài xế...
                  </span>
                )}
              </div>
            )}
          </div>
          <TripTrackingMap
            stops={stops}
            currentStopIndex={trip.currentStopIndex}
            driverPos={driverPos}
            style={{ height: trip.status === "ONGOING" ? 420 : 300 }}
          />
          {trip.status === "ONGOING" && !driverPos && (
            <div style={{ padding:"10px 16px", fontSize:12, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:6, borderTop:"1px solid var(--border-subtle)", background:"rgba(251,191,36,.04)" }}>
              <ActivityIcon size={12} color="var(--brand-amber)"/>
              Đang chờ tài xế bật chia sẻ vị trí GPS. Bản đồ sẽ tự động cập nhật.
            </div>
          )}
        </div>
      )}

      {/* Next stop highlight */}
      {currentStop && (
        <div style={{
          padding:"14px 18px", borderRadius:14, marginBottom:20,
          background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.25)",
        }}>
          <div style={{ fontSize:11, color:"var(--brand-primary)", fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>
            Điểm dừng tiếp theo (#{currentStop.order})
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:14, height:14, borderRadius:"50%", flexShrink:0,
              background: currentStop.type === "PICKUP" ? "var(--brand-secondary)" : "var(--brand-pink)",
              boxShadow: `0 0 8px ${currentStop.type === "PICKUP" ? "var(--brand-secondary)" : "var(--brand-pink)"}`,
            }}/>
            <div>
              <div style={{ fontWeight:600, color:"var(--text-primary)" }}>{currentStop.address}</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <MapPinIcon size={11} color={currentStop.type === "PICKUP" ? "var(--brand-secondary)" : "var(--brand-pink)"}/>
                {currentStop.type === "PICKUP" ? "Điểm đón" : "Điểm trả"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stops timeline */}
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden", marginBottom:20 }}>
        <div style={{ padding:"12px 18px", borderBottom:"1px solid var(--border-subtle)", fontWeight:600, fontSize:14, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:8 }}>
          <MapPinIcon size={15} color="var(--brand-violet)"/> Lộ trình các điểm dừng
        </div>
        <div>
          {stops.map((s, i) => {
            const isCurrent = s.order === trip.currentStopIndex + 1;
            const isDone    = s.status === "DONE";
            const isSkipped = s.status === "SKIPPED";
            const pinColor  = s.type === "PICKUP" ? "var(--brand-secondary)" : "var(--brand-pink)";
            return (
              <div key={s.id} style={{
                display:"flex", gap:14, padding:"12px 20px",
                background: isCurrent ? "rgba(99,102,241,.08)" : "transparent",
                borderBottom: i < stops.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}>
                {/* Node */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:20, flexShrink:0 }}>
                  <div style={{
                    width:20, height:20, borderRadius:"50%", flexShrink:0,
                    background: isDone ? "var(--brand-emerald)" : isSkipped ? "var(--text-muted)" : isCurrent ? "var(--brand-primary)" : "var(--bg-elevated)",
                    border:`2px solid ${isDone ? "var(--brand-emerald)" : isSkipped ? "var(--text-muted)" : isCurrent ? "var(--brand-primary)" : "var(--border-medium)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, color:"#fff", fontWeight:700,
                    boxShadow: isCurrent ? "0 0 12px rgba(99,102,241,.5)" : "none",
                  }}>
                    {isDone ? "✓" : isSkipped ? "×" : s.order}
                  </div>
                  {i < stops.length - 1 && (
                    <div style={{ width:2, flex:1, minHeight:16, background: isDone ? "var(--brand-emerald)" : "var(--border-subtle)", margin:"4px 0" }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:pinColor }}>
                      {s.type === "PICKUP" ? "ĐÓN" : "TRẢ"}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize:10, background:"rgba(99,102,241,.2)", color:"var(--brand-violet)",
                        padding:"1px 6px", borderRadius:4, fontWeight:600 }}>HIỆN TẠI</span>
                    )}
                  </div>
                  <div style={{
                    fontSize:13, color: isDone || isSkipped ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: isSkipped ? "line-through" : "none",
                  }}>
                    {s.address}
                  </div>
                </div>
                {/* Status icon */}
                <div style={{ fontSize:11, color:"var(--text-muted)", flexShrink:0, alignSelf:"center" }}>
                  {isDone ? (
                    <span style={{ display:"flex", alignItems:"center", gap:4, color:"var(--brand-emerald)" }}>
                      <CheckCircleIcon size={13} color="var(--brand-emerald)"/> Xong
                    </span>
                  ) : isSkipped ? (
                    <span style={{ display:"flex", alignItems:"center", gap:4, color:"var(--text-secondary)" }}>
                      <XIcon size={12} color="var(--text-secondary)"/> Bỏ qua
                    </span>
                  ) : isCurrent ? (
                    <span style={{ display:"flex", alignItems:"center", gap:4, color:"var(--brand-amber)" }}>
                      <ClockIcon size={12} color="var(--brand-amber)"/> Chờ
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating form */}
      {trip.status === "COMPLETED" && !rated && (
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, marginBottom:20, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", borderBottom:"1px solid var(--border-subtle)", fontWeight:600, fontSize:14, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:8 }}>
            <StarIcon size={15} color="var(--brand-amber)"/> Đánh giá tài xế
          </div>
          <div style={{ padding:20 }}>
            <form onSubmit={submitRating}>
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:18 }}>
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverStar(n)}
                    onMouseLeave={() => setHoverStar(0)}
                    style={{
                      background:"none", border:"none", cursor:"pointer", padding:4,
                      transform: n <= (hoverStar || rating) ? "scale(1.15)" : "scale(1)",
                      transition:"transform .15s",
                    }}
                  >
                    <StarIcon size={32}
                      color={n <= (hoverStar || rating) ? "var(--brand-amber)" : "var(--border-medium)"}
                      style={{ filter: n <= (hoverStar || rating) ? "drop-shadow(0 0 6px rgba(251,191,36,.5))" : "none" }}
                    />
                  </button>
                ))}
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:6 }}>
                  Nhận xét (tuỳ chọn)
                </label>
                <textarea
                  placeholder="Tài xế rất nhiệt tình và lái xe an toàn..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  style={{
                    width:"100%", padding:"11px 14px", resize:"vertical",
                    background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                    borderRadius:10, color:"var(--text-primary)", fontSize:13, outline:"none",
                    fontFamily:"inherit",
                  }}
                />
              </div>
              {ratingErr && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:14,
                  background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
                  <AlertTriangleIcon size={13}/> {ratingErr}
                </div>
              )}
              <button type="submit" disabled={ratingSubmitting}
                style={{ padding:"10px 24px", background:"var(--grad-primary)", border:"none",
                  borderRadius:10, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer",
                  boxShadow:"var(--glow-sm)", display:"flex", alignItems:"center", gap:8,
                  opacity: ratingSubmitting ? .7 : 1 }}>
                <StarIcon size={14} color="#fff"/> {ratingSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          </div>
        </div>
      )}

      {rated && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderRadius:14, marginBottom:16,
          background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)", color:"var(--brand-emerald)", fontSize:13, fontWeight:600 }}>
          <CheckCircleIcon size={16}/> Cảm ơn bạn đã đánh giá! Phản hồi của bạn giúp cải thiện chất lượng dịch vụ.
        </div>
      )}

      {/* Floating chat window */}
      {user && chatOpen && (
        <ChatWindow
          tripId={params.id}
          currentUserId={user.id}
          otherUser={{
            fullName:     trip.driverProfile.user.fullName,
            phone:        trip.driverProfile.user.phone,
            vehiclePlate: trip.driverProfile.vehiclePlate,
            vehicleType:  trip.driverProfile.vehicleType,
            rating:       trip.driverProfile.rating,
          }}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Floating chat bubble when closed */}
      {user && !chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 998,
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--grad-primary)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,.5)",
          animation: "pulse3 2s ease-in-out infinite",
        }}>
          💬
        </button>
      )}

      <style>{`
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes pulse3 { 0%,100%{box-shadow:0 4px 20px rgba(99,102,241,.5)} 50%{box-shadow:0 4px 30px rgba(99,102,241,.8)} }
        @media (max-width: 600px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ maxWidth:720, margin:"60px auto", textAlign:"center", color:"var(--text-muted)" }}>
      <div style={{ width:40, height:40, border:"4px solid rgba(99,102,241,.2)", borderTopColor:"var(--brand-primary)",
        borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 16px" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Đang tải thông tin chuyến...
    </div>
  );
}

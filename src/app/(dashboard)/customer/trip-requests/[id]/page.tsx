"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import {
  ArrowLeftIcon, MapPinIcon, ClockIcon, CarIcon, AlertTriangleIcon,
  CheckCircleIcon, XIcon, UsersIcon,
} from "@/components/ui/Icons";

interface TripRequest {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  departureTime: string;
  seats: number;
  cargoWeightKg: number | null;
  quotedPrice: number;
  distanceKm: number;
  durationMin: number;
  note: string | null;
  createdAt: string;
  bookingMode: string;
  tripPassenger: { tripId: string } | null;
  matches: Array<{
    status: string;
    driverProfile: {
      vehiclePlate: string;
      vehicleType: string;
      user: { fullName: string | null; phone: string };
    };
  }>;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: "Chờ ghép tài xế", color: "var(--brand-amber)", bg: "rgba(251,191,36,.1)",  border: "rgba(251,191,36,.3)"  },
  MATCHED:   { label: "Đã ghép",          color: "var(--brand-secondary)", bg: "rgba(34,211,238,.1)",  border: "rgba(34,211,238,.3)"  },
  COMPLETED: { label: "Hoàn thành",       color: "var(--brand-emerald)", bg: "rgba(52,211,153,.1)",  border: "rgba(52,211,153,.3)"  },
  CANCELLED: { label: "Đã hủy",           color: "var(--text-secondary)", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.3)" },
  EXPIRED:   { label: "Hết hạn",          color: "var(--danger)", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.3)" },
};

export default function TripRequestDetailPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<TripRequest | null>(null);
  const [loading, setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr]   = useState("");

  const load = useCallback(() => {
    api.get<{ request: TripRequest }>(`/customer/trip-requests/${params.id}`)
      .then((r) => {
        const req = r.data.request;
        if (req.tripPassenger?.tripId) {
          window.location.replace(`/customer/trips/${req.tripPassenger.tripId}`);
          return;
        }
        setRequest(req);
      })
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const cancelRequest = async () => {
    if (!confirm("Bạn có chắc muốn hủy yêu cầu này?")) return;
    setCancelling(true); setCancelErr("");
    try {
      await api.del(`/customer/trip-requests/${params.id}`);
      load();
    } catch (e) { setCancelErr((e as Error).message); }
    finally { setCancelling(false); }
  };

  if (loading) return (
    <div style={{ maxWidth:720, margin:"60px auto", textAlign:"center", color:"var(--text-muted)" }}>
      <div style={{ width:40, height:40, border:"4px solid rgba(99,102,241,.2)", borderTopColor:"var(--brand-primary)",
        borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 16px" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Đang tải...
    </div>
  );

  if (!request) return (
    <div style={{ textAlign:"center", padding:48, color:"var(--text-muted)" }}>
      Không tìm thấy yêu cầu đặt chuyến
    </div>
  );

  const sc = STATUS_CFG[request.status] ?? STATUS_CFG.CANCELLED;
  const canCancel = request.status === "PENDING";

  return (
    <div style={{ maxWidth:720, margin:"0 auto" }}>
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
        background:sc.bg, border:`1px solid ${sc.border}`,
      }}>
        <div>
          <div style={{ fontWeight:700, color:sc.color, fontSize:16, display:"flex", alignItems:"center", gap:8 }}>
            <CarIcon size={18} color={sc.color}/>
            {sc.label}
          </div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
            ID: {request.id.slice(-12)}
          </div>
        </div>
        {canCancel && (
          <button onClick={cancelRequest} disabled={cancelling}
            style={{ padding:"6px 14px", background:"var(--danger-bg)", border:"1px solid var(--danger-border)",
              borderRadius:8, color:"var(--danger)", fontWeight:600, fontSize:12, cursor:"pointer",
              display:"flex", alignItems:"center", gap:5, opacity: cancelling ? .7 : 1 }}>
            <XIcon size={12}/> {cancelling ? "Đang hủy..." : "Hủy yêu cầu"}
          </button>
        )}
      </div>

      {cancelErr && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
          <AlertTriangleIcon size={13}/> {cancelErr}
        </div>
      )}

      {/* Route */}
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
        <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:14, fontWeight:700 }}>
          Lộ trình
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--brand-secondary)", marginTop:3, flexShrink:0, boxShadow:"0 0 6px var(--brand-secondary)" }}/>
            <div>
              <div style={{ fontSize:11, color:"var(--brand-secondary)", fontWeight:700, marginBottom:2 }}>ĐIỂM ĐÓN</div>
              <div style={{ fontSize:14, color:"var(--text-primary)", fontWeight:500 }}>{request.pickupAddress}</div>
            </div>
          </div>
          <div style={{ marginLeft:4, width:2, height:20, background:"var(--border-subtle)" }}/>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <MapPinIcon size={10} color="var(--brand-pink)" style={{ marginTop:3, flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:11, color:"var(--brand-pink)", fontWeight:700, marginBottom:2 }}>ĐIỂM TRẢ</div>
              <div style={{ fontSize:14, color:"var(--text-primary)", fontWeight:500 }}>{request.dropoffAddress}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Giờ khởi hành</div>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:6 }}>
            <ClockIcon size={13} color="var(--brand-primary)"/>
            {new Date(request.departureTime).toLocaleString("vi-VN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit", year:"numeric" })}
          </div>
        </div>
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Số chỗ</div>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:6 }}>
            <UsersIcon size={13} color="var(--brand-primary)"/>
            {request.seats} chỗ
          </div>
        </div>
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Giá dự tính</div>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--brand-emerald)" }}>
            {request.quotedPrice.toLocaleString("vi-VN")}đ
          </div>
        </div>
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Quãng đường</div>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>
            {request.distanceKm.toFixed(1)} km · ~{request.durationMin} phút
          </div>
        </div>
      </div>

      {request.note && (
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>Ghi chú</div>
          <div style={{ fontSize:13, color:"var(--text-secondary)" }}>{request.note}</div>
        </div>
      )}

      {/* Pending info */}
      {request.status === "PENDING" && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderRadius:14,
          background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.25)" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--brand-amber)",
            animation:"pulse2 1.5s infinite", flexShrink:0 }}/>
          <div style={{ fontSize:13, color:"var(--text-secondary)" }}>
            Hệ thống đang tìm tài xế phù hợp với lộ trình của bạn. Bạn sẽ nhận được thông báo khi có tài xế nhận chuyến.
          </div>
        </div>
      )}

      {request.status === "CANCELLED" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", borderRadius:14,
          background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
          <CheckCircleIcon size={15}/> Yêu cầu đã được hủy.
        </div>
      )}

      <style>{`
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @media (max-width: 600px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import {
  CarIcon, MapPinIcon, ClockIcon, PhoneIcon, UserIcon,
  CheckCircleIcon, AlertTriangleIcon, RefreshIcon, SeatIcon,
  RulerIcon, RouteIcon, StarIcon,
} from "@/components/ui/Icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stop {
  order: number;
  type: "PICKUP" | "DROPOFF";
  matchId: string;
  passengerName: string;
  passengerPhone: string;
  address: string;
  lat: number;
  lng: number;
  t: number;
}

interface TripGroup {
  groupKey: string;
  routeId: string | null;
  routeOrigin: string | null;
  routeDest: string | null;
  departureTime: string;
  totalEarnings: number;
  totalFare: number;
  totalSeats: number;
  maxDistanceKm: number;
  passengerCount: number;
  stops: Stop[];
  matches: {
    id: string;
    fareShare: number;
    driverNet: number;
    request: {
      passengerName: string;
      passengerPhone: string;
      pickupAddress: string;
      dropoffAddress: string;
      departureTime: string;
      seats: number;
      distanceKm: number;
      durationMin: number;
    };
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDep(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH  = diffMs / 3600000;
  if (diffH < 0)      return { text: "Đã qua", color: "var(--text-muted)" };
  if (diffH < 2)      return { text: "Sắp tới", color: "#f59e0b" };
  if (diffH < 24)     return { text: "Hôm nay", color: "#34d399" };
  if (diffH < 48)     return { text: "Ngày mai", color: "#6366f1" };
  return { text: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), color: "var(--text-muted)" };
}

function navUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriverAcceptedPage() {
  const [groups,  setGroups]  = useState<TripGroup[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true); setError("");
    api.get<{ tripGroups: TripGroup[]; totalMatches: number }>("/driver/accepted-matches")
      .then((r) => { setGroups(r.data.tripGroups); setTotal(r.data.totalMatches); })
      .catch(() => setError("Không tải được danh sách chuyến"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <CarIcon size={22} color="var(--brand-emerald)"/> Chuyến đã nhận
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {total} hành khách · {groups.length} chuyến ghép
          </p>
        </div>
        <button onClick={load} disabled={loading} title="Làm mới" style={{
          width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)",
        }}>
          <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
        </button>
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, marginBottom: 16,
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 13,
        }}>
          <AlertTriangleIcon size={13}/> {error}
          <button onClick={load} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 600, fontSize: 12, textDecoration: "underline" }}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(52,211,153,.2)", borderTopColor: "var(--brand-emerald)", animation: "spin .8s linear infinite" }}/>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map((g, i) => (
            <TripGroupCard key={g.groupKey} group={g} index={i + 1} onUpdated={load}/>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      textAlign: "center", padding: "56px 24px",
      background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)", borderRadius: 20,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>Chưa có chuyến đã nhận</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
        Vào mục Chuyến chờ để nhận khách mới.<br/>
        Hệ thống sẽ tự ghép khách cùng lộ trình vào 1 chuyến.
      </div>
      <a href="/driver/matches" style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px",
        background: "var(--grad-primary)", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none",
      }}>
        Xem chuyến chờ →
      </a>
    </div>
  );
}

// ─── Trip Group Card ──────────────────────────────────────────────────────────

function TripGroupCard({ group: g, index, onUpdated }: { group: TripGroup; index: number; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const label = timeLabel(g.departureTime);
  const pickups  = g.stops.filter((s) => s.type === "PICKUP");
  const dropoffs = g.stops.filter((s) => s.type === "DROPOFF");

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,.12)",
      animation: "fadeIn .3s ease both",
    }}>

      {/* ── Card Header ────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,rgba(52,211,153,.12),rgba(99,102,241,.08))",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

          {/* Trip number badge */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg,#34d399,#059669)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(52,211,153,.3)",
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>XE</span>
            <span style={{ fontSize: 16, color: "#fff", fontWeight: 800, lineHeight: 1 }}>{index}</span>
          </div>

          {/* Route info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: label.color + "22", color: label.color, border: `1px solid ${label.color}44`,
              }}>{label.text}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                <ClockIcon size={11} color="var(--brand-secondary)"/>
                {formatDep(g.departureTime)}
              </span>
            </div>

            {/* Origin → Dest */}
            {(g.routeOrigin || g.routeDest) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ color: "var(--brand-secondary)", fontWeight: 600 }}>
                  {g.routeOrigin ?? "—"}
                </span>
                <span style={{ color: "var(--text-muted)" }}>→</span>
                <span style={{ color: "var(--brand-pink)", fontWeight: 600 }}>
                  {g.routeDest ?? "—"}
                </span>
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Chip icon={<UserIcon size={11} color="var(--brand-violet)"/>} text={`${g.passengerCount} khách`} color="var(--brand-violet)"/>
              <Chip icon={<SeatIcon size={11} color="var(--brand-primary)"/>}  text={`${g.totalSeats} ghế`} color="var(--brand-primary)"/>
              <Chip icon={<RulerIcon size={11} color="var(--brand-secondary)"/>} text={`${g.maxDistanceKm.toFixed(0)} km`} color="var(--brand-secondary)"/>
            </div>
          </div>

          {/* Earnings */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--brand-emerald)" }}>
              {g.totalEarnings.toLocaleString("vi-VN")}đ
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>bạn nhận</div>
          </div>
        </div>

        {/* Optimization badge */}
        {g.passengerCount > 1 && (
          <div style={{
            marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.25)",
            fontSize: 12, color: "var(--brand-amber)", fontWeight: 600,
          }}>
            ✨ Lịch đón đã được tối ưu · tiết kiệm tối đa thời gian chạy vòng
          </div>
        )}
      </div>

      {/* ── Stop Timeline ───────────────────────────────────────────────────── */}
      <div style={{ padding: "0 20px" }}>

        {/* Section: Đón khách */}
        <SectionLabel icon="🟢" text={`Đón khách (${pickups.length} điểm)`} topPad/>
        {pickups.map((stop, i) => (
          <StopRow key={stop.matchId + "-pickup"} stop={stop} isLast={i === pickups.length - 1 && dropoffs.length === 0}/>
        ))}

        {/* Divider between pickups and dropoffs */}
        {dropoffs.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, margin: "6px 0",
          }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)", borderStyle: "dashed" }}/>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              🚗 Di chuyển theo lộ trình
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}/>
          </div>
        )}

        {/* Section: Trả khách */}
        {dropoffs.length > 0 && (
          <>
            <SectionLabel icon="🔴" text={`Trả khách (${dropoffs.length} điểm)`}/>
            {dropoffs.map((stop, i) => (
              <StopRow key={stop.matchId + "-dropoff"} stop={stop} isLast={i === dropoffs.length - 1}/>
            ))}
          </>
        )}
      </div>

      {/* ── Passenger Detail Toggle ─────────────────────────────────────────── */}
      <div style={{ padding: "0 20px 4px" }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%", padding: "8px 0", background: "none", border: "none",
            cursor: "pointer", fontSize: 12, color: "var(--text-muted)", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {expanded ? "▲ Ẩn chi tiết từng khách" : `▼ Xem chi tiết ${g.passengerCount} hành khách`}
        </button>
      </div>

      {/* Passenger fare cards */}
      {expanded && (
        <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {g.matches.map((m) => (
            <PassengerCard key={m.id} match={m}/>
          ))}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 20px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex", gap: 10, flexWrap: "wrap",
        background: "var(--bg-overlay)",
      }}>
        {/* Navigate to first stop */}
        {g.stops[0] && (
          <a
            href={navUrl(g.stops[0].lat, g.stops[0].lng)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, minWidth: 130, padding: "10px 14px",
              background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.3)",
              borderRadius: 10, color: "var(--brand-secondary)", fontWeight: 700, fontSize: 13,
              textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            🗺 Dẫn đường điểm đón
          </a>
        )}

        {/* Bắt đầu chuyến — luồng start thực sự nằm ở trang chủ tài xế (/driver) */}
        <a
          href={`/driver`}
          style={{
            flex: 2, minWidth: 160, padding: "10px 14px",
            background: "linear-gradient(135deg,#34d399,#059669)",
            border: "none", borderRadius: 10, color: "#fff", fontWeight: 800, fontSize: 14,
            textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 4px 14px rgba(52,211,153,.35)",
          }}
        >
          ▶ Bắt đầu chuyến
        </a>
      </div>
    </div>
  );
}

// ─── Stop Row ─────────────────────────────────────────────────────────────────

function StopRow({ stop, isLast }: { stop: Stop; isLast: boolean }) {
  const isPickup = stop.type === "PICKUP";

  return (
    <div style={{ display: "flex", gap: 0, paddingBottom: isLast ? 12 : 0 }}>
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
        {/* Number bubble */}
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0, zIndex: 1,
          background: isPickup
            ? "linear-gradient(135deg,var(--brand-secondary),var(--info))"
            : "linear-gradient(135deg,#f472b6,#db2777)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#fff",
          boxShadow: isPickup ? "0 2px 8px rgba(34,211,238,.4)" : "0 2px 8px rgba(244,114,182,.4)",
        }}>
          {stop.order}
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div style={{ flex: 1, width: 2, background: "var(--border-subtle)", margin: "4px 0", minHeight: 28 }}/>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 2, paddingBottom: isLast ? 0 : 16, paddingLeft: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4,
                color: isPickup ? "var(--brand-secondary)" : "var(--brand-pink)",
              }}>
                {isPickup ? "Đón" : "Trả"} •
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {stop.passengerName}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {stop.address}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <a
              href={`tel:${stop.passengerPhone}`}
              title={`Gọi ${stop.passengerName}`}
              style={{
                width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)",
                color: "var(--brand-emerald)", fontSize: 14, textDecoration: "none",
              }}
            >📞</a>
            <a
              href={navUrl(stop.lat, stop.lng)}
              target="_blank"
              rel="noopener noreferrer"
              title="Dẫn đường"
              style={{
                width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.3)",
                color: "var(--brand-secondary)", fontSize: 14, textDecoration: "none",
              }}
            >🗺</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Passenger Card (detail) ──────────────────────────────────────────────────

function PassengerCard({ match: m }: { match: TripGroup["matches"][number] }) {
  return (
    <div style={{
      background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
      borderRadius: 12, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, color: "var(--brand-primary)", fontWeight: 800,
      }}>
        {m.request.passengerName.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
          {m.request.passengerName}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <SeatIcon size={10} color="var(--brand-primary)"/> {m.request.seats} ghế
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <RulerIcon size={10} color="var(--brand-violet)"/> {m.request.distanceKm.toFixed(1)} km
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand-emerald)" }}>
          {m.driverNet.toLocaleString("vi-VN")}đ
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>bạn nhận</div>
      </div>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function Chip({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, color, fontWeight: 600,
    }}>
      {icon} {text}
    </span>
  );
}

function SectionLabel({ icon, text, topPad }: { icon: string; text: string; topPad?: boolean }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
      letterSpacing: .5, padding: `${topPad ? 16 : 8}px 0 8px`,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <span>{icon}</span> {text}
    </div>
  );
}

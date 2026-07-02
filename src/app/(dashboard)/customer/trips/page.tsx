"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import {
  CarIcon, PackageIcon, ClockIcon, CheckCircleIcon,
  AlertTriangleIcon, RefreshIcon, XIcon, ActivityIcon, MapPinIcon,
} from "@/components/ui/Icons";

/* ── Types ──────────────────────────────────────────────────────────── */

interface TripItem {
  id: string;
  status: string;
  createdAt: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  seats?: number;
  quotedPrice?: number;
  matches: Array<{
    driverProfile: {
      vehiclePlate: string;
      vehicleType: string;
      user: { fullName: string | null; phone: string };
    };
  }>;
  tripPassenger: { tripId: string; legStatus?: string; trip: { status: string } | null } | null;
}

interface CargoItem {
  id: string;
  status: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  weightKg: number;
  quotedPrice: number;
  receiverName?: string;
}

type ActivityKind = "trip" | "cargo";
interface ActivityItem {
  kind: ActivityKind;
  id: string;
  status: string;
  createdAt: string;
  pickup: string;
  dropoff: string;
  price: number;
  href: string;
  // trip-specific
  driverName?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  seats?: number;
  // cargo-specific
  weightKg?: number;
  receiverName?: string;
}

/* ── Status config ───────────────────────────────────────────────── */

const TRIP_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: "Chờ ghép",     color: "var(--brand-amber)", bg: "rgba(251,191,36,.1)",  border: "rgba(251,191,36,.25)"  },
  MATCHED:   { label: "Đã ghép",      color: "var(--brand-secondary)", bg: "rgba(34,211,238,.1)",  border: "rgba(34,211,238,.25)"  },
  ONGOING:   { label: "Đang chạy",    color: "var(--brand-violet)", bg: "rgba(99,102,241,.1)",  border: "rgba(99,102,241,.25)"  },
  COMPLETED: { label: "Hoàn thành",   color: "var(--brand-emerald)", bg: "rgba(52,211,153,.1)",  border: "rgba(52,211,153,.25)"  },
  CANCELLED: { label: "Đã huỷ",       color: "var(--text-secondary)", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.25)" },
  EXPIRED:   { label: "Hết hạn",      color: "var(--danger)", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)" },
};

const CARGO_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: "Đang chờ",      color: "var(--brand-amber)", bg: "rgba(251,191,36,.1)",  border: "rgba(251,191,36,.25)"  },
  MATCHED:   { label: "Đã ghép xe",    color: "var(--brand-primary)", bg: "rgba(99,102,241,.1)",  border: "rgba(99,102,241,.25)"  },
  PICKED_UP: { label: "Đang vận chuyển",color: "var(--brand-secondary)", bg: "rgba(34,211,238,.1)",  border: "rgba(34,211,238,.25)"  },
  DELIVERED: { label: "Đã giao",       color: "var(--brand-emerald)", bg: "rgba(52,211,153,.1)",  border: "rgba(52,211,153,.25)"  },
  CANCELLED: { label: "Đã huỷ",        color: "var(--text-secondary)", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.25)" },
};

const FALLBACK_STATUS = { label: "—", color: "var(--text-secondary)", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.25)" };

type KindFilter   = "all" | "trip" | "cargo";
type StatusFilter = "all" | "active" | "done" | "cancelled";

const KIND_FILTERS:   { key: KindFilter;   label: string }[] = [
  { key: "all",   label: "Tất cả" },
  { key: "trip",  label: "Đặt chuyến" },
  { key: "cargo", label: "Gửi hàng" },
];
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",       label: "Mọi trạng thái" },
  { key: "active",    label: "Đang diễn ra" },
  { key: "done",      label: "Hoàn thành" },
  { key: "cancelled", label: "Đã huỷ / Hết hạn" },
];

const ACTIVE_STATUSES  = new Set(["PENDING", "MATCHED", "ONGOING", "PICKED_UP"]);
const DONE_STATUSES    = new Set(["COMPLETED", "DELIVERED"]);
const CANCEL_STATUSES  = new Set(["CANCELLED", "EXPIRED"]);

/* ── Component ───────────────────────────────────────────────────── */

export default function CustomerActivityPage() {
  const [items,     setItems]     = useState<ActivityItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [kindF,     setKindF]     = useState<KindFilter>("all");
  const [statusF,   setStatusF]   = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [tripsRes, cargoRes] = await Promise.all([
        api.get<{ items: TripItem[] }>("/customer/trip-requests"),
        api.get<{ items: CargoItem[] }>("/customer/cargo"),
      ]);

      const tripItems: ActivityItem[] = tripsRes.data.items.map((t) => ({
        kind: "trip",
        id: t.id,
        // TripRequest.status không có COMPLETED → lấy từ trạng thái Trip khi đã xong/đang chạy.
        status: t.tripPassenger?.trip?.status === "COMPLETED" ? "COMPLETED"
          : t.tripPassenger?.trip?.status === "ONGOING" ? "ONGOING"
          : t.status,
        createdAt: t.createdAt,
        pickup:  t.pickupAddress ?? "",
        dropoff: t.dropoffAddress ?? "",
        price:   t.quotedPrice ?? 0,
        href: t.tripPassenger?.tripId
          ? `/customer/trips/${t.tripPassenger.tripId}`
          : `/customer/trip-requests/${t.id}`,
        driverName:   t.matches[0]?.driverProfile?.user?.fullName ?? undefined,
        vehiclePlate: t.matches[0]?.driverProfile?.vehiclePlate ?? undefined,
        vehicleType:  t.matches[0]?.driverProfile?.vehicleType ?? undefined,
        seats: t.seats,
      }));

      const cargoItems: ActivityItem[] = cargoRes.data.items.map((c) => ({
        kind: "cargo",
        id: c.id,
        status: c.status,
        createdAt: c.createdAt,
        pickup:  c.pickupAddress,
        dropoff: c.dropoffAddress,
        price:   c.quotedPrice,
        href: `/customer/cargo`,
        weightKg:     c.weightKg,
        receiverName: c.receiverName,
      }));

      const merged = [...tripItems, ...cargoItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setItems(merged);
    } catch (e) {
      setError((e as Error).message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((it) => {
    if (kindF !== "all" && it.kind !== kindF) return false;
    if (statusF === "active"    && !ACTIVE_STATUSES.has(it.status))  return false;
    if (statusF === "done"      && !DONE_STATUSES.has(it.status))    return false;
    if (statusF === "cancelled" && !CANCEL_STATUSES.has(it.status))  return false;
    return true;
  });

  const tripCount  = items.filter((i) => i.kind === "trip").length;
  const cargoCount = items.filter((i) => i.kind === "cargo").length;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Hoạt động của tôi
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {tripCount} chuyến đặt · {cargoCount} đơn hàng
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={load} disabled={loading}
            title="Làm mới"
            style={{
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              cursor: "pointer", color: "var(--text-muted)",
            }}>
            <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
          </button>
          <a href="/customer" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10,
            background: "var(--grad-primary)",
            color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none",
            boxShadow: "var(--glow-sm)",
          }}>
            + Đặt chuyến
          </a>
          <a href="/customer/cargo" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10,
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, textDecoration: "none",
          }}>
            + Gửi hàng
          </a>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 14, padding: "12px 14px", marginBottom: 16,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Kind filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {KIND_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setKindF(key)} style={{
              padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: kindF === key
                ? (key === "trip" ? "rgba(99,102,241,.18)" : key === "cargo" ? "rgba(34,211,238,.15)" : "rgba(99,102,241,.15)")
                : "transparent",
              border: `1px solid ${kindF === key
                ? (key === "trip" ? "rgba(99,102,241,.4)" : key === "cargo" ? "rgba(34,211,238,.4)" : "rgba(99,102,241,.3)")
                : "var(--border-subtle)"}`,
              color: kindF === key
                ? (key === "trip" ? "var(--brand-violet)" : key === "cargo" ? "var(--brand-secondary)" : "var(--brand-primary)")
                : "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .15s",
            }}>
              {key === "trip"  && <CarIcon size={11}/>}
              {key === "cargo" && <PackageIcon size={11}/>}
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setStatusF(key)} style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 11, cursor: "pointer",
              background: statusF === key ? "var(--bg-overlay)" : "transparent",
              border: `1px solid ${statusF === key ? "var(--border-medium)" : "var(--border-subtle)"}`,
              color: statusF === key ? "var(--text-secondary)" : "var(--text-muted)",
              fontWeight: statusF === key ? 600 : 400,
              transition: "all .15s",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          borderRadius: 10, marginBottom: 14,
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
          color: "var(--danger)", fontSize: 13,
        }}>
          <AlertTriangleIcon size={13}/>
          {error}
          <button onClick={load} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "var(--danger)", cursor: "pointer", fontWeight: 600, fontSize: 12, textDecoration: "underline",
          }}>
            Thử lại
          </button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 56 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "var(--brand-primary)", animation: "spin .8s linear infinite" }}/>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState kindF={kindF}/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((item) => (
            <ActivityCard key={`${item.kind}-${item.id}`} item={item}/>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── ActivityCard ────────────────────────────────────────────────── */

function ActivityCard({ item }: { item: ActivityItem }) {
  const [hovered, setHovered] = useState(false);
  const isCargo = item.kind === "cargo";
  const statusMap = isCargo ? CARGO_STATUS : TRIP_STATUS;
  const sc = statusMap[item.status] ?? FALLBACK_STATUS;

  const date = new Date(item.createdAt);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  const dateLabel = diff === 0 ? "Hôm nay" : diff === 1 ? "Hôm qua" : diff < 7 ? `${diff} ngày trước` : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const timeLabel = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <a href={item.href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${hovered ? (isCargo ? "rgba(34,211,238,.35)" : "rgba(99,102,241,.35)") : "var(--border-subtle)"}`,
          borderRadius: 16, padding: "14px 16px",
          display: "flex", gap: 14, alignItems: "flex-start",
          transition: "border-color .15s, box-shadow .15s",
          boxShadow: hovered ? (isCargo ? "0 0 0 1px rgba(34,211,238,.1)" : "0 0 0 1px rgba(99,102,241,.1)") : "none",
          cursor: "pointer",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: isCargo ? "rgba(34,211,238,.1)" : "rgba(99,102,241,.1)",
          border: `1px solid ${isCargo ? "rgba(34,211,238,.25)" : "rgba(99,102,241,.25)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isCargo
            ? <PackageIcon size={20} color="var(--brand-secondary)"/>
            : <CarIcon    size={20} color="var(--brand-violet)"/>}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: type badge + status + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {/* Type tag */}
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: isCargo ? "rgba(34,211,238,.12)" : "rgba(99,102,241,.12)",
              color: isCargo ? "var(--brand-secondary)" : "var(--brand-violet)",
              border: `1px solid ${isCargo ? "rgba(34,211,238,.25)" : "rgba(99,102,241,.25)"}`,
              textTransform: "uppercase", letterSpacing: 0.5,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {isCargo ? <PackageIcon size={9}/> : <CarIcon size={9}/>}
              {isCargo ? "Gửi hàng" : "Đặt chuyến"}
            </span>

            {/* Status badge */}
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
              background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color,
            }}>
              {sc.label}
            </span>

            {/* Date */}
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", whiteSpace: "nowrap" }}>
              {dateLabel} · {timeLabel}
            </span>
          </div>

          {/* Route */}
          <div style={{ marginBottom: 6 }}>
            <RouteRow color="var(--brand-secondary)" text={item.pickup}/>
            <div style={{ marginLeft: 6, width: 1, height: 8, background: "var(--border-medium)", marginBottom: 2, marginTop: 2 }}/>
            <RouteRow color="var(--brand-pink)" text={item.dropoff}/>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Trip: driver or seats */}
            {!isCargo && (
              <>
                {item.driverName ? (
                  <MetaChip icon={<CarIcon size={10} color="var(--text-muted)"/>} text={item.driverName}/>
                ) : (
                  <MetaChip icon={<ClockIcon size={10} color="var(--text-muted)"/>} text="Chờ tài xế"/>
                )}
                {item.vehiclePlate && (
                  <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-overlay)", padding: "1px 6px", borderRadius: 4 }}>
                    {item.vehiclePlate}
                  </span>
                )}
                {item.seats && <MetaChip icon={<span style={{ fontSize: 9 }}>👤</span>} text={`${item.seats} ghế`}/>}
              </>
            )}
            {/* Cargo: weight + receiver */}
            {isCargo && (
              <>
                {item.weightKg && <MetaChip icon={<PackageIcon size={10} color="var(--text-muted)"/>} text={`${item.weightKg} kg`}/>}
                {item.receiverName && <MetaChip icon={<span style={{ fontSize: 9 }}>👤</span>} text={item.receiverName}/>}
              </>
            )}

            {/* Price */}
            {item.price > 0 && (
              <span style={{
                marginLeft: "auto", fontWeight: 800, fontSize: 14,
                color: isCargo ? "var(--brand-secondary)" : "var(--brand-emerald)",
              }}>
                {item.price.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

/* ── Small sub-components ────────────────────────────────────────── */

function RouteRow({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }}/>
      <span style={{
        fontSize: 12, color: "var(--text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {text || "—"}
      </span>
    </div>
  );
}

function MetaChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, color: "var(--text-muted)",
    }}>
      {icon} {text}
    </span>
  );
}

function EmptyState({ kindF }: { kindF: KindFilter }) {
  return (
    <div style={{
      textAlign: "center", padding: "56px 20px",
      background: "var(--bg-surface)", border: "1px dashed var(--border-subtle)",
      borderRadius: 20,
    }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>
        {kindF === "cargo" ? "📦" : kindF === "trip" ? "🚗" : "🛣️"}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
        {kindF === "cargo" ? "Chưa có đơn hàng" : kindF === "trip" ? "Chưa có chuyến nào" : "Chưa có hoạt động nào"}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        {kindF === "cargo"
          ? "Hãy gửi đơn hàng đầu tiên của bạn!"
          : kindF === "trip"
          ? "Hãy đặt chuyến đầu tiên!"
          : "Đặt chuyến hoặc gửi hàng để bắt đầu."}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {kindF !== "cargo" && (
          <a href="/customer" style={{
            padding: "9px 22px", background: "var(--grad-primary)", borderRadius: 10,
            color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none",
            boxShadow: "var(--glow-sm)", display: "flex", alignItems: "center", gap: 6,
          }}>
            <CarIcon size={14}/> Đặt chuyến ngay
          </a>
        )}
        {kindF !== "trip" && (
          <a href="/customer/cargo" style={{
            padding: "9px 22px", background: "var(--bg-overlay)", border: "1px solid var(--border-medium)",
            borderRadius: 10, color: "var(--text-secondary)", fontWeight: 600, fontSize: 13,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
          }}>
            <PackageIcon size={14}/> Gửi hàng ngay
          </a>
        )}
      </div>
    </div>
  );
}

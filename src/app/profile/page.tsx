"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api/client";
import ImageInput from "@/components/ui/ImageInput";
import BackButton from "@/components/BackButton";
import {
  UserIcon, EnvelopeIcon, PhoneIcon, KeyIcon, CarIcon, ShieldIcon,
  StarIcon, RouteIcon, HomeIcon, DocumentIcon, WalletIcon, MapIcon,
  EditIcon, CheckCircleIcon, ImageIcon,
} from "@/components/ui/Icons";

interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  driverProfile?: {
    verificationStatus: string;
    vehicleType: string;
    vehiclePlate: string;
    rating: number;
    totalTrips: number;
  } | null;
}

const ROLE_LABEL: Record<string, string> = { CUSTOMER: "Khách hàng", DRIVER: "Tài xế", ADMIN: "Quản trị viên" };
const ROLE_COLOR: Record<string, string> = { CUSTOMER: "#22d3ee", DRIVER: "#a78bfa", ADMIN: "#f472b6" };

export default function ProfilePage() {
  const { update } = useSession();
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [editing, setEditing]   = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [error,   setError]     = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get<{ user: UserProfile }>("/me")
      .then((r) => {
        setProfile(r.data.user);
        setFullName(r.data.user.fullName ?? "");
        setAvatarUrl(r.data.user.avatarUrl ?? "");
        setPhone(r.data.user.phone ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false); setError("");
    try {
      await api.patch("/me", {
        fullName: fullName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setProfile((p) => p ? { ...p, fullName: fullName.trim(), avatarUrl: avatarUrl.trim(), phone: phone.trim() || p.phone } : p);
      await update();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingScreen />;
  if (!profile) return null;

  const initial = (profile.fullName ?? profile.email ?? "U").charAt(0).toUpperCase();
  const color = ROLE_COLOR[profile.role] ?? "#6366f1";
  const isDriver = profile.role === "DRIVER";
  const dp = profile.driverProfile;
  const kycApproved = dp?.verificationStatus === "APPROVED";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 0 32px" }}>
      <BackButton
        href={profile.role === "DRIVER" ? "/driver" : profile.role === "ADMIN" ? "/admin" : "/customer"}
        style={{ marginBottom: 14 }}
      />
      <h1 className="page-title" style={{ marginBottom: 20 }}>
        <UserIcon size={22} color={color} /> Trang cá nhân
      </h1>

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <CheckCircleIcon size={16} /> Đã cập nhật thông tin thành công
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Hero card ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
        {/* Gradient accent strip */}
        <div style={{ height: 64, background: `linear-gradient(120deg, ${color}33, transparent 70%), var(--grad-card)` }} />

        <div className="card-body" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-end", marginTop: -36, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar"
                  style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover",
                    border: `3px solid var(--bg-surface)`, boxShadow: `0 0 0 2px ${color}, 0 6px 20px ${color}44` }} />
              ) : (
                <div style={{
                  width: 84, height: 84, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${color}, ${color}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 34, fontWeight: 800, color: "#fff",
                  border: `3px solid var(--bg-surface)`, boxShadow: `0 6px 20px ${color}55`,
                }}>
                  {initial}
                </div>
              )}
              {kycApproved && (
                <div title="Đã xác minh" style={{
                  position: "absolute", right: -2, bottom: 2, width: 24, height: 24, borderRadius: "50%",
                  background: "var(--success)", border: "2px solid var(--bg-surface)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CheckCircleIcon size={13} color="#fff" />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)" }}>
                  {profile.fullName ?? "Chưa có tên"}
                </h2>
                <span style={{
                  padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: `${color}18`, border: `1px solid ${color}44`, color,
                }}>
                  {ROLE_LABEL[profile.role] ?? profile.role}
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {profile.email ?? profile.phone ?? "—"}
              </p>
            </div>

            <button
              onClick={() => setEditing(!editing)}
              className={editing ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
            >
              {editing ? "Huỷ" : <><EditIcon size={13} /> Chỉnh sửa</>}
            </button>
          </div>

          {/* Edit form */}
          {editing && (
            <form onSubmit={save} style={{ marginTop: 18, borderTop: "1px solid var(--border-subtle)", paddingTop: 18 }}>
              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input className="form-input" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="form-input" value={phone} inputMode="tel"
                  onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Ảnh đại diện</label>
                <ImageInput value={avatarUrl} onChange={setAvatarUrl} previewHeight={96} />
              </div>
              {isDriver && (
                <div style={{
                  display: "flex", gap: 8, alignItems: "center", fontSize: 12,
                  color: "var(--text-muted)", marginBottom: 16,
                }}>
                  <ImageIcon size={14} color="var(--brand-secondary)" />
                  Mẹo: tải ảnh <strong style={{ color: "var(--text-secondary)" }}>selfie</strong> ở mục KYC sẽ tự đặt làm ảnh đại diện.
                </div>
              )}
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isDriver ? "repeat(3,1fr)" : "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
        {isDriver && dp ? (
          <>
            <StatCard icon={<StarIcon size={18} color="#fbbf24" />} label="Đánh giá" value={dp.rating.toFixed(1)} />
            <StatCard icon={<RouteIcon size={18} color="#34d399" />} label="Tổng chuyến" value={String(dp.totalTrips)} />
            <StatCard icon={<CarIcon size={18} color="#a78bfa" />} label="Biển số" value={dp.vehiclePlate} />
          </>
        ) : (
          <>
            <StatCard icon={<ShieldIcon size={18} color={color} />} label="Vai trò" value={ROLE_LABEL[profile.role] ?? profile.role} />
            <StatCard icon={<MapIcon size={18} color="#22d3ee" />} label="Tham gia" value={new Date(profile.createdAt).toLocaleDateString("vi-VN", { month: "short", year: "numeric" })} />
          </>
        )}
      </div>

      {/* ── Account details ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">Thông tin tài khoản</div>
        <div className="card-body" style={{ paddingTop: 6, paddingBottom: 6 }}>
          <InfoRow icon={<EnvelopeIcon size={16} color="var(--text-muted)" />} label="Email" value={profile.email ?? "Chưa liên kết"} />
          <InfoRow icon={<PhoneIcon size={16} color="var(--text-muted)" />} label="Số điện thoại" value={profile.phone ?? "Chưa liên kết"} />
          <InfoRow icon={<KeyIcon size={16} color="var(--text-muted)" />} label="ID tài khoản" value={profile.id.slice(-12)} mono />
          {dp && (
            <>
              <InfoRow icon={<CarIcon size={16} color="var(--text-muted)" />} label="Loại xe" value={dp.vehicleType} />
              <InfoRow
                icon={<ShieldIcon size={16} color={kycApproved ? "var(--success)" : "var(--warning)"} />}
                label="Trạng thái KYC"
                value={kycApproved ? "Đã duyệt" : dp.verificationStatus === "PENDING" ? "Chờ duyệt" : dp.verificationStatus}
                valueColor={kycApproved ? "var(--success)" : "var(--warning)"}
                last
              />
            </>
          )}
        </div>
      </div>

      {/* ── Quick links ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">Thao tác nhanh</div>
        <div style={{ padding: "6px 0" }}>
          {[
            { href: isDriver ? "/driver" : "/customer", icon: <HomeIcon size={17} color={color} />, label: "Về trang chủ" },
            ...(isDriver
              ? [
                  { href: "/driver/kyc", icon: <DocumentIcon size={17} color="#22d3ee" />, label: "Hồ sơ KYC" },
                  { href: "/driver/wallet", icon: <WalletIcon size={17} color="#34d399" />, label: "Ví & Thu nhập" },
                ]
              : [{ href: "/customer/trips", icon: <RouteIcon size={17} color="#22d3ee" />, label: "Lịch sử chuyến" }]),
            { href: "/guide", icon: <DocumentIcon size={17} color="#a78bfa" />, label: "Hướng dẫn sử dụng" },
          ].map((link, i, arr) => (
            <a key={link.href} href={link.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px", color: "var(--text-secondary)",
              transition: "background .15s", textDecoration: "none",
              borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ width: 24, display: "flex", justifyContent: "center" }}>{link.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{link.label}</span>
              <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>›</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: 14, padding: "16px 12px", textAlign: "center", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{label}</div>
      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, mono, valueColor, last }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean; valueColor?: string; last?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "11px 0", borderBottom: last ? "none" : "1px solid var(--border-subtle)", gap: 12 }}>
      <span style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: valueColor ?? "var(--text-primary)", fontFamily: mono ? "monospace" : "inherit", fontWeight: mono || valueColor ? 600 : 400, marginLeft: "auto", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--text-muted)" }}>
      <div style={{ width: 24, height: 24, border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Đang tải...
    </div>
  );
}

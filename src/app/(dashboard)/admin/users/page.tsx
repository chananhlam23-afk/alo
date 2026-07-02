"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import {
  SearchIcon, RefreshIcon, UsersIcon, UserIcon, CarIcon, ShieldIcon,
  StarIcon, RouteIcon, CheckCircleIcon, AlertTriangleIcon,
} from "@/components/ui/Icons";

interface DriverInfo {
  verificationStatus: string;
  rating: number;
  totalTrips: number;
  vehiclePlate: string;
  isOnline: boolean;
}
interface User {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  driverProfile: DriverInfo | null;
}
interface Stats { total: number; customers: number; drivers: number; admins: number; blocked: number; }

const ROLE_LABEL: Record<string, string> = { CUSTOMER: "Khách", DRIVER: "Tài xế", ADMIN: "Admin" };
const ROLE_BADGE: Record<string, string> = { CUSTOMER: "badge-blue", DRIVER: "badge-green", ADMIN: "badge-red" };
const KYC_LABEL: Record<string, string> = { APPROVED: "Đã duyệt", PENDING: "Chờ duyệt", REJECTED: "Từ chối", NONE: "Chưa nộp" };

const PAGE_SIZE = 20;

/* Cột hành động dính phải để nút luôn hiển thị khi cuộn ngang */
const stickyActionCell: React.CSSProperties = {
  position: "sticky",
  right: 0,
  background: "var(--bg-surface)",
  borderLeft: "1px solid var(--border-subtle)",
  zIndex: 1,
};

export default function AdminUsersPage() {
  const [items, setItems]   = useState<User[]>([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]   = useState("");
  const [role, setRole]       = useState("");    // "" | CUSTOMER | DRIVER | ADMIN
  const [status, setStatus]   = useState("");    // "" | active | blocked

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer]     = useState<User | null>(null);
  const [busy, setBusy]         = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p = 1, opts?: { search?: string; role?: string; status?: string }) => {
    setLoading(true);
    const s = opts?.search ?? search;
    const r = opts?.role ?? role;
    const st = opts?.status ?? status;
    const q = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (s)  q.set("search", s);
    if (r)  q.set("role", r);
    if (st) q.set("status", st);
    api.get<{ items: User[]; total: number; stats: Stats }>(`/admin/users?${q}`)
      .then((res) => { setItems(res.data.items); setTotal(res.data.total); setStats(res.data.stats); setPage(p); setSelected(new Set()); })
      .finally(() => setLoading(false));
  }, [search, role, status]);

  useEffect(() => { load(1); /* initial */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const onSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, { search: v }), 350);
  };
  const setRoleFilter = (r: string)   => { setRole(r); load(1, { role: r }); };
  const setStatusFilter = (s: string) => { setStatus(s); load(1, { status: s }); };

  const patchUser = async (id: string, data: Partial<{ isBlocked: boolean; role: string }>) => {
    await api.patch(`/admin/users/${id}`, data);
  };

  const toggleBlock = async (u: User) => {
    if (!confirm(`${u.isBlocked ? "Mở khóa" : "Khóa"} tài khoản ${u.fullName ?? u.phone ?? u.email}?`)) return;
    setBusy(true);
    try { await patchUser(u.id, { isBlocked: !u.isBlocked }); load(page); setDrawer((d) => d && d.id === u.id ? { ...d, isBlocked: !u.isBlocked } : d); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const changeRole = async (u: User, newRole: string) => {
    if (newRole === u.role) return;
    if (!confirm(`Đổi vai trò của ${u.fullName ?? u.phone} thành ${ROLE_LABEL[newRole]}?`)) return;
    setBusy(true);
    try { await patchUser(u.id, { role: newRole }); load(page); setDrawer((d) => d && d.id === u.id ? { ...d, role: newRole } : d); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const bulkBlock = async (block: boolean) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`${block ? "Khóa" : "Mở khóa"} ${ids.length} tài khoản đã chọn?`)) return;
    setBusy(true);
    try { await Promise.all(ids.map((id) => patchUser(id, { isBlocked: block }))); load(page); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = items.length > 0 && items.every((u) => selected.has(u.id));
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(items.map((u) => u.id)));
  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const statCards = useMemo(() => stats ? [
    { key: "",         label: "Tổng",     value: stats.total,     icon: <UsersIcon size={18} color="#6366f1" />, active: role === "" && status === "" },
    { key: "CUSTOMER", label: "Khách",    value: stats.customers, icon: <UserIcon size={18} color="#22d3ee" />,  active: role === "CUSTOMER" },
    { key: "DRIVER",   label: "Tài xế",   value: stats.drivers,   icon: <CarIcon size={18} color="#34d399" />,   active: role === "DRIVER" },
    { key: "ADMIN",    label: "Admin",    value: stats.admins,    icon: <ShieldIcon size={18} color="#f472b6" />, active: role === "ADMIN" },
    { key: "blocked",  label: "Đã khóa",  value: stats.blocked,   icon: <AlertTriangleIcon size={18} color="#f87171" />, active: status === "blocked" },
  ] : [], [stats, role, status]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}><UsersIcon size={22} color="#6366f1" /> Quản lý người dùng</h1>
        <button className="btn btn-outline btn-sm" onClick={() => load(page)} disabled={loading}>
          <RefreshIcon size={14} /> Làm mới
        </button>
      </div>

      {/* Stats cards (clickable filters) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 18 }}>
        {statCards.map((c) => (
          <button key={c.label}
            onClick={() => { if (c.key === "blocked") { setStatusFilter(status === "blocked" ? "" : "blocked"); } else { setStatusFilter(""); setRoleFilter(role === c.key ? "" : c.key); } }}
            style={{
              textAlign: "left", cursor: "pointer",
              background: "var(--bg-surface)", borderRadius: 14, padding: "14px 16px",
              border: `1px solid ${c.active ? "var(--border-strong)" : "var(--border-subtle)"}`,
              boxShadow: c.active ? "var(--glow-sm)" : "var(--shadow-sm)", transition: "all .15s",
            }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {c.icon}
              {c.active && <CheckCircleIcon size={14} color="var(--brand-primary)" />}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginTop: 8, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{c.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <SearchIcon size={15} color="var(--text-muted)" />
            </span>
            <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Tìm theo SĐT, email, họ tên..."
              value={search} onChange={(e) => onSearch(e.target.value)} />
          </div>
          <Segmented value={status} onChange={setStatusFilter}
            options={[{ v: "", l: "Tất cả" }, { v: "active", l: "Hoạt động" }, { v: "blocked", l: "Đã khóa" }]} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="card mb-4" style={{ borderColor: "var(--border-medium)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="text-sm font-semibold">Đã chọn {selected.size}</span>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => bulkBlock(true)}>Khóa hàng loạt</button>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => bulkBlock(false)}>Mở khóa hàng loạt</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())} style={{ marginLeft: "auto" }}>Bỏ chọn</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
                <th>Người dùng</th><th>Liên hệ</th><th>Vai trò</th><th>Tài xế</th><th>Trạng thái</th><th>Tham gia</th>
                <th style={stickyActionCell}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={8} />
              ) : items.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>Không tìm thấy người dùng</td></tr>
              ) : items.map((u) => (
                <tr key={u.id} style={{ cursor: "pointer", background: selected.has(u.id) ? "var(--bg-active)" : undefined }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
                  </td>
                  <td onClick={() => setDrawer(u)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={u} size={32} />
                      <div style={{ fontWeight: 600 }}>{u.fullName ?? <span className="text-muted">Chưa có tên</span>}</div>
                    </div>
                  </td>
                  <td onClick={() => setDrawer(u)} style={{ fontSize: 12 }}>
                    <div>{u.phone ?? "—"}</div>
                    <div className="text-muted" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email ?? ""}</div>
                  </td>
                  <td onClick={() => setDrawer(u)}><span className={`badge ${ROLE_BADGE[u.role] ?? "badge-gray"}`}>{ROLE_LABEL[u.role] ?? u.role}</span></td>
                  <td onClick={() => setDrawer(u)} style={{ fontSize: 12 }}>
                    {u.driverProfile ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><StarIcon size={12} color="#fbbf24" />{u.driverProfile.rating.toFixed(1)}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><RouteIcon size={12} color="#34d399" />{u.driverProfile.totalTrips}</span>
                        {u.driverProfile.isOnline && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />}
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td onClick={() => setDrawer(u)}>
                    {u.isBlocked ? <span className="badge badge-red">Đã khóa</span> : <span className="badge badge-green">Hoạt động</span>}
                  </td>
                  <td onClick={() => setDrawer(u)} style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td onClick={(e) => e.stopPropagation()} style={selected.has(u.id) ? { ...stickyActionCell, background: "var(--bg-active)" } : stickyActionCell}>
                    <button className={`btn btn-sm ${u.isBlocked ? "btn-success" : "btn-danger"}`} disabled={busy} onClick={() => toggleBlock(u)}>
                      {u.isBlocked ? "Mở khóa" : "Khóa"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="text-sm text-muted">Tổng {total} người dùng</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1 || loading} onClick={() => load(page - 1)}>← Trước</button>
            <span className="text-sm text-muted">Trang {page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Sau →</button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {drawer && <UserDrawer user={drawer} busy={busy} onClose={() => setDrawer(null)} onToggleBlock={toggleBlock} onChangeRole={changeRole} />}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

/* Skeleton shimmer loading cho bảng */
function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      <style>{`@keyframes adminShimmer{0%{background-position:-320px 0}100%{background-position:320px 0}}`}</style>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} style={c === cols - 1 ? stickyActionCell : undefined}>
              <div style={{
                height: 14, borderRadius: 6, width: c === 0 ? 18 : `${55 + ((r + c) % 4) * 12}%`,
                background: "linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-active) 50%, var(--bg-overlay) 75%)",
                backgroundSize: "640px 100%", animation: "adminShimmer 1.2s ease-in-out infinite",
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Avatar({ user, size }: { user: User; size: number }) {
  const color = user.role === "DRIVER" ? "#a78bfa" : user.role === "ADMIN" ? "#f472b6" : "#22d3ee";
  const initial = (user.fullName ?? user.email ?? user.phone ?? "U").charAt(0).toUpperCase();
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${color}` }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}99)`,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.42, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div style={{ display: "inline-flex", background: "var(--bg-overlay)", borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          background: value === o.v ? "var(--grad-primary)" : "transparent",
          color: value === o.v ? "#fff" : "var(--text-secondary)",
        }}>{o.l}</button>
      ))}
    </div>
  );
}

function UserDrawer({ user, busy, onClose, onToggleBlock, onChangeRole }: {
  user: User; busy: boolean; onClose: () => void;
  onToggleBlock: (u: User) => void; onChangeRole: (u: User, r: string) => void;
}) {
  const dp = user.driverProfile;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" }} />
      <div style={{ width: "min(400px, 92vw)", height: "100%", background: "var(--bg-surface)", borderLeft: "1px solid var(--border-medium)",
        boxShadow: "-12px 0 40px rgba(0,0,0,.5)", overflowY: "auto", animation: "slideIn .2s ease" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar user={user} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{user.fullName ?? "Chưa có tên"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <span className={`badge ${ROLE_BADGE[user.role] ?? "badge-gray"}`}>{ROLE_LABEL[user.role] ?? user.role}</span>
              {user.isBlocked ? <span className="badge badge-red">Đã khóa</span> : <span className="badge badge-green">Hoạt động</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* Info */}
        <div style={{ padding: 20 }}>
          <DRow label="Email" value={user.email ?? "Chưa liên kết"} />
          <DRow label="Số điện thoại" value={user.phone ?? "Chưa liên kết"} />
          <DRow label="ID" value={user.id} mono />
          <DRow label="Tham gia" value={new Date(user.createdAt).toLocaleString("vi-VN")} />

          {dp && (
            <>
              <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>Hồ sơ tài xế</div>
              <DRow label="Biển số" value={dp.vehiclePlate} />
              <DRow label="Đánh giá" value={`${dp.rating.toFixed(1)} ★`} />
              <DRow label="Tổng chuyến" value={String(dp.totalTrips)} />
              <DRow label="KYC" value={KYC_LABEL[dp.verificationStatus] ?? dp.verificationStatus} />
              <DRow label="Trực tuyến" value={dp.isOnline ? "Đang online" : "Offline"} />
            </>
          )}

          {/* Actions */}
          <div style={{ marginTop: 20, borderTop: "1px solid var(--border-subtle)", paddingTop: 18 }}>
            <label className="form-label">Vai trò</label>
            <select className="form-input" value={user.role} disabled={busy}
              onChange={(e) => onChangeRole(user, e.target.value)} style={{ marginBottom: 14 }}>
              <option value="CUSTOMER">Khách hàng</option>
              <option value="DRIVER">Tài xế</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
            <button className={`btn ${user.isBlocked ? "btn-success" : "btn-danger"} w-full`} disabled={busy}
              onClick={() => onToggleBlock(user)} style={{ width: "100%", justifyContent: "center" }}>
              {user.isBlocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all", textAlign: "right", marginLeft: "auto" }}>{value}</span>
    </div>
  );
}

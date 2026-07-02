"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import {
  SearchIcon, RefreshIcon, UsersIcon, CarIcon, ShieldIcon,
  StarIcon, RouteIcon, CheckCircleIcon, AlertTriangleIcon, ClockIcon,
  DocumentIcon, ImageIcon, PhoneIcon, MapPinIcon, CheckIcon,
} from "@/components/ui/Icons";

interface KycDoc { id: string; type: string; url: string | null }
interface Driver {
  id: string;
  vehiclePlate: string;
  vehicleType: string;
  seats: number;
  cccdNumber: string;
  address: string;
  allowCargo: boolean;
  cargoCapacityKg: number | null;
  verificationStatus: string;
  rejectReason: string | null;
  rating: number;
  totalTrips: number;
  isOnline: boolean;
  createdAt: string;
  user: { phone: string; fullName: string | null; avatarUrl: string | null };
  documents: KycDoc[];
}
interface Stats { total: number; pending: number; approved: number; rejected: number; online: number; }

const DOC_LABEL: Record<string, string> = {
  CCCD_FRONT: "CCCD mặt trước",
  CCCD_BACK: "CCCD mặt sau",
  DRIVER_LICENSE: "Giấy phép lái xe",
  VEHICLE_REGISTRATION: "Đăng ký xe",
  SELFIE: "Ảnh chân dung",
};
const DOC_ORDER = ["SELFIE", "CCCD_FRONT", "CCCD_BACK", "DRIVER_LICENSE", "VEHICLE_REGISTRATION"];
const VEHICLE_LABEL: Record<string, string> = { CAR: "Ô tô", VAN: "Xe van", TRUCK: "Xe tải" };
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

const statusBadge = (s: string) => {
  if (s === "APPROVED") return <span className="badge badge-green">Đã duyệt</span>;
  if (s === "PENDING") return <span className="badge badge-amber">Chờ duyệt</span>;
  if (s === "REJECTED") return <span className="badge badge-red">Từ chối</span>;
  return <span className="badge badge-gray">{KYC_LABEL[s] ?? s}</span>;
};

export default function AdminDriversPage() {
  const [items, setItems]   = useState<Driver[]>([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING"); // "" | NONE | PENDING | APPROVED | REJECTED

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer]     = useState<Driver | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p = 1, opts?: { search?: string; status?: string }) => {
    setLoading(true); setError("");
    const s  = opts?.search ?? search;
    const st = opts?.status ?? status;
    const q = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (s)  q.set("search", s);
    if (st) q.set("status", st);
    api.get<{ items: Driver[]; total: number; stats: Stats }>(`/admin/drivers?${q}`)
      .then((res) => { setItems(res.data.items); setTotal(res.data.total); setStats(res.data.stats); setPage(p); setSelected(new Set()); })
      .catch(() => setError("Không tải được danh sách tài xế"))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(1); /* initial */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const onSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, { search: v }), 350);
  };
  const setStatusFilter = (st: string) => { setStatus(st); load(1, { status: st }); };

  const closeDrawer = useCallback(() => { setDrawer(null); }, []);

  // Đóng lightbox / drawer bằng phím Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else if (drawer) closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, drawer, closeDrawer]);

  const approve = useCallback(async (id: string) => {
    setBusy(true);
    try {
      await api.post(`/admin/drivers/${id}/approve`, {});
      load(page);
      setDrawer((d) => (d && d.id === id ? { ...d, verificationStatus: "APPROVED", rejectReason: null } : d));
    } catch (e) { throw e instanceof Error ? e : new Error("Duyệt hồ sơ thất bại"); }
    finally { setBusy(false); }
  }, [load, page]);

  const reject = useCallback(async (id: string, reason: string) => {
    setBusy(true);
    try {
      await api.post(`/admin/drivers/${id}/reject`, { reason });
      load(page);
      setDrawer((d) => (d && d.id === id ? { ...d, verificationStatus: "REJECTED", rejectReason: reason } : d));
    } catch (e) { throw e instanceof Error ? e : new Error("Từ chối hồ sơ thất bại"); }
    finally { setBusy(false); }
  }, [load, page]);

  // Bulk: chỉ duyệt các hồ sơ PENDING đã chọn
  const bulkApprove = async () => {
    const ids = items.filter((d) => selected.has(d.id) && d.verificationStatus === "PENDING").map((d) => d.id);
    if (ids.length === 0) { alert("Không có hồ sơ PENDING nào được chọn."); return; }
    if (!confirm(`Duyệt ${ids.length} hồ sơ chờ duyệt đã chọn?`)) return;
    setBusy(true);
    try { await Promise.all(ids.map((id) => api.post(`/admin/drivers/${id}/approve`, {}))); load(page); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectablePending = items.filter((d) => d.verificationStatus === "PENDING");
  const allSelected = selectablePending.length > 0 && selectablePending.every((d) => selected.has(d.id));
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(selectablePending.map((d) => d.id)));
  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedPendingCount = items.filter((d) => selected.has(d.id) && d.verificationStatus === "PENDING").length;

  const statCards = useMemo(() => stats ? [
    { key: "",         label: "Tổng tài xế", value: stats.total,    icon: <UsersIcon size={18} color="#6366f1" />,         active: status === "" },
    { key: "PENDING",  label: "Chờ duyệt",   value: stats.pending,  icon: <ClockIcon size={18} color="#fbbf24" />,         active: status === "PENDING" },
    { key: "APPROVED", label: "Đã duyệt",    value: stats.approved, icon: <CheckCircleIcon size={18} color="#34d399" />,   active: status === "APPROVED" },
    { key: "REJECTED", label: "Từ chối",     value: stats.rejected, icon: <AlertTriangleIcon size={18} color="#f87171" />, active: status === "REJECTED" },
    { key: "online",   label: "Đang online", value: stats.online,   icon: <CarIcon size={18} color="#22d3ee" />,           active: false },
  ] : [], [stats, status]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}><ShieldIcon size={22} color="#6366f1" /> Duyệt KYC tài xế</h1>
        <button className="btn btn-outline btn-sm" onClick={() => load(page)} disabled={loading}>
          <RefreshIcon size={14} /> Làm mới
        </button>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Stats cards (clickable filters) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 18 }}>
        {statCards.map((c) => (
          <button key={c.label}
            onClick={() => { if (c.key === "online") return; setStatusFilter(status === c.key ? "" : c.key); }}
            style={{
              textAlign: "left", cursor: c.key === "online" ? "default" : "pointer",
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
            <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Tìm theo tên, SĐT, biển số..."
              value={search} onChange={(e) => onSearch(e.target.value)} />
          </div>
          <Segmented value={status} onChange={setStatusFilter}
            options={[
              { v: "", l: "Tất cả" },
              { v: "PENDING", l: "Chờ duyệt" },
              { v: "APPROVED", l: "Đã duyệt" },
              { v: "REJECTED", l: "Từ chối" },
            ]} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedPendingCount > 0 && (
        <div className="card mb-4" style={{ borderColor: "var(--border-medium)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="text-sm font-semibold">Đã chọn {selectedPendingCount} hồ sơ chờ duyệt</span>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={bulkApprove}>
              <CheckIcon size={14} /> Duyệt hàng loạt
            </button>
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
                <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Chọn tất cả chờ duyệt" /></th>
                <th>Tài xế</th><th>SĐT</th><th>Biển số</th><th>Loại xe</th>
                <th>Đánh giá</th><th>Giấy tờ</th><th>Trạng thái</th><th>Ngày gửi</th>
                <th style={stickyActionCell}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} cols={10} />
              ) : items.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>Không tìm thấy tài xế</td></tr>
              ) : items.map((d) => (
                <tr key={d.id} style={{ cursor: "pointer", background: selected.has(d.id) ? "var(--bg-active)" : undefined }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" disabled={d.verificationStatus !== "PENDING"}
                      checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)}
                      aria-label="Chọn hồ sơ" />
                  </td>
                  <td onClick={() => setDrawer(d)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar driver={d} size={32} />
                      <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        {d.user.fullName ?? <span className="text-muted">Chưa có tên</span>}
                        {d.isOnline && <span title="Đang online" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />}
                      </div>
                    </div>
                  </td>
                  <td onClick={() => setDrawer(d)}>{d.user.phone}</td>
                  <td onClick={() => setDrawer(d)} style={{ fontWeight: 600 }}>{d.vehiclePlate}</td>
                  <td onClick={() => setDrawer(d)}>{VEHICLE_LABEL[d.vehicleType] ?? d.vehicleType}</td>
                  <td onClick={() => setDrawer(d)} style={{ fontSize: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><StarIcon size={12} color="#fbbf24" />{d.rating.toFixed(1)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><RouteIcon size={12} color="#34d399" />{d.totalTrips}</span>
                    </span>
                  </td>
                  <td onClick={() => setDrawer(d)}>
                    <span style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, color: d.documents.length >= 5 ? "var(--success)" : "var(--warning)" }}>
                      <DocumentIcon size={12} color={d.documents.length >= 5 ? "var(--success)" : "var(--warning)"} />
                      {d.documents.length}/5
                    </span>
                  </td>
                  <td onClick={() => setDrawer(d)}>{statusBadge(d.verificationStatus)}</td>
                  <td onClick={() => setDrawer(d)} className="text-muted" style={{ fontSize: 12 }}>{new Date(d.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td onClick={(e) => e.stopPropagation()} style={selected.has(d.id) ? { ...stickyActionCell, background: "var(--bg-active)" } : stickyActionCell}>
                    <button className="btn btn-outline btn-sm" onClick={() => setDrawer(d)}>Xem hồ sơ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="text-sm text-muted">Tổng {total} tài xế</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1 || loading} onClick={() => load(page - 1)}>← Trước</button>
            <span className="text-sm text-muted">Trang {page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Sau →</button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {drawer && (
        <DriverDrawer
          driver={drawer}
          busy={busy}
          onClose={closeDrawer}
          onApprove={approve}
          onReject={reject}
          onOpenImage={setLightbox}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,.88)", cursor: "zoom-out" }}>
          <img src={lightbox} alt="Giấy tờ" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
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

function Avatar({ driver, size }: { driver: Driver; size: number }) {
  const color = "#a78bfa";
  const initial = (driver.user.fullName ?? driver.user.phone ?? "T").charAt(0).toUpperCase();
  if (driver.user.avatarUrl) {
    return <img src={driver.user.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${color}` }} />;
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
    <div style={{ display: "inline-flex", background: "var(--bg-overlay)", borderRadius: 10, padding: 3, gap: 2, flexWrap: "wrap" }}>
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

function DriverDrawer({ driver, busy, onClose, onApprove, onReject, onOpenImage }: {
  driver: Driver; busy: boolean; onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onOpenImage: (url: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  const sortedDocs = [...driver.documents].sort((a, b) => DOC_ORDER.indexOf(a.type) - DOC_ORDER.indexOf(b.type));

  const doApprove = async () => {
    setActionError("");
    try { await onApprove(driver.id); }
    catch (e) { setActionError((e as Error).message || "Duyệt hồ sơ thất bại"); }
  };
  const doReject = async () => {
    if (rejectReason.trim().length < 10) { setActionError("Lý do từ chối cần tối thiểu 10 ký tự"); return; }
    setActionError("");
    try { await onReject(driver.id, rejectReason.trim()); setRejecting(false); setRejectReason(""); }
    catch (e) { setActionError((e as Error).message || "Từ chối hồ sơ thất bại"); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" }} />
      <div role="dialog" aria-modal="true" aria-label={`Hồ sơ ${driver.user.fullName ?? driver.user.phone}`}
        style={{ width: "min(440px, 94vw)", height: "100%", background: "var(--bg-surface)", borderLeft: "1px solid var(--border-medium)",
        boxShadow: "-12px 0 40px rgba(0,0,0,.5)", overflowY: "auto", animation: "slideIn .2s ease" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 2 }}>
          <Avatar driver={driver} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{driver.user.fullName ?? "Tài xế"}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
              {statusBadge(driver.verificationStatus)}
              {driver.isOnline && <span className="badge badge-green">Đang online</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Contact + stats */}
          <DRow label="Số điện thoại" value={driver.user.phone} icon={<PhoneIcon size={13} color="var(--text-muted)" />} />
          <DRow label="Đánh giá" value={`${driver.rating.toFixed(1)} ★`} icon={<StarIcon size={13} color="#fbbf24" />} />
          <DRow label="Tổng chuyến" value={String(driver.totalTrips)} icon={<RouteIcon size={13} color="#34d399" />} />

          {/* Vehicle info */}
          <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>Thông tin xe</div>
          <DRow label="Biển số" value={driver.vehiclePlate} icon={<CarIcon size={13} color="var(--text-muted)" />} />
          <DRow label="Loại xe" value={VEHICLE_LABEL[driver.vehicleType] ?? driver.vehicleType} />
          <DRow label="Số ghế" value={String(driver.seats)} />
          <DRow label="Số CCCD" value={driver.cccdNumber} mono />
          <DRow label="Ghép hàng" value={driver.allowCargo ? `Có${driver.cargoCapacityKg ? ` · ${driver.cargoCapacityKg}kg` : ""}` : "Không"} />
          <DRow label="Địa chỉ" value={driver.address} icon={<MapPinIcon size={13} color="var(--text-muted)" />} />

          {driver.rejectReason && (
            <div className="alert alert-error mb-4" style={{ fontSize: 13, marginTop: 12 }}>Lý do từ chối: {driver.rejectReason}</div>
          )}

          {/* Documents */}
          <div style={{ margin: "16px 0 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, display: "flex", alignItems: "center", gap: 6 }}>
            <ImageIcon size={13} color="var(--text-muted)" /> Giấy tờ KYC ({driver.documents.length}/5)
          </div>
          {driver.documents.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>Tài xế chưa tải giấy tờ nào.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {sortedDocs.map((doc) => (
                <button key={doc.id} type="button" disabled={!doc.url}
                  onClick={() => doc.url && onOpenImage(doc.url)}
                  style={{ padding: 0, border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "hidden", cursor: doc.url ? "zoom-in" : "default", background: "var(--bg-overlay)", textAlign: "left" }}>
                  {doc.url ? (
                    <img src={doc.url} alt={DOC_LABEL[doc.type] ?? doc.type} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: 90, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      <ImageIcon size={22} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", padding: "5px 7px" }}>{DOC_LABEL[doc.type] ?? doc.type}</div>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {driver.verificationStatus === "PENDING" && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
              {actionError && <div className="alert alert-error mb-3" style={{ fontSize: 13 }}>{actionError}</div>}
              {!rejecting ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-success" disabled={busy} onClick={doApprove} style={{ flex: 1, justifyContent: "center" }}>
                    <CheckIcon size={15} /> {busy ? "Đang duyệt..." : "Duyệt hồ sơ"}
                  </button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => { setRejecting(true); setRejectReason(""); setActionError(""); }} style={{ flex: 1, justifyContent: "center" }}>
                    Từ chối
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-2 font-semibold" style={{ fontSize: 13 }}>Lý do từ chối (tối thiểu 10 ký tự):</p>
                  <textarea className="form-input mb-3" rows={3} placeholder="Ảnh CCCD không rõ / Biển số không khớp / Bằng lái hết hạn..."
                    value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus style={{ resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-danger" disabled={busy} onClick={doReject}>
                      {busy ? "Đang gửi..." : "Xác nhận từ chối"}
                    </button>
                    <button className="btn btn-outline" disabled={busy} onClick={() => { setRejecting(false); setActionError(""); }}>Huỷ</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)", gap: 12, fontSize: 13, alignItems: "center" }}>
      <span style={{ color: "var(--text-muted)", width: 120, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>{icon}{label}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-word", textAlign: "right", marginLeft: "auto" }}>{value || "—"}</span>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import {
  FlagIcon, SearchIcon, RefreshIcon, CheckCircleIcon, AlertTriangleIcon, ClockIcon,
} from "@/components/ui/Icons";

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reporter: { fullName: string | null; phone: string };
  reportedUser: { fullName: string | null; phone: string };
}
interface Stats { open: number; investigating: number; resolved: number; dismissed: number; }

const STATUS_LABEL: Record<string, string> = { OPEN: "Mới", INVESTIGATING: "Đang xử lý", RESOLVED: "Đã giải quyết", DISMISSED: "Bỏ qua" };
const STATUS_BADGE: Record<string, string> = { OPEN: "badge-red", INVESTIGATING: "badge-amber", RESOLVED: "badge-green", DISMISSED: "badge-gray" };
const PAGE_SIZE = 20;

/* Cột hành động dính phải để nút luôn hiển thị khi cuộn ngang */
const stickyActionCell: React.CSSProperties = {
  position: "sticky",
  right: 0,
  background: "var(--bg-surface)",
  borderLeft: "1px solid var(--border-subtle)",
  zIndex: 1,
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage]   = useState(1);
  const [status, setStatus] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Report | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p = 1, opts?: { status?: string; search?: string }) => {
    setLoading(true);
    const st = opts?.status ?? status;
    const s  = opts?.search ?? search;
    const q = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (st) q.set("status", st);
    if (s)  q.set("search", s);
    api.get<{ items: Report[]; total: number; stats: Stats }>(`/admin/reports?${q}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); setStats(r.data.stats); setPage(p); setSelected(new Set()); })
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, { search: v }), 350);
  };
  const setStatusFilter = (st: string) => { setStatus(st); load(1, { status: st }); };

  const save = async (id: string, newStatus: string, adminNote: string) => {
    setBusy(true);
    try { await api.patch(`/admin/reports/${id}`, { status: newStatus, adminNote }); load(page); setDrawer(null); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  const bulkDismiss = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Bỏ qua ${ids.length} báo cáo đã chọn?`)) return;
    setBusy(true);
    try { await Promise.all(ids.map((id) => api.patch(`/admin/reports/${id}`, { status: "DISMISSED", adminNote: "Bỏ qua hàng loạt" }))); load(page); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSel = items.length > 0 && items.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(items.map((r) => r.id)));
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const cards = stats ? [
    { st: "OPEN",          label: "Mới",         value: stats.open,          icon: <AlertTriangleIcon size={18} color="#f87171" /> },
    { st: "INVESTIGATING", label: "Đang xử lý",  value: stats.investigating, icon: <ClockIcon size={18} color="#fbbf24" /> },
    { st: "RESOLVED",      label: "Đã giải quyết", value: stats.resolved,    icon: <CheckCircleIcon size={18} color="#34d399" /> },
    { st: "DISMISSED",     label: "Bỏ qua",      value: stats.dismissed,     icon: <FlagIcon size={18} color="#64748b" /> },
  ] : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}><FlagIcon size={22} color="#f472b6" /> Xử lý báo cáo</h1>
        <button className="btn btn-outline btn-sm" onClick={() => load(page)} disabled={loading}><RefreshIcon size={14} /> Làm mới</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
        {cards.map((c) => (
          <button key={c.st} onClick={() => setStatusFilter(c.st)} style={{
            textAlign: "left", cursor: "pointer", background: "var(--bg-surface)", borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${status === c.st ? "var(--border-strong)" : "var(--border-subtle)"}`,
            boxShadow: status === c.st ? "var(--glow-sm)" : "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>{c.icon}{status === c.st && <CheckCircleIcon size={14} color="var(--brand-primary)" />}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginTop: 8, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{c.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card mb-4"><div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><SearchIcon size={15} color="var(--text-muted)" /></span>
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Tìm theo người dùng, lý do..." value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
      </div></div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="card mb-4" style={{ borderColor: "var(--border-medium)" }}><div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="text-sm font-semibold">Đã chọn {selected.size}</span>
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={bulkDismiss}>Bỏ qua hàng loạt</button>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setSelected(new Set())}>Bỏ chọn</button>
        </div></div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allSel} onChange={toggleAll} /></th>
              <th>Người báo cáo</th><th>Bị báo cáo</th><th>Lý do</th><th>Trạng thái</th><th>Ngày</th>
              <th style={stickyActionCell}></th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton rows={6} cols={7} />
              : items.length === 0 ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>Không có báo cáo</td></tr>
              : items.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer", background: selected.has(r.id) ? "var(--bg-active)" : undefined }}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} /></td>
                  <td onClick={() => setDrawer(r)}>{r.reporter.fullName ?? r.reporter.phone}</td>
                  <td onClick={() => setDrawer(r)} style={{ fontWeight: 600 }}>{r.reportedUser.fullName ?? r.reportedUser.phone}</td>
                  <td onClick={() => setDrawer(r)} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                  <td onClick={() => setDrawer(r)}><span className={`badge ${STATUS_BADGE[r.status] ?? "badge-gray"}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                  <td onClick={() => setDrawer(r)} style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td onClick={(e) => e.stopPropagation()} style={selected.has(r.id) ? { ...stickyActionCell, background: "var(--bg-active)" } : stickyActionCell}><button className="btn btn-outline btn-sm" onClick={() => setDrawer(r)}>Xử lý</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="text-sm text-muted">Tổng {total} báo cáo</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1 || loading} onClick={() => load(page - 1)}>← Trước</button>
            <span className="text-sm text-muted">Trang {page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Sau →</button>
          </div>
        </div>
      </div>

      {drawer && <ReportDrawer report={drawer} busy={busy} onClose={() => setDrawer(null)} onSave={save} />}
    </div>
  );
}

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

function ReportDrawer({ report, busy, onClose, onSave }: {
  report: Report; busy: boolean; onClose: () => void; onSave: (id: string, status: string, note: string) => void;
}) {
  const [newStatus, setNewStatus] = useState(report.status === "OPEN" ? "INVESTIGATING" : report.status);
  const [note, setNote] = useState(report.adminNote ?? "");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" }} />
      <div style={{ width: "min(440px, 94vw)", height: "100%", background: "var(--bg-surface)", borderLeft: "1px solid var(--border-medium)", boxShadow: "-12px 0 40px rgba(0,0,0,.5)", overflowY: "auto" }}>
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>Báo cáo #{report.id.slice(-8)}</div>
            <span className={`badge ${STATUS_BADGE[report.status]}`} style={{ marginTop: 6 }}>{STATUS_LABEL[report.status]}</span></div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "var(--bg-overlay)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>NGƯỜI BÁO CÁO</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{report.reporter.fullName ?? "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{report.reporter.phone}</div>
            </div>
            <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid var(--danger-border)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 4 }}>BỊ BÁO CÁO</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{report.reportedUser.fullName ?? "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{report.reportedUser.phone}</div>
            </div>
          </div>

          <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Lý do</div>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{report.reason}</div>
          {report.description && (
            <div style={{ background: "var(--bg-overlay)", borderRadius: 10, padding: 12, fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, whiteSpace: "pre-wrap" }}>{report.description}</div>
          )}
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Lúc {new Date(report.createdAt).toLocaleString("vi-VN")}</div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
            <label className="form-label">Chuyển trạng thái</label>
            <select className="form-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ marginBottom: 12 }}>
              <option value="INVESTIGATING">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="DISMISSED">Bỏ qua</option>
            </select>
            <label className="form-label">Ghi chú admin</label>
            <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú nội bộ..." style={{ marginBottom: 14 }} />
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy} onClick={() => onSave(report.id, newStatus, note)}>Lưu xử lý</button>
          </div>
        </div>
      </div>
    </div>
  );
}

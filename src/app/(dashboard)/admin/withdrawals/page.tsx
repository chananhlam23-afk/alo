"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import {
  WalletIcon, SearchIcon, RefreshIcon, ClockIcon, CheckCircleIcon,
  CoinIcon, AlertTriangleIcon,
} from "@/components/ui/Icons";

interface Withdrawal {
  id: string;
  amount: number;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  status: string;
  createdAt: string;
  adminNote?: string | null;
  driverProfile: { user: { phone: string; fullName: string | null }; vehiclePlate?: string };
}
interface Stats { pending: number; approved: number; processing: number; rejected: number; done: number; pendingAmount: number; }

const vnd = (n: number) => n.toLocaleString("vi-VN") + "đ";
const STATUS_LABEL: Record<string, string> = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", PROCESSING: "Đang xử lý", REJECTED: "Từ chối", DONE: "Hoàn tất" };
const STATUS_BADGE: Record<string, string> = { PENDING: "badge-amber", APPROVED: "badge-blue", PROCESSING: "badge-blue", REJECTED: "badge-red", DONE: "badge-green" };

const PAGE_SIZE = 20;

/* Cột hành động dính phải để nút luôn hiển thị khi cuộn ngang */
const stickyActionCell: React.CSSProperties = {
  position: "sticky",
  right: 0,
  background: "var(--bg-surface)",
  borderLeft: "1px solid var(--border-subtle)",
  zIndex: 1,
};

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage]   = useState(1);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Withdrawal | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p = 1, opts?: { status?: string; search?: string }) => {
    setLoading(true);
    const st = opts?.status ?? status;
    const s  = opts?.search ?? search;
    const q = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (st) q.set("status", st);
    if (s)  q.set("search", s);
    api.get<{ items: Withdrawal[]; total: number; stats: Stats }>(`/admin/withdrawals?${q}`)
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

  const approve = async (id: string) => {
    setBusy(true);
    try { await api.post(`/admin/withdrawals/${id}/approve`, {}); load(page); setDrawer(null); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  const reject = async (id: string, note: string) => {
    if (!note.trim()) { alert("Nhập lý do từ chối"); return; }
    setBusy(true);
    try { await api.post(`/admin/withdrawals/${id}/reject`, { note }); load(page); setDrawer(null); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };
  const bulkApprove = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Duyệt ${ids.length} yêu cầu rút tiền đã chọn?`)) return;
    setBusy(true);
    try { await Promise.all(ids.map((id) => api.post(`/admin/withdrawals/${id}/approve`, {}))); load(page); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingItems = items.filter((w) => w.status === "PENDING");
  const allSel = pendingItems.length > 0 && pendingItems.every((w) => selected.has(w.id));
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(pendingItems.map((w) => w.id)));
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const cards = stats ? [
    { st: "PENDING",    label: "Chờ duyệt", value: String(stats.pending),  sub: vnd(stats.pendingAmount), icon: <ClockIcon size={18} color="#fbbf24" /> },
    { st: "APPROVED",   label: "Đã duyệt",  value: String(stats.approved), sub: "", icon: <CheckCircleIcon size={18} color="#22d3ee" /> },
    { st: "PROCESSING", label: "Đang xử lý", value: String(stats.processing), sub: "", icon: <RefreshIcon size={18} color="#a78bfa" /> },
    { st: "DONE",       label: "Hoàn tất",  value: String(stats.done),     sub: "", icon: <CheckCircleIcon size={18} color="#34d399" /> },
    { st: "REJECTED",   label: "Từ chối",   value: String(stats.rejected), sub: "", icon: <AlertTriangleIcon size={18} color="#f87171" /> },
  ] : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}><WalletIcon size={22} color="#34d399" /> Yêu cầu rút tiền</h1>
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
            {c.sub && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-amber)", marginTop: 4 }}>{c.sub}</div>}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card mb-4"><div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><SearchIcon size={15} color="var(--text-muted)" /></span>
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Tìm theo tài xế, SĐT, ngân hàng..." value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
      </div></div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="card mb-4" style={{ borderColor: "var(--border-medium)" }}><div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="text-sm font-semibold">Đã chọn {selected.size} yêu cầu</span>
          <button className="btn btn-success btn-sm" disabled={busy} onClick={bulkApprove}>Duyệt hàng loạt</button>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setSelected(new Set())}>Bỏ chọn</button>
        </div></div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th style={{ width: 36 }}>{status === "PENDING" && <input type="checkbox" checked={allSel} onChange={toggleAll} />}</th>
              <th>Tài xế</th><th>Số tiền</th><th>Ngân hàng</th><th>Trạng thái</th><th>Ngày</th>
              <th style={stickyActionCell}></th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton rows={6} cols={7} />
              : items.length === 0 ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>Không có yêu cầu</td></tr>
              : items.map((w) => (
                <tr key={w.id} style={{ cursor: "pointer", background: selected.has(w.id) ? "var(--bg-active)" : undefined }}>
                  <td onClick={(e) => e.stopPropagation()}>{w.status === "PENDING" && <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleSel(w.id)} />}</td>
                  <td onClick={() => setDrawer(w)}>
                    <div style={{ fontWeight: 600 }}>{w.driverProfile.user.fullName ?? "—"}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{w.driverProfile.user.phone}</div>
                  </td>
                  <td onClick={() => setDrawer(w)} style={{ fontWeight: 700, color: "var(--success)" }}>{vnd(w.amount)}</td>
                  <td onClick={() => setDrawer(w)} style={{ fontSize: 12 }}>
                    <div>{w.bankName}</div>
                    <div className="text-muted">{w.bankAccountNo}</div>
                  </td>
                  <td onClick={() => setDrawer(w)}><span className={`badge ${STATUS_BADGE[w.status] ?? "badge-gray"}`}>{STATUS_LABEL[w.status] ?? w.status}</span></td>
                  <td onClick={() => setDrawer(w)} style={{ fontSize: 12 }}>{new Date(w.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td onClick={(e) => e.stopPropagation()} style={selected.has(w.id) ? { ...stickyActionCell, background: "var(--bg-active)" } : stickyActionCell}>
                    {w.status === "PENDING"
                      ? <button className="btn btn-success btn-sm" disabled={busy} onClick={() => approve(w.id)}>Duyệt</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => setDrawer(w)}>Xem</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="text-sm text-muted">Tổng {total} yêu cầu</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1 || loading} onClick={() => load(page - 1)}>← Trước</button>
            <span className="text-sm text-muted">Trang {page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Sau →</button>
          </div>
        </div>
      </div>

      {drawer && <WithdrawDrawer w={drawer} busy={busy} onClose={() => setDrawer(null)} onApprove={approve} onReject={reject} />}
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

function WithdrawDrawer({ w, busy, onClose, onApprove, onReject }: {
  w: Withdrawal; busy: boolean; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string, note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" }} />
      <div style={{ width: "min(420px, 94vw)", height: "100%", background: "var(--bg-surface)", borderLeft: "1px solid var(--border-medium)", boxShadow: "-12px 0 40px rgba(0,0,0,.5)", overflowY: "auto" }}>
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Chi tiết rút tiền</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: "center", padding: "12px 0 18px" }}>
            <div style={{ display: "inline-flex", marginBottom: 6 }}><CoinIcon size={26} color="#fbbf24" /></div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--success)" }}>{vnd(w.amount)}</div>
            <span className={`badge ${STATUS_BADGE[w.status] ?? "badge-gray"}`} style={{ marginTop: 6 }}>{STATUS_LABEL[w.status] ?? w.status}</span>
          </div>
          <DRow label="Tài xế" value={w.driverProfile.user.fullName ?? "—"} />
          <DRow label="SĐT" value={w.driverProfile.user.phone} />
          <DRow label="Ngân hàng" value={w.bankName} />
          <DRow label="Số tài khoản" value={w.bankAccountNo} mono />
          <DRow label="Chủ tài khoản" value={w.bankAccountName} />
          <DRow label="Ngày yêu cầu" value={new Date(w.createdAt).toLocaleString("vi-VN")} />
          {w.adminNote && <DRow label="Ghi chú" value={w.adminNote} />}

          {w.status === "PENDING" && (
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border-subtle)", paddingTop: 18 }}>
              <button className="btn btn-success" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }} disabled={busy} onClick={() => onApprove(w.id)}>
                ✓ Duyệt & chuyển tiền
              </button>
              <label className="form-label">Lý do từ chối</label>
              <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: thông tin TK sai" style={{ marginBottom: 10 }} />
              <button className="btn btn-danger" style={{ width: "100%", justifyContent: "center" }} disabled={busy || !note.trim()} onClick={() => onReject(w.id, note)}>
                Từ chối yêu cầu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", width: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: mono ? "monospace" : "inherit", marginLeft: "auto", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

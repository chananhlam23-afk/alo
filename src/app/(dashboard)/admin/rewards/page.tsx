"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import ImageInput from "@/components/ui/ImageInput";
import {
  TicketIcon, ImageIcon, CalendarIcon, PlusIcon, TrashIcon,
  CheckCircleIcon, XIcon, ZapIcon, GiftIcon, MegaphoneIcon,
} from "@/components/ui/Icons";
import {
  VOUCHER_AUDIENCES, AUDIENCE_LABEL,
  VOUCHER_SERVICES, SERVICE_LABEL,
  VOUCHER_BOOKING_MODES, BOOKING_MODE_LABEL,
  VOUCHER_PAYMENT_METHODS, PAYMENT_METHOD_LABEL,
  DOW_LABEL, summarizeConditions,
  type VoucherAudience,
} from "@/lib/vouchers/conditions";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type VoucherType = "PERCENT" | "FIXED_AMOUNT" | "FREE_TRIP";
type VoucherStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "EXHAUSTED";
type BannerPosition = "HOME_TOP" | "HOME_BOTTOM" | "TRIP_LISTING" | "BOOKING_CONFIRM";
type EventStatus = "DRAFT" | "ACTIVE" | "ENDED";
type EventType = "CASHBACK" | "DOUBLE_POINT" | "DISCOUNT" | "FREE_RIDE" | "STREAK_BONUS" | "REFERRAL";
type Audience = "ALL" | "NEW_USER" | "DRIVER" | "CUSTOMER";

interface Voucher {
  id: string; code: string; name: string; description?: string;
  type: VoucherType; value: number; minOrderValue: number; maxDiscount?: number;
  usageLimit?: number; usedCount: number; userLimit: number;
  startsAt: string; expiresAt: string; status: VoucherStatus; targetRole?: string;
  conditions?: Record<string, unknown>;
  createdAt: string;
}

interface Banner {
  id: string; title: string; imageUrl: string; linkUrl?: string;
  position: BannerPosition; sortOrder: number; active: boolean;
  startsAt?: string; expiresAt?: string; clickCount: number; viewCount: number;
  createdAt: string;
}

interface PromotionEvent {
  id: string; name: string; description: string; imageUrl?: string;
  type: EventType; config: Record<string, unknown>; targetAudience?: string;
  status: EventStatus; startsAt: string; endsAt: string;
  budget?: number; usedBudget: number; createdAt: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtMoney = (n: number) => n.toLocaleString("vi-VN") + " VND";
const fmtPct = (n: number) => n + "%";

const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  PERCENT: "Giảm %", FIXED_AMOUNT: "Giảm tiền cố định", FREE_TRIP: "Chuyến miễn phí",
};
const VOUCHER_STATUS_COLOR: Record<VoucherStatus, string> = {
  ACTIVE: "#22d3ee", PAUSED: "#fbbf24", EXPIRED: "#6b7280", EXHAUSTED: "#ef4444",
};
const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  ACTIVE: "Đang chạy", PAUSED: "Tạm dừng", EXPIRED: "Hết hạn", EXHAUSTED: "Hết lượt",
};
const BANNER_POSITION_LABEL: Record<BannerPosition, string> = {
  HOME_TOP: "Trang chủ - Trên cùng", HOME_BOTTOM: "Trang chủ - Cuối",
  TRIP_LISTING: "Danh sách chuyến", BOOKING_CONFIRM: "Xác nhận đặt",
};
const EVENT_TYPE_LABEL: Record<EventType, string> = {
  CASHBACK: "Hoàn tiền", DOUBLE_POINT: "Điểm đôi", DISCOUNT: "Giảm giá",
  FREE_RIDE: "Chuyến miễn phí", STREAK_BONUS: "Thưởng Streak", REFERRAL: "Giới thiệu",
};
const EVENT_STATUS_COLOR: Record<EventStatus, string> = {
  DRAFT: "#6b7280", ACTIVE: "#22d3ee", ENDED: "#6366f1",
};
const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Nháp", ACTIVE: "Đang chạy", ENDED: "Đã kết thúc",
};

const TAB_LIST = [
  { id: "vouchers", label: "Voucher",  Icon: TicketIcon,  color: "#22d3ee" },
  { id: "banners",  label: "Banner",   Icon: ImageIcon,   color: "#a78bfa" },
  { id: "events",   label: "Sự kiện",  Icon: CalendarIcon, color: "#f97316" },
];

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, background: color + "20", border: `1px solid ${color}50`, borderRadius: 99, padding: "2px 8px" }}>
      {label}
    </span>
  );
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 14, width: "100%", maxWidth: wide ? 760 : 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,.4)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}>
            <XIcon size={16} />
          </button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormRow({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ─── Building blocks for the rich voucher form ───────────────────────────── */
function Section({ title, desc, accent = "#22d3ee", children }: { title: string; desc?: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "16px 18px", marginBottom: 16, background: "var(--bg-overlay)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: desc ? 2 : 14 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: accent }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
      </div>
      {desc && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14, marginLeft: 12 }}>{desc}</div>}
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "8px 0" }}>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        style={{ flexShrink: 0, marginTop: 1, width: 38, height: 22, borderRadius: 99, border: "none", cursor: "pointer", position: "relative", transition: "background .2s", background: checked ? "var(--brand-secondary)" : "var(--border-subtle)" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </button>
      <div>
        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{hint}</div>}
      </div>
    </label>
  );
}

function ChipMulti<T extends string>({ options, labels, value, onChange }: { options: readonly T[]; labels: Record<T, string>; value: T[]; onChange: (v: T[]) => void }) {
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            style={{ fontSize: 12, padding: "5px 12px", borderRadius: 99, cursor: "pointer", transition: "all .15s",
              border: `1px solid ${on ? "#22d3ee" : "var(--border-subtle)"}`,
              background: on ? "rgba(34,211,238,.15)" : "var(--bg-surface)",
              color: on ? "var(--brand-secondary)" : "var(--text-secondary)", fontWeight: on ? 600 : 400 }}>
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

function DowPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const order = [1, 2, 3, 4, 5, 6, 0]; // Hiển thị T2..CN
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {order.map((d) => {
        const on = value.includes(d);
        return (
          <button key={d} type="button" onClick={() => toggle(d)}
            style={{ flex: 1, fontSize: 12, padding: "6px 0", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${on ? "#22d3ee" : "var(--border-subtle)"}`,
              background: on ? "rgba(34,211,238,.15)" : "var(--bg-surface)",
              color: on ? "var(--brand-secondary)" : "var(--text-secondary)", fontWeight: on ? 700 : 400 }}>
            {DOW_LABEL[d]}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Voucher tab ─────────────────────────────────────────────────────────── */
function VouchersTab() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    // Cơ bản
    code: "", name: "", description: "", type: "PERCENT" as VoucherType,
    value: 10, minOrderValue: 0, maxDiscount: "" as string | number,
    usageLimit: "" as string | number, userLimit: 1,
    startsAt: "", expiresAt: "", targetRole: "",
    // Điều kiện nâng cao (conditions)
    audience: "ALL" as VoucherAudience,
    firstOrderOnly: false,
    newUserWithinDays: "" as string | number,
    inactiveDays: "" as string | number,
    minUserTrips: "" as string | number,
    specificUserIds: "",
    maxOrderValue: "" as string | number,
    minSeats: "" as string | number,
    minDistanceKm: "" as string | number,
    maxDistanceKm: "" as string | number,
    services: [] as string[],
    bookingModes: [] as string[],
    paymentMethods: [] as string[],
    originProvinces: "",
    destProvinces: "",
    daysOfWeek: [] as number[],
    activeFromHour: "" as string | number,
    activeToHour: "" as string | number,
    userDailyLimit: "" as string | number,
    totalBudget: "" as string | number,
    stackable: false,
    autoApply: false,
    priority: 0,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ vouchers: Voucher[] }>("/admin/vouchers?limit=100")
      .then(r => setVouchers(r.data.vouchers ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createVoucher = async () => {
    if (!form.code || !form.name || !form.startsAt || !form.expiresAt) return;
    setSaving(true);
    const num = (v: string | number) => (v === "" || v === null ? undefined : Number(v));
    const list = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    const a = form.audience;
    try {
      await api.post("/admin/vouchers", {
        code: form.code, name: form.name, description: form.description || undefined,
        type: form.type, value: Number(form.value),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscount: num(form.maxDiscount),
        usageLimit: num(form.usageLimit),
        userLimit: Number(form.userLimit) || 1,
        targetRole: form.targetRole || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
        conditions: {
          audience: a,
          firstOrderOnly: form.firstOrderOnly,
          newUserWithinDays: a === "NEW_USER" ? num(form.newUserWithinDays) : undefined,
          inactiveDays: a === "INACTIVE_USER" ? num(form.inactiveDays) : undefined,
          minUserTrips: num(form.minUserTrips),
          specificUserIds: a === "SPECIFIC_USERS" ? list(form.specificUserIds) : [],
          maxOrderValue: num(form.maxOrderValue),
          minSeats: num(form.minSeats),
          minDistanceKm: num(form.minDistanceKm),
          maxDistanceKm: num(form.maxDistanceKm),
          services: form.services,
          bookingModes: form.bookingModes,
          paymentMethods: form.paymentMethods,
          originProvinces: list(form.originProvinces),
          destProvinces: list(form.destProvinces),
          daysOfWeek: form.daysOfWeek,
          activeFromHour: num(form.activeFromHour),
          activeToHour: num(form.activeToHour),
          userDailyLimit: num(form.userDailyLimit),
          totalBudget: num(form.totalBudget),
          stackable: form.stackable,
          autoApply: form.autoApply,
          priority: Number(form.priority) || 0,
        },
      });
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      alert((e as Error)?.message || "Không tạo được voucher. Kiểm tra lại cấu hình.");
    } finally { setSaving(false); }
  };

  const toggleStatus = async (v: Voucher) => {
    const newStatus = v.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await api.put(`/admin/vouchers/${v.id}`, { status: newStatus });
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    }
  };

  const deleteVoucher = async (id: string) => {
    if (!confirm("Xóa voucher này?")) return;
    try {
      await api.del(`/admin/vouchers/${id}`);
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    }
  };

  const filtered = filter === "ALL" ? vouchers : vouchers.filter(v => v.status === filter);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Tổng voucher", value: vouchers.length, color: "var(--brand-primary)" },
          { label: "Đang chạy", value: vouchers.filter(v => v.status === "ACTIVE").length, color: "var(--brand-secondary)" },
          { label: "Tạm dừng", value: vouchers.filter(v => v.status === "PAUSED").length, color: "var(--brand-amber)" },
          { label: "Lượt dùng hôm nay", value: vouchers.reduce((s, v) => s + v.usedCount, 0), color: "var(--brand-secondary)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "ACTIVE", "PAUSED", "EXPIRED", "EXHAUSTED"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={filter === f ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            style={{ fontSize: 12, padding: "5px 12px" }}>
            {f === "ALL" ? "Tất cả" : VOUCHER_STATUS_LABEL[f as VoucherStatus]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Tạo Voucher
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã</th><th>Tên</th><th>Loại</th><th>Giá trị</th>
                <th>Đã dùng / Giới hạn</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Không có voucher nào</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td><code style={{ fontSize: 12, background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: 4, fontWeight: 700, color: "var(--brand-secondary)" }}>{v.code}</code></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.description}</div>}
                    {(() => {
                      const tags = summarizeConditions({ minOrderValue: v.minOrderValue, userLimit: v.userLimit }, v.conditions);
                      return tags.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5, maxWidth: 320 }}>
                          {tags.slice(0, 5).map((t, i) => (
                            <span key={i} style={{ fontSize: 10, color: "var(--text-secondary)", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "1px 6px" }}>{t}</span>
                          ))}
                          {tags.length > 5 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{tags.length - 5}</span>}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{VOUCHER_TYPE_LABEL[v.type]}</span></td>
                  <td>
                    <strong style={{ color: "var(--brand-secondary)" }}>
                      {v.type === "PERCENT" ? fmtPct(v.value) : v.type === "FIXED_AMOUNT" ? fmtMoney(v.value) : "Miễn phí"}
                    </strong>
                    {v.maxDiscount && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tối đa {fmtMoney(v.maxDiscount)}</div>}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, maxWidth: 80, height: 6, borderRadius: 3, background: "var(--bg-overlay)", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "var(--brand-secondary)", width: `${Math.min(100, v.usageLimit ? v.usedCount / v.usageLimit * 100 : 0)}%` }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{v.usedCount}{v.usageLimit ? ` / ${v.usageLimit}` : " / ∞"}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{fmtDate(v.startsAt)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>→ {fmtDate(v.expiresAt)}</div>
                  </td>
                  <td><Badge color={VOUCHER_STATUS_COLOR[v.status]} label={VOUCHER_STATUS_LABEL[v.status]} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(v.status === "ACTIVE" || v.status === "PAUSED") && (
                        <button type="button" onClick={() => toggleStatus(v)}
                          style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", fontSize: 11, color: v.status === "ACTIVE" ? "var(--brand-amber)" : "var(--brand-secondary)" }}>
                          {v.status === "ACTIVE" ? "Tạm dừng" : "Bật lại"}
                        </button>
                      )}
                      <button type="button" onClick={() => deleteVoucher(v.id)}
                        style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 6px", color: "var(--danger)", display: "flex", alignItems: "center" }}>
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Voucher mới" wide>
        {/* 1. Thông tin cơ bản */}
        <Section title="1. Thông tin cơ bản" accent="#22d3ee">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
            <FormRow label="Mã voucher" required>
              <input className="form-input" value={form.code} placeholder="VD: SUMMER20"
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </FormRow>
            <FormRow label="Tên hiển thị" required>
              <input className="form-input" value={form.name} placeholder="Giảm 20% mùa hè"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormRow>
          </div>
          <FormRow label="Mô tả chi tiết">
            <textarea className="form-input" value={form.description} rows={2} placeholder="Mô tả hiển thị cho khách..."
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "vertical" }} />
          </FormRow>
        </Section>

        {/* 2. Loại & giá trị */}
        <Section title="2. Loại khuyến mãi & giá trị" accent="#34d399">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Loại khuyến mãi" required>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as VoucherType }))}>
                <option value="PERCENT">Giảm theo %</option>
                <option value="FIXED_AMOUNT">Giảm tiền cố định</option>
                <option value="FREE_TRIP">Chuyến miễn phí</option>
              </select>
            </FormRow>
            {form.type !== "FREE_TRIP" && (
              <FormRow label={form.type === "PERCENT" ? "Phần trăm giảm (%)" : "Số tiền giảm (VND)"} required>
                <input className="form-input" type="number" min={0} max={form.type === "PERCENT" ? 100 : undefined} value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
              </FormRow>
            )}
          </div>
          {(form.type === "PERCENT" || form.type === "FREE_TRIP") && (
            <FormRow label={form.type === "PERCENT" ? "Giảm tối đa (VND)" : "Cước tối đa được miễn (VND)"} hint="Để trống = không giới hạn">
              <input className="form-input" type="number" min={0} value={form.maxDiscount} placeholder="Không giới hạn"
                onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} />
            </FormRow>
          )}
        </Section>

        {/* 3. Điều kiện đơn hàng */}
        <Section title="3. Điều kiện đơn hàng" accent="#fbbf24" desc="Đơn phải thoả các điều kiện này mới áp dụng được voucher. Để trống = không ràng buộc.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Giá trị đơn tối thiểu (VND)">
              <input className="form-input" type="number" min={0} value={form.minOrderValue}
                onChange={e => setForm(f => ({ ...f, minOrderValue: Number(e.target.value) }))} />
            </FormRow>
            <FormRow label="Giá trị đơn tối đa (VND)">
              <input className="form-input" type="number" min={0} value={form.maxOrderValue} placeholder="Không giới hạn"
                onChange={e => setForm(f => ({ ...f, maxOrderValue: e.target.value }))} />
            </FormRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <FormRow label="Số ghế tối thiểu">
              <input className="form-input" type="number" min={1} max={9} value={form.minSeats} placeholder="—"
                onChange={e => setForm(f => ({ ...f, minSeats: e.target.value }))} />
            </FormRow>
            <FormRow label="Quãng đường tối thiểu (km)">
              <input className="form-input" type="number" min={0} value={form.minDistanceKm} placeholder="—"
                onChange={e => setForm(f => ({ ...f, minDistanceKm: e.target.value }))} />
            </FormRow>
            <FormRow label="Quãng đường tối đa (km)">
              <input className="form-input" type="number" min={0} value={form.maxDistanceKm} placeholder="—"
                onChange={e => setForm(f => ({ ...f, maxDistanceKm: e.target.value }))} />
            </FormRow>
          </div>
        </Section>

        {/* 4. Đối tượng áp dụng */}
        <Section title="4. Đối tượng áp dụng" accent="#a78bfa" desc="Ai được dùng voucher này?">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Vai trò">
              <select className="form-input" value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}>
                <option value="">Tất cả vai trò</option>
                <option value="CUSTOMER">Khách hàng</option>
                <option value="DRIVER">Tài xế</option>
              </select>
            </FormRow>
            <FormRow label="Nhóm người dùng">
              <select className="form-input" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value as VoucherAudience }))}>
                {VOUCHER_AUDIENCES.map(a => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
              </select>
            </FormRow>
          </div>
          {form.audience === "NEW_USER" && (
            <FormRow label="Tài khoản tạo trong vòng (ngày)" hint="Chỉ tính là 'khách mới' nếu đăng ký chưa quá số ngày này. Để trống = chỉ cần chưa có chuyến nào.">
              <input className="form-input" type="number" min={1} value={form.newUserWithinDays} placeholder="VD: 30"
                onChange={e => setForm(f => ({ ...f, newUserWithinDays: e.target.value }))} />
            </FormRow>
          )}
          {form.audience === "INACTIVE_USER" && (
            <FormRow label="Không đi chuyến trong (ngày)" hint="Khách từng đi nhưng đã ngừng quá số ngày này.">
              <input className="form-input" type="number" min={1} value={form.inactiveDays} placeholder="VD: 60"
                onChange={e => setForm(f => ({ ...f, inactiveDays: e.target.value }))} />
            </FormRow>
          )}
          {form.audience === "SPECIFIC_USERS" && (
            <FormRow label="Danh sách người dùng" hint="Mỗi dòng (hoặc ngăn bằng dấu phẩy) là một User ID hoặc số điện thoại.">
              <textarea className="form-input" rows={3} value={form.specificUserIds} placeholder={"0901234567\n0987654321"}
                onChange={e => setForm(f => ({ ...f, specificUserIds: e.target.value }))} style={{ resize: "vertical" }} />
            </FormRow>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
            <FormRow label="Yêu cầu tối thiểu (số chuyến đã đi)">
              <input className="form-input" type="number" min={0} value={form.minUserTrips} placeholder="—"
                onChange={e => setForm(f => ({ ...f, minUserTrips: e.target.value }))} />
            </FormRow>
            <Toggle label="Chỉ áp dụng cho chuyến đầu tiên" hint="Khách chưa hoàn thành chuyến nào"
              checked={form.firstOrderOnly} onChange={v => setForm(f => ({ ...f, firstOrderOnly: v }))} />
          </div>
        </Section>

        {/* 5. Phạm vi áp dụng */}
        <Section title="5. Phạm vi áp dụng" accent="#f97316" desc="Không chọn = áp dụng cho tất cả.">
          <FormRow label="Dịch vụ áp dụng">
            <ChipMulti options={VOUCHER_SERVICES} labels={SERVICE_LABEL} value={form.services as never[]}
              onChange={v => setForm(f => ({ ...f, services: v }))} />
          </FormRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Hình thức đặt">
              <ChipMulti options={VOUCHER_BOOKING_MODES} labels={BOOKING_MODE_LABEL} value={form.bookingModes as never[]}
                onChange={v => setForm(f => ({ ...f, bookingModes: v }))} />
            </FormRow>
            <FormRow label="Phương thức thanh toán">
              <ChipMulti options={VOUCHER_PAYMENT_METHODS} labels={PAYMENT_METHOD_LABEL} value={form.paymentMethods as never[]}
                onChange={v => setForm(f => ({ ...f, paymentMethods: v }))} />
            </FormRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Tỉnh/thành điểm đón" hint="Ngăn cách bằng dấu phẩy">
              <input className="form-input" value={form.originProvinces} placeholder="VD: Hà Nội, Hải Phòng"
                onChange={e => setForm(f => ({ ...f, originProvinces: e.target.value }))} />
            </FormRow>
            <FormRow label="Tỉnh/thành điểm đến" hint="Ngăn cách bằng dấu phẩy">
              <input className="form-input" value={form.destProvinces} placeholder="VD: TP HCM"
                onChange={e => setForm(f => ({ ...f, destProvinces: e.target.value }))} />
            </FormRow>
          </div>
          <FormRow label="Ngày áp dụng trong tuần">
            <DowPicker value={form.daysOfWeek} onChange={v => setForm(f => ({ ...f, daysOfWeek: v }))} />
          </FormRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Khung giờ — từ (0–23)">
              <input className="form-input" type="number" min={0} max={23} value={form.activeFromHour} placeholder="—"
                onChange={e => setForm(f => ({ ...f, activeFromHour: e.target.value }))} />
            </FormRow>
            <FormRow label="Khung giờ — đến (0–23)">
              <input className="form-input" type="number" min={0} max={23} value={form.activeToHour} placeholder="—"
                onChange={e => setForm(f => ({ ...f, activeToHour: e.target.value }))} />
            </FormRow>
          </div>
        </Section>

        {/* 6. Giới hạn & ngân sách */}
        <Section title="6. Giới hạn & ngân sách" accent="#ef4444">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <FormRow label="Tổng lượt dùng">
              <input className="form-input" type="number" min={1} value={form.usageLimit} placeholder="∞"
                onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
            </FormRow>
            <FormRow label="Lượt / người">
              <input className="form-input" type="number" min={1} value={form.userLimit}
                onChange={e => setForm(f => ({ ...f, userLimit: Number(e.target.value) }))} />
            </FormRow>
            <FormRow label="Lượt / người / ngày">
              <input className="form-input" type="number" min={1} value={form.userDailyLimit} placeholder="∞"
                onChange={e => setForm(f => ({ ...f, userDailyLimit: e.target.value }))} />
            </FormRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Tổng ngân sách giảm giá (VND)" hint="Voucher tự khoá khi tổng tiền đã giảm chạm mức này.">
              <input className="form-input" type="number" min={0} value={form.totalBudget} placeholder="Không giới hạn"
                onChange={e => setForm(f => ({ ...f, totalBudget: e.target.value }))} />
            </FormRow>
            <FormRow label="Độ ưu tiên hiển thị" hint="Số càng lớn càng ưu tiên.">
              <input className="form-input" type="number" min={0} value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
            </FormRow>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Toggle label="Cho phép cộng dồn" hint="Dùng chung với khuyến mãi khác"
              checked={form.stackable} onChange={v => setForm(f => ({ ...f, stackable: v }))} />
            <Toggle label="Tự động áp dụng" hint="Tự gợi ý/áp khi khách đủ điều kiện"
              checked={form.autoApply} onChange={v => setForm(f => ({ ...f, autoApply: v }))} />
          </div>
        </Section>

        {/* 7. Thời gian hiệu lực */}
        <Section title="7. Thời gian hiệu lực" accent="#6366f1">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="Ngày bắt đầu" required>
              <input className="form-input" type="datetime-local" value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
            </FormRow>
            <FormRow label="Ngày hết hạn" required>
              <input className="form-input" type="datetime-local" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </FormRow>
          </div>
        </Section>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4, position: "sticky", bottom: 0, background: "var(--bg-surface)", paddingTop: 12 }}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={createVoucher} disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo Voucher"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Banner tab ─────────────────────────────────────────────────────────── */
function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posFilter, setPosFilter] = useState("ALL");
  const [form, setForm] = useState({
    title: "", imageUrl: "", linkUrl: "",
    position: "HOME_TOP" as BannerPosition,
    sortOrder: 0, active: true, startsAt: "", expiresAt: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ banners: Banner[] }>("/admin/banners")
      .then(r => setBanners(r.data.banners ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBanner = async () => {
    if (!form.title || !form.imageUrl) return;
    setSaving(true);
    try {
      await api.post("/admin/banners", {
        ...form,
        linkUrl: form.linkUrl || undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      setShowCreate(false);
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    } finally { setSaving(false); }
  };

  const toggleBanner = async (b: Banner) => {
    try {
      await api.put(`/admin/banners/${b.id}`, { active: !b.active });
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Xóa banner này?")) return;
    try {
      await api.del(`/admin/banners/${id}`);
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    }
  };

  const positions = ["HOME_TOP", "HOME_BOTTOM", "TRIP_LISTING", "BOOKING_CONFIRM"] as BannerPosition[];
  const filtered = posFilter === "ALL" ? banners : banners.filter(b => b.position === posFilter);

  return (
    <div>
      {/* Stats by position */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {positions.map(pos => {
          const count = banners.filter(b => b.position === pos).length;
          const active = banners.filter(b => b.position === pos && b.active).length;
          return (
            <div key={pos} className="card" style={{ padding: "12px 16px", cursor: "pointer", border: posFilter === pos ? "1px solid var(--brand-violet)" : undefined }}
              onClick={() => setPosFilter(posFilter === pos ? "ALL" : pos)}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {BANNER_POSITION_LABEL[pos]}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand-violet)" }}>{count}</div>
              <div style={{ fontSize: 11, color: "var(--brand-secondary)" }}>{active} đang hiển thị</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button type="button" onClick={() => setPosFilter("ALL")}
          style={{ fontSize: 12, color: posFilter === "ALL" ? "var(--brand-violet)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {posFilter !== "ALL" && "← "} Tất cả vị trí ({banners.length})
        </button>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Thêm Banner
        </button>
      </div>

      {/* Banner cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map(b => (
            <div key={b.id} className="card" style={{ overflow: "hidden", opacity: b.active ? 1 : 0.6 }}>
              {/* Image preview */}
              <div style={{ width: "100%", height: 140, background: "var(--bg-overlay)", position: "relative", overflow: "hidden" }}>
                <img src={b.imageUrl} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ position: "absolute", top: 8, left: 8 }}>
                  <Badge color="#a78bfa" label={BANNER_POSITION_LABEL[b.position]} />
                </div>
                <div style={{ position: "absolute", top: 8, right: 8 }}>
                  <Badge color={b.active ? "#22d3ee" : "#6b7280"} label={b.active ? "Hiển thị" : "Ẩn"} />
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{b.title}</div>
                {b.linkUrl && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.linkUrl}</div>}
                <div style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                  <span>👁 {b.viewCount.toLocaleString()}</span>
                  <span>·</span>
                  <span>🖱 {b.clickCount.toLocaleString()}</span>
                  <span>·</span>
                  <span>Thứ tự: {b.sortOrder}</span>
                </div>
                {(b.startsAt || b.expiresAt) && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                    {b.startsAt && <span>{fmtDate(b.startsAt)} </span>}
                    {b.expiresAt && <span>→ {fmtDate(b.expiresAt)}</span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => toggleBanner(b)}
                    className={b.active ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
                    style={{ flex: 1, fontSize: 12 }}>
                    {b.active ? "Ẩn banner" : "Hiển thị"}
                  </button>
                  <button type="button" onClick={() => deleteBanner(b.id)}
                    style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", color: "var(--danger)", display: "flex", alignItems: "center" }}>
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              Chưa có banner nào
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Thêm Banner mới">
        <FormRow label="Tiêu đề banner" required>
          <input className="form-input" value={form.title} placeholder="Ưu đãi mùa hè 2026"
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </FormRow>
        <FormRow label="Hình ảnh" required>
          <ImageInput value={form.imageUrl} onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))} previewHeight={100} />
        </FormRow>
        <FormRow label="Link khi click">
          <input className="form-input" value={form.linkUrl} placeholder="https://..."
            onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} />
        </FormRow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Vị trí" required>
            <select className="form-input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as BannerPosition }))}>
              {positions.map(p => <option key={p} value={p}>{BANNER_POSITION_LABEL[p]}</option>)}
            </select>
          </FormRow>
          <FormRow label="Thứ tự hiển thị">
            <input className="form-input" type="number" min={0} value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </FormRow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Ngày bắt đầu">
            <input className="form-input" type="datetime-local" value={form.startsAt}
              onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
          </FormRow>
          <FormRow label="Ngày hết hạn">
            <input className="form-input" type="datetime-local" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          </FormRow>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={createBanner} disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm Banner"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Events tab ─────────────────────────────────────────────────────────── */
const EVENT_TYPE_CONFIG: Record<EventType, { label: string; fields: Array<{ key: string; label: string; type: string; placeholder?: string }> }> = {
  CASHBACK:      { label: "Hoàn tiền", fields: [{ key: "cashbackPct", label: "% hoàn tiền", type: "number", placeholder: "10" }, { key: "maxCashback", label: "Tối đa (VND)", type: "number", placeholder: "50000" }] },
  DOUBLE_POINT:  { label: "Điểm đôi", fields: [{ key: "multiplier", label: "Hệ số nhân", type: "number", placeholder: "2" }] },
  DISCOUNT:      { label: "Giảm giá", fields: [{ key: "discountPct", label: "% giảm", type: "number", placeholder: "15" }, { key: "maxDiscount", label: "Tối đa (VND)", type: "number", placeholder: "30000" }] },
  FREE_RIDE:     { label: "Chuyến miễn phí", fields: [{ key: "maxFare", label: "Cước tối đa (VND)", type: "number", placeholder: "100000" }, { key: "tripsPerUser", label: "Số chuyến / người", type: "number", placeholder: "1" }] },
  STREAK_BONUS:  { label: "Thưởng Streak", fields: [{ key: "streakTarget", label: "Số chuyến cần đạt", type: "number", placeholder: "7" }, { key: "bonusAmount", label: "Thưởng (VND)", type: "number", placeholder: "50000" }] },
  REFERRAL:      { label: "Giới thiệu", fields: [{ key: "referrerBonus", label: "Thưởng người giới thiệu (VND)", type: "number", placeholder: "30000" }, { key: "refereeBonus", label: "Thưởng người được giới thiệu (VND)", type: "number", placeholder: "20000" }] },
};

function EventsTab() {
  const [events, setEvents] = useState<PromotionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState({
    name: "", description: "", imageUrl: "",
    type: "CASHBACK" as EventType,
    targetAudience: "ALL" as Audience,
    startsAt: "", endsAt: "", budget: "" as string | number,
    config: {} as Record<string, unknown>,
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ events: PromotionEvent[] }>("/admin/events?limit=100")
      .then(r => setEvents(r.data.events ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createEvent = async () => {
    if (!form.name || !form.startsAt || !form.endsAt) return;
    setSaving(true);
    try {
      await api.post("/admin/events", {
        name: form.name, description: form.description, imageUrl: form.imageUrl || undefined,
        type: form.type, targetAudience: form.targetAudience,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        budget: form.budget === "" ? undefined : Number(form.budget),
        config: form.config,
      });
      setShowCreate(false);
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    } finally { setSaving(false); }
  };

  const changeStatus = async (e: PromotionEvent, status: EventStatus) => {
    try {
      await api.put(`/admin/events/${e.id}`, { status });
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Xóa sự kiện này?")) return;
    try {
      await api.del(`/admin/events/${id}`);
      load();
    } catch (err) {
      alert((err as Error)?.message || "Thao tác thất bại");
    }
  };

  const setConfigField = (key: string, val: unknown) =>
    setForm(f => ({ ...f, config: { ...f.config, [key]: val } }));

  const filtered = statusFilter === "ALL" ? events : events.filter(e => e.status === statusFilter);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Tổng sự kiện", value: events.length, color: "var(--brand-primary)" },
          { label: "Đang chạy", value: events.filter(e => e.status === "ACTIVE").length, color: "var(--brand-secondary)" },
          { label: "Nháp", value: events.filter(e => e.status === "DRAFT").length, color: "var(--brand-amber)" },
          { label: "Đã kết thúc", value: events.filter(e => e.status === "ENDED").length, color: "#6b7280" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {["ALL", "DRAFT", "ACTIVE", "ENDED"].map(f => (
          <button key={f} type="button" onClick={() => setStatusFilter(f)}
            className={statusFilter === f ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            style={{ fontSize: 12, padding: "5px 12px" }}>
            {f === "ALL" ? "Tất cả" : EVENT_STATUS_LABEL[f as EventStatus]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Tạo Sự kiện
        </button>
      </div>

      {/* Event cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(ev => {
            const now = new Date();
            const starts = new Date(ev.startsAt);
            const ends = new Date(ev.endsAt);
            const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86400000));
            const budgetUsedPct = ev.budget ? Math.min(100, ev.usedBudget / ev.budget * 100) : 0;

            return (
              <div key={ev.id} className="card" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
                {/* Image or type icon */}
                {ev.imageUrl ? (
                  <div style={{ width: 72, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                    <img src={ev.imageUrl} alt={ev.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                  </div>
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: `${EVENT_STATUS_COLOR[ev.status]}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {ev.type === "STREAK_BONUS" ? <ZapIcon size={22} color={EVENT_STATUS_COLOR[ev.status]} /> :
                     ev.type === "REFERRAL" ? <GiftIcon size={22} color={EVENT_STATUS_COLOR[ev.status]} /> :
                     <MegaphoneIcon size={22} color={EVENT_STATUS_COLOR[ev.status]} />}
                  </div>
                )}

                {/* Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{ev.name}</span>
                    <Badge color={EVENT_STATUS_COLOR[ev.status]} label={EVENT_STATUS_LABEL[ev.status]} />
                    <span style={{ fontSize: 11, background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: 4, color: "var(--text-muted)" }}>{EVENT_TYPE_LABEL[ev.type]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{ev.description}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                    <span>📅 {fmtDate(ev.startsAt)} → {fmtDate(ev.endsAt)}</span>
                    {ev.status === "ACTIVE" && <span style={{ color: daysLeft <= 3 ? "var(--danger)" : "var(--brand-secondary)" }}>⏱ Còn {daysLeft} ngày</span>}
                    <span>👥 {ev.targetAudience ?? "ALL"}</span>
                    {ev.budget && <span>💰 Ngân sách: {fmtMoney(ev.budget)}</span>}
                  </div>
                  {ev.budget && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 200, height: 4, borderRadius: 2, background: "var(--bg-overlay)" }}>
                        <div style={{ height: "100%", background: budgetUsedPct > 80 ? "var(--danger)" : "var(--brand-secondary)", width: `${budgetUsedPct}%`, borderRadius: 2, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(budgetUsedPct)}% ngân sách</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                  {ev.status === "DRAFT" && (
                    <button type="button" onClick={() => changeStatus(ev, "ACTIVE")} className="btn btn-primary btn-sm" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      <CheckCircleIcon size={12} style={{ marginRight: 4 }} /> Kích hoạt
                    </button>
                  )}
                  {ev.status === "ACTIVE" && (
                    <button type="button" onClick={() => changeStatus(ev, "ENDED")} className="btn btn-outline btn-sm" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      Kết thúc sớm
                    </button>
                  )}
                  <button type="button" onClick={() => deleteEvent(ev.id)}
                    style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", color: "var(--danger)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <TrashIcon size={12} /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Chưa có sự kiện nào</div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Sự kiện mới">
        <FormRow label="Tên sự kiện" required>
          <input className="form-input" value={form.name} placeholder="Hè sôi động 2026"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </FormRow>
        <FormRow label="Mô tả" required>
          <textarea className="form-input" value={form.description} rows={3}
            placeholder="Mô tả chi tiết sự kiện..."
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ resize: "vertical" }} />
        </FormRow>
        <FormRow label="Ảnh sự kiện">
          <ImageInput value={form.imageUrl} onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))} previewHeight={120} />
        </FormRow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Loại sự kiện" required>
            <select className="form-input" value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType, config: {} }))}>
              {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormRow>
          <FormRow label="Đối tượng">
            <select className="form-input" value={form.targetAudience}
              onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value as Audience }))}>
              <option value="ALL">Tất cả</option>
              <option value="CUSTOMER">Khách hàng</option>
              <option value="DRIVER">Tài xế</option>
              <option value="NEW_USER">Người dùng mới</option>
            </select>
          </FormRow>
        </div>

        {/* Dynamic config fields */}
        {EVENT_TYPE_CONFIG[form.type].fields.length > 0 && (
          <div style={{ background: "var(--bg-overlay)", borderRadius: 8, padding: "14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Cấu hình {EVENT_TYPE_CONFIG[form.type].label}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {EVENT_TYPE_CONFIG[form.type].fields.map(f => (
                <FormRow key={f.key} label={f.label}>
                  <input className="form-input" type={f.type} placeholder={f.placeholder}
                    value={(form.config[f.key] as string | number) ?? ""}
                    onChange={e => setConfigField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)} />
                </FormRow>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Ngày bắt đầu" required>
            <input className="form-input" type="datetime-local" value={form.startsAt}
              onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
          </FormRow>
          <FormRow label="Ngày kết thúc" required>
            <input className="form-input" type="datetime-local" value={form.endsAt}
              onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
          </FormRow>
        </div>
        <FormRow label="Ngân sách tối đa (VND)">
          <input className="form-input" type="number" min={0} value={form.budget}
            placeholder="Không giới hạn"
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
        </FormRow>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={createEvent} disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo Sự kiện"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminRewardsPage() {
  const [tab, setTab] = useState("vouchers");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Khuyến mãi & Phần thưởng</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Quản lý voucher, banner quảng cáo và chiến dịch marketing</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-subtle)" }}>
        {TAB_LIST.map(({ id, label, Icon, color }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} type="button"
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                borderRadius: "8px 8px 0 0", border: "1px solid transparent",
                borderBottom: active ? "2px solid " + color : "1px solid transparent",
                background: active ? `${color}12` : "transparent",
                color: active ? color : "var(--text-muted)",
                fontWeight: active ? 600 : 400, fontSize: 13, cursor: "pointer", transition: "all .15s",
              }}>
              <Icon size={15} color={active ? color : "currentColor"} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "vouchers" && <VouchersTab />}
      {tab === "banners"  && <BannersTab />}
      {tab === "events"   && <EventsTab />}
    </div>
  );
}

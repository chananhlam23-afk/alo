"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import { PlusIcon, TrashIcon, SlidersIcon, CarIcon, PackageIcon, WalletIcon, ZapIcon } from "@/components/ui/Icons";

interface KmTier { upToKm: number; pricePerKm: number }
interface WeightTier { upToKg: number; pricePerKg: number }

interface SurgeRules {
  waitingFeePerMin: number;
  freeWaitMin: number;
  nightSurchargeMultiplier: number;
  nightStart: string;
  nightEnd: string;
  peakSurchargeMultiplier: number;
  peakHours: string;
  cancellationFreeMin: number;
  cancellationFee: number;
}

interface CargoPricing {
  enabled: boolean;
  basePricePerKg: number;
  minCharge: number;
  maxWeightKg: number;
  weightTiers: WeightTier[];
}

interface PricingConfig {
  id: string;
  baseFare: number;
  commissionPct: number;
  costShareCapPct: number;
  holdDays: number;
  perKmTiers: KmTier[];
  surgeRules: SurgeRules;
  cargoPricing: CargoPricing;
}

const TAB_LIST = [
  { id: "passenger", label: "Chở người", Icon: CarIcon, color: "#6366f1" },
  { id: "cargo",     label: "Hàng hóa",  Icon: PackageIcon, color: "#f97316" },
  { id: "commission", label: "Hoa hồng & Tài xế", Icon: WalletIcon, color: "#22d3ee" },
  { id: "surge",     label: "Phụ thu & Phí", Icon: ZapIcon, color: "#fbbf24" },
];

const defaultSurge: SurgeRules = {
  waitingFeePerMin: 500, freeWaitMin: 5,
  nightSurchargeMultiplier: 1.2, nightStart: "22:00", nightEnd: "05:00",
  peakSurchargeMultiplier: 1.3, peakHours: "07:00-09:00,17:00-19:00",
  cancellationFreeMin: 3, cancellationFee: 10000,
};

const defaultCargo: CargoPricing = {
  enabled: true, basePricePerKg: 3000, minCharge: 15000, maxWeightKg: 200,
  weightTiers: [{ upToKg: 10, pricePerKg: 4000 }, { upToKg: 50, pricePerKg: 3000 }],
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, marginTop: 4, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, suffix, min = 0, step = 1 }: {
  value: number; onChange: (v: number) => void; suffix?: string; min?: number; step?: number
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input className="form-input" type="number" min={min} step={step}
        value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", maxWidth: 160 }} />
      {suffix && <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="form-input" type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%" }} />;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <div style={{ width: 40, height: 22, borderRadius: 11, background: on ? "var(--brand-secondary)" : "var(--bg-overlay)", border: `2px solid ${on ? "var(--brand-secondary)" : "var(--border-subtle)"}`, position: "relative", transition: "all .2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: on ? "#fff" : "var(--text-muted)", transition: "left .2s" }} />
      </div>
      {label && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>}
    </button>
  );
}

export default function AdminPricingPage() {
  const [tab, setTab] = useState("passenger");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [baseFare, setBaseFare] = useState(10000);
  const [kmTiers, setKmTiers] = useState<KmTier[]>([{ upToKm: 30, pricePerKm: 4500 }, { upToKm: 100, pricePerKm: 3500 }, { upToKm: 9999, pricePerKm: 3000 }]);
  const [surge, setSurge] = useState<SurgeRules>(defaultSurge);
  const [cargo, setCargo] = useState<CargoPricing>(defaultCargo);
  const [commissionPct, setCommissionPct] = useState(15);
  const [costShareCapPct, setCostShareCapPct] = useState(50);
  const [holdDays, setHoldDays] = useState(3);

  useEffect(() => {
    api.get<{ pricingConfig: PricingConfig }>("/admin/pricing")
      .then((r) => {
        const c = r.data.pricingConfig;
        if (!c) return;
        setBaseFare(c.baseFare);
        setCommissionPct(Math.round(c.commissionPct * 100));
        setCostShareCapPct(Math.round(c.costShareCapPct * 100));
        setHoldDays(c.holdDays);
        if (c.perKmTiers?.length) setKmTiers(c.perKmTiers);
        if (c.surgeRules && Object.keys(c.surgeRules).length) setSurge({ ...defaultSurge, ...c.surgeRules });
        if (c.cargoPricing && Object.keys(c.cargoPricing).length) setCargo({ ...defaultCargo, ...c.cargoPricing });
      })
      .finally(() => setLoading(false));
  }, []);

  const addKmTier = () => setKmTiers(t => [...t, { upToKm: 0, pricePerKm: 0 }]);
  const removeKmTier = (i: number) => setKmTiers(t => t.filter((_, idx) => idx !== i));
  const updateKmTier = (i: number, key: keyof KmTier, val: number) =>
    setKmTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [key]: val } : tier));

  const addWeightTier = () => setCargo(c => ({ ...c, weightTiers: [...c.weightTiers, { upToKg: 0, pricePerKg: 0 }] }));
  const removeWeightTier = (i: number) => setCargo(c => ({ ...c, weightTiers: c.weightTiers.filter((_, idx) => idx !== i) }));
  const updateWeightTier = (i: number, key: keyof WeightTier, val: number) =>
    setCargo(c => ({ ...c, weightTiers: c.weightTiers.map((tier, idx) => idx === i ? { ...tier, [key]: val } : tier) }));

  const save = useCallback(async () => {
    setSaving(true); setError("");
    try {
      await api.put("/admin/pricing", {
        baseFare,
        commissionPct: commissionPct / 100,
        costShareCapPct: costShareCapPct / 100,
        holdDays,
        perKmTiers: kmTiers,
        surgeRules: surge,
        cargoPricing: cargo,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Lỗi khi lưu cấu hình");
    } finally { setSaving(false); }
  }, [baseFare, commissionPct, costShareCapPct, holdDays, kmTiers, surge, cargo]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Đang tải cấu hình...</div>;

  const s = (key: keyof SurgeRules) => (val: number | string) =>
    setSurge(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Cấu hình bảng giá</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Quản lý toàn bộ cấu trúc giá của nền tảng</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 130 }}>
          {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu tất cả"}
        </button>
      </div>

      {saved && <div className="alert alert-success" style={{ marginBottom: 16 }}>Đã lưu cấu hình thành công!</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 0 }}>
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
                fontWeight: active ? 600 : 400, fontSize: 13, cursor: "pointer",
                transition: "all .15s",
              }}>
              <Icon size={15} color={active ? color : "currentColor"} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Chở người ────────────────────────────────────────── */}
      {tab === "passenger" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Left column */}
          <div>
            <div className="card">
              <div className="card-header">
                <SlidersIcon size={14} style={{ marginRight: 8 }} />Giá cơ bản
              </div>
              <div className="card-body">
                <Row label="Cước tối thiểu" hint="Phí tối thiểu mỗi chuyến khi quãng đường ngắn">
                  <NumInput value={baseFare} onChange={setBaseFare} suffix="VND" />
                </Row>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Bảng giá theo km</span>
                <button type="button" onClick={addKmTier} className="btn btn-sm btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}>
                  <PlusIcon size={12} /> Thêm bậc
                </button>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ padding: "12px 16px 4px", display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Đến (km)</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Giá / km (VND)</div>
                  <div />
                </div>
                {kmTiers.map((tier, i) => (
                  <div key={i} style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 8, alignItems: "center", borderTop: "1px solid var(--border-subtle)" }}>
                    <input className="form-input" type="number" min={0} value={tier.upToKm}
                      onChange={(e) => updateKmTier(i, "upToKm", Number(e.target.value))} />
                    <input className="form-input" type="number" min={0} value={tier.pricePerKm}
                      onChange={(e) => updateKmTier(i, "pricePerKm", Number(e.target.value))} />
                    <button type="button" onClick={() => removeKmTier(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Xóa bậc">
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                  Bậc cuối dùng số km lớn (vd: 9999) để áp dụng cho mọi quãng đường còn lại
                </div>
              </div>
            </div>
          </div>

          {/* Right column – Phí chờ + phí hủy */}
          <div>
            <div className="card">
              <div className="card-header">Phí chờ khách</div>
              <div className="card-body">
                <Row label="Miễn phí chờ" hint="Tài xế chờ miễn phí trong vòng X phút">
                  <NumInput value={surge.freeWaitMin} onChange={s("freeWaitMin")} suffix="phút" />
                </Row>
                <Row label="Phí chờ / phút" hint="Thu của hành khách sau khi hết thời gian miễn phí">
                  <NumInput value={surge.waitingFeePerMin} onChange={s("waitingFeePerMin")} suffix="VND/phút" />
                </Row>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-header">Phí hủy chuyến</div>
              <div className="card-body">
                <Row label="Miễn phí hủy trong" hint="Hủy trong X phút đầu không mất phí">
                  <NumInput value={surge.cancellationFreeMin} onChange={s("cancellationFreeMin")} suffix="phút" />
                </Row>
                <Row label="Phí hủy sau thời gian miễn phí" hint="Phí cố định tính khi hủy trễ">
                  <NumInput value={surge.cancellationFee} onChange={s("cancellationFee")} suffix="VND" />
                </Row>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Hàng hóa ─────────────────────────────────────────── */}
      {tab === "cargo" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          <div>
            <div className="card">
              <div className="card-header">Cài đặt chung</div>
              <div className="card-body">
                <Row label="Bật vận chuyển hàng" hint="Tắt để ẩn tính năng gửi hàng trên app">
                  <Toggle on={cargo.enabled} onChange={(v) => setCargo(c => ({ ...c, enabled: v }))} label={cargo.enabled ? "Đang bật" : "Đã tắt"} />
                </Row>
                <Row label="Khối lượng tối đa" hint="Giới hạn trọng lượng mỗi lô hàng">
                  <NumInput value={cargo.maxWeightKg} onChange={(v) => setCargo(c => ({ ...c, maxWeightKg: v }))} suffix="kg" />
                </Row>
                <Row label="Phí tối thiểu" hint="Giá tối thiểu dù hàng rất nhẹ">
                  <NumInput value={cargo.minCharge} onChange={(v) => setCargo(c => ({ ...c, minCharge: v }))} suffix="VND" />
                </Row>
                <Row label="Giá cơ bản / kg" hint="Giá mặc định khi không có bậc phù hợp">
                  <NumInput value={cargo.basePricePerKg} onChange={(v) => setCargo(c => ({ ...c, basePricePerKg: v }))} suffix="VND/kg" />
                </Row>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Bảng bậc giá theo trọng lượng</span>
                <button type="button" onClick={addWeightTier} className="btn btn-sm btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}>
                  <PlusIcon size={12} /> Thêm bậc
                </button>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ padding: "12px 16px 4px", display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Đến (kg)</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Giá / kg (VND)</div>
                  <div />
                </div>
                {cargo.weightTiers.map((tier, i) => (
                  <div key={i} style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: 8, alignItems: "center", borderTop: "1px solid var(--border-subtle)" }}>
                    <input className="form-input" type="number" min={0} value={tier.upToKg}
                      onChange={(e) => updateWeightTier(i, "upToKg", Number(e.target.value))} />
                    <input className="form-input" type="number" min={0} value={tier.pricePerKg}
                      onChange={(e) => updateWeightTier(i, "pricePerKg", Number(e.target.value))} />
                    <button type="button" onClick={() => removeWeightTier(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                  Hàng nặng hơn bậc cuối áp dụng giá cơ bản / kg
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Hoa hồng & Tài xế ───────────────────────────────── */}
      {tab === "commission" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          <div>
            <div className="card">
              <div className="card-header">Hoa hồng nền tảng</div>
              <div className="card-body">
                <Row label="Hoa hồng %" hint="Phần trăm trích từ cước phí mỗi chuyến">
                  <NumInput value={commissionPct} onChange={setCommissionPct} suffix="%" min={0} />
                </Row>
                <div style={{ background: "var(--bg-overlay)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--text-primary)" }}>Ví dụ:</strong> Chuyến 100,000 VND → Nền tảng nhận <strong style={{ color: "var(--brand-secondary)" }}>{commissionPct.toLocaleString()}%</strong> = {(100000 * commissionPct / 100).toLocaleString()} VND · Tài xế nhận {(100000 * (1 - commissionPct / 100)).toLocaleString()} VND
                </div>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-header">Thanh toán & Giữ tiền</div>
              <div className="card-body">
                <Row label="Trần chia phí hành khách" hint="Giới hạn % giá niêm yết mà mỗi hành khách phải trả khi ghép chuyến">
                  <NumInput value={costShareCapPct} onChange={setCostShareCapPct} suffix="% giá niêm yết" />
                </Row>
                <Row label="Thời gian giữ tiền" hint="Số ngày giữ tiền trước khi chuyển vào ví tài xế (chống tranh chấp)">
                  <NumInput value={holdDays} onChange={setHoldDays} suffix="ngày" />
                </Row>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header">Thưởng Streak tài xế</div>
              <div className="card-body">
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 12 }}>
                  Cấu hình thưởng streak được quản lý trong mục <strong style={{ color: "var(--text-primary)" }}>Khuyến mãi → Sự kiện</strong>. Tạo một sự kiện kiểu <code style={{ background: "var(--bg-overlay)", padding: "1px 6px", borderRadius: 4 }}>STREAK_BONUS</code> để thiết lập thưởng theo chuỗi chuyến liên tiếp.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "3 chuyến liên tiếp", bonus: "20,000 VND" },
                    { label: "7 chuyến liên tiếp", bonus: "50,000 VND" },
                    { label: "15 chuyến liên tiếp", bonus: "120,000 VND" },
                    { label: "30 chuyến liên tiếp", bonus: "300,000 VND" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-overlay)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-secondary)" }}>+ {item.bonus}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
                  * Giá trị mẫu. Tùy chỉnh trong mục Sự kiện.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Phụ thu & Phí ───────────────────────────────────── */}
      {tab === "surge" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          <div>
            <div className="card">
              <div className="card-header">Phụ thu giờ đêm</div>
              <div className="card-body">
                <Row label="Hệ số phụ thu" hint="Nhân giá với hệ số này trong khung giờ đêm. VD: 1.2 = +20%">
                  <NumInput value={surge.nightSurchargeMultiplier} onChange={s("nightSurchargeMultiplier")} step={0.05} />
                </Row>
                <Row label="Bắt đầu giờ đêm">
                  <TextInput value={surge.nightStart} onChange={s("nightStart")} placeholder="22:00" />
                </Row>
                <Row label="Kết thúc giờ đêm">
                  <TextInput value={surge.nightEnd} onChange={s("nightEnd")} placeholder="05:00" />
                </Row>
                <div style={{ background: "var(--bg-overlay)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-muted)" }}>
                  Khung giờ đêm: <strong style={{ color: "var(--brand-amber)" }}>{surge.nightStart} – {surge.nightEnd}</strong> · Hệ số: <strong style={{ color: "var(--brand-amber)" }}>{surge.nightSurchargeMultiplier}x</strong> (= +{Math.round((surge.nightSurchargeMultiplier - 1) * 100)}%)
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header">Phụ thu giờ cao điểm</div>
              <div className="card-body">
                <Row label="Hệ số cao điểm" hint="Nhân giá với hệ số này trong giờ cao điểm. VD: 1.3 = +30%">
                  <NumInput value={surge.peakSurchargeMultiplier} onChange={s("peakSurchargeMultiplier")} step={0.05} />
                </Row>
                <Row label="Khung giờ cao điểm" hint="Nhập các khung giờ, phân cách bằng dấu phẩy">
                  <TextInput value={surge.peakHours} onChange={s("peakHours")} placeholder="07:00-09:00,17:00-19:00" />
                </Row>
                <div style={{ background: "var(--bg-overlay)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Cao điểm: <strong style={{ color: "var(--brand-amber)" }}>{surge.peakHours}</strong> · Hệ số: <strong style={{ color: "var(--brand-amber)" }}>{surge.peakSurchargeMultiplier}x</strong>
                </div>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-header">Preview giá mẫu</div>
              <div className="card-body">
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Chuyến 50km — giá cơ bản:</div>
                {[
                  { label: "Thường (ban ngày)", mult: 1 },
                  { label: "Cao điểm", mult: surge.peakSurchargeMultiplier },
                  { label: "Ban đêm", mult: surge.nightSurchargeMultiplier },
                ].map(({ label, mult }) => {
                  const base = kmTiers.find(t => 50 <= t.upToKm)?.pricePerKm ?? 3500;
                  const total = Math.max(baseFare, base * 50 * mult);
                  return (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 13 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: mult > 1 ? "var(--brand-amber)" : "var(--text-primary)" }}>{Math.round(total).toLocaleString()} VND</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom save bar */}
      <div style={{ marginTop: 32, padding: "16px 20px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Thay đổi áp dụng ngay cho tất cả chuyến mới. Chuyến đang xử lý không bị ảnh hưởng.
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 130 }}>
          {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu tất cả cấu hình"}
        </button>
      </div>
    </div>
  );
}

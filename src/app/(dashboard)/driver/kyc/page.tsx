"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { api, uploadKycImage } from "@/lib/api/client";
import {
  UserIcon, CarIcon, DocumentIcon, CheckCircleIcon, AlertTriangleIcon,
  ShieldIcon, PackageIcon, ZapIcon, ImageIcon, TrashIcon, RefreshIcon,
  ClockIcon, XIcon,
} from "@/components/ui/Icons";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type DocType = "CCCD_FRONT" | "CCCD_BACK" | "DRIVER_LICENSE" | "VEHICLE_REGISTRATION" | "SELFIE";
type Status = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

interface KycData {
  verificationStatus: Status;
  rejectReason: string | null;
  vehicleType: string;
  vehiclePlate: string;
  seats: number;
  cccdNumber: string;
  address: string;
  allowCargo: boolean;
  cargoCapacityKg: number | null;
  documents: Array<{ id: string; type: string; path?: string; url: string | null }>;
}

interface DocState { path?: string; url?: string; uploading: boolean; error?: string }

/* ─── Static config ─────────────────────────────────────────────────────────── */
const DOC_SLOTS: Array<{ type: DocType; label: string; hint: string; selfie?: boolean }> = [
  { type: "CCCD_FRONT",           label: "CCCD mặt trước",        hint: "Chụp thẳng, thấy đủ 4 góc, rõ số và ảnh, không loá sáng." },
  { type: "CCCD_BACK",            label: "CCCD mặt sau",          hint: "Rõ đặc điểm nhận dạng và ngày cấp." },
  { type: "DRIVER_LICENSE",       label: "Giấy phép lái xe",      hint: "Bằng còn hạn và đúng hạng với loại xe đăng ký." },
  { type: "VEHICLE_REGISTRATION", label: "Đăng ký xe (cà vẹt)",   hint: "Thông tin xe khớp với biển số đã khai." },
  { type: "SELFIE",               label: "Ảnh chân dung (selfie)", hint: "Khuôn mặt rõ, đủ sáng, không đeo kính/khẩu trang.", selfie: true },
];

const STEPS = [
  { n: 1, label: "Cá nhân",  Icon: UserIcon },
  { n: 2, label: "Xe",       Icon: CarIcon },
  { n: 3, label: "Giấy tờ",  Icon: DocumentIcon },
  { n: 4, label: "Xác nhận", Icon: ShieldIcon },
] as const;

const STATUS_CONFIG: Record<Status, { color: string; bg: string; label: string }> = {
  NONE:     { color: "#94a3b8", bg: "rgba(148,163,184,.12)", label: "Chưa gửi hồ sơ" },
  PENDING:  { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  label: "Đang chờ duyệt" },
  APPROVED: { color: "#34d399", bg: "rgba(52,211,153,.12)",  label: "Đã được duyệt" },
  REJECTED: { color: "#f87171", bg: "rgba(248,113,113,.12)", label: "Bị từ chối" },
};

const DOC_LABEL: Record<string, string> = Object.fromEntries(DOC_SLOTS.map((d) => [d.type, d.label]));

const PLATE_RE = /^[A-Z0-9\-\.]+$/;

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function DriverKycPage() {
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    vehicleType: "CAR",
    vehiclePlate: "",
    seats: 4,
    cccdNumber: "",
    address: "",
    allowCargo: false,
    cargoCapacityKg: "" as string,
  });

  const [docs, setDocs] = useState<Record<DocType, DocState>>(() =>
    Object.fromEntries(DOC_SLOTS.map((d) => [d.type, { uploading: false }])) as Record<DocType, DocState>,
  );

  const load = useCallback(async () => {
    try {
      const r = await api.get<KycData>("/driver/kyc");
      setKyc(r.data);
      setForm({
        vehicleType: r.data.vehicleType || "CAR",
        vehiclePlate: r.data.vehiclePlate || "",
        seats: r.data.seats || 4,
        cccdNumber: r.data.cccdNumber || "",
        address: r.data.address || "",
        allowCargo: r.data.allowCargo ?? false,
        cargoCapacityKg: r.data.cargoCapacityKg != null ? String(r.data.cargoCapacityKg) : "",
      });
      // Prefill already-uploaded documents (latest per type)
      const seeded = Object.fromEntries(DOC_SLOTS.map((d) => [d.type, { uploading: false } as DocState])) as Record<DocType, DocState>;
      for (const d of r.data.documents ?? []) {
        if (d.type in seeded) seeded[d.type as DocType] = { uploading: false, path: d.path, url: d.url ?? undefined };
      }
      setDocs(seeded);
    } catch {
      /* first-time driver — keep NONE defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const status: Status = kyc?.verificationStatus ?? "NONE";
  const canEdit = status === "NONE" || status === "REJECTED";

  /* ── Validation ── */
  const step1Valid = /^\d{12}$/.test(form.cccdNumber) && form.address.trim().length >= 5;
  const step2Valid =
    form.vehiclePlate.length >= 5 && form.vehiclePlate.length <= 20 && PLATE_RE.test(form.vehiclePlate) &&
    form.seats >= 1 && form.seats <= 45 &&
    (!form.allowCargo || (form.cargoCapacityKg !== "" && Number(form.cargoCapacityKg) > 0 && Number(form.cargoCapacityKg) <= 50000));
  const docsDone = DOC_SLOTS.filter((d) => docs[d.type].path).length;
  const step3Valid = docsDone === DOC_SLOTS.length;
  const allValid = step1Valid && step2Valid && step3Valid;

  const goNext = () => {
    setError("");
    if (step === 1 && !step1Valid) return setError("Vui lòng nhập đúng số CCCD (12 chữ số) và địa chỉ.");
    if (step === 2 && !step2Valid) return setError("Vui lòng kiểm tra lại thông tin xe.");
    if (step === 3 && !step3Valid) return setError("Vui lòng tải đủ 5 giấy tờ bắt buộc.");
    setStep((s) => Math.min(4, s + 1));
  };
  const goBack = () => { setError(""); setStep((s) => Math.max(1, s - 1)); };

  /* ── Upload a document image ── */
  const onPickFile = async (type: DocType, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setDocs((d) => ({ ...d, [type]: { ...d[type], error: "Chỉ chấp nhận ảnh" } })); return; }
    if (file.size > 10 * 1024 * 1024) { setDocs((d) => ({ ...d, [type]: { ...d[type], error: "Ảnh tối đa 10MB" } })); return; }
    setDocs((d) => ({ ...d, [type]: { uploading: true } }));
    try {
      const res = await uploadKycImage(file, type);
      setDocs((d) => ({ ...d, [type]: { uploading: false, path: res.path, url: res.url ?? URL.createObjectURL(file) } }));
    } catch (e) {
      setDocs((d) => ({ ...d, [type]: { uploading: false, error: (e as Error).message } }));
    }
  };
  const removeDoc = (type: DocType) => setDocs((d) => ({ ...d, [type]: { uploading: false } }));

  /* ── Submit ── */
  const submit = async () => {
    if (!allValid) { setError("Hồ sơ chưa đầy đủ. Vui lòng kiểm tra các bước."); return; }
    setSaving(true); setError("");
    try {
      await api.post("/driver/kyc", {
        vehicleType: form.vehicleType,
        vehiclePlate: form.vehiclePlate.toUpperCase(),
        seats: Number(form.seats),
        cccdNumber: form.cccdNumber,
        address: form.address.trim(),
        allowCargo: form.allowCargo,
        cargoCapacityKg: form.allowCargo && form.cargoCapacityKg ? Number(form.cargoCapacityKg) : undefined,
        documents: DOC_SLOTS.map((d) => ({ type: d.type, path: docs[d.type].path! })),
      });
      await load();
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
      <span style={spinner(32)} />
      <style>{spinKeyframes}</style>
    </div>
  );

  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
          <ShieldIcon size={22} color="var(--brand-primary)" /> Đăng ký tài xế (KYC)
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
          Cung cấp thông tin và giấy tờ để được xác minh và bắt đầu nhận chuyến.
        </p>
      </div>

      {/* Status banner */}
      <div style={{ padding: "14px 18px", borderRadius: 14, marginBottom: 20, background: cfg.bg, border: `1px solid ${cfg.color}35`, display: "flex", alignItems: "center", gap: 14 }}>
        <StatusGlyph status={status} color={cfg.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: cfg.color, fontSize: 14, marginBottom: 2 }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {status === "NONE" && "Hoàn thành các bước bên dưới và gửi hồ sơ để được duyệt."}
            {status === "PENDING" && "Hồ sơ đang được xét duyệt, thường trong 24–48 giờ. Bạn sẽ nhận được thông báo."}
            {status === "APPROVED" && "Bạn đã được phê duyệt! Hãy đăng tuyến và bắt đầu nhận chuyến."}
            {status === "REJECTED" && (kyc?.rejectReason ? `Lý do từ chối: ${kyc.rejectReason}` : "Hồ sơ bị từ chối. Vui lòng cập nhật và gửi lại.")}
          </div>
        </div>
      </div>

      {/* PENDING / APPROVED → read-only summary */}
      {!canEdit ? (
        <ReadOnlyView kyc={kyc} />
      ) : (
        <>
          {/* Stepper */}
          <div style={{ display: "flex", marginBottom: 22 }}>
            {STEPS.map(({ n, label, Icon }, i) => {
              const done = n < step;
              const active = n === step;
              return (
                <div key={n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {i > 0 && <div style={{ position: "absolute", top: 18, left: "-50%", width: "100%", height: 2, background: done || active ? "var(--brand-primary)" : "var(--border-subtle)" }} />}
                  <button type="button" onClick={() => n < step && setStep(n)}
                    aria-label={`Bước ${n}: ${label}`} aria-current={active ? "step" : undefined}
                    style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, zIndex: 1, position: "relative",
                      background: done || active ? "var(--grad-primary)" : "var(--bg-overlay)",
                      border: `2px solid ${done || active ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: n < step ? "pointer" : "default" }}>
                    {done ? <CheckCircleIcon size={15} color="#fff" /> : <Icon size={15} color={active ? "#fff" : "var(--text-muted)"} />}
                  </button>
                  <div style={{ fontSize: 11, marginTop: 6, fontWeight: active ? 700 : 400, color: active ? "var(--brand-primary)" : "var(--text-muted)" }}>{label}</div>
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 13 }}>
              <AlertTriangleIcon size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </div>
          )}

          {/* Step 1 — Personal */}
          {step === 1 && (
            <StepCard title="Thông tin cá nhân" icon={<UserIcon size={18} color="var(--brand-primary)" />}>
              <Field label="Số CCCD (12 chữ số)" required error="Cần đúng 12 chữ số" valid={form.cccdNumber === "" || /^\d{12}$/.test(form.cccdNumber)}>
                <input className="form-input" inputMode="numeric" placeholder="012345678901" maxLength={12}
                  value={form.cccdNumber} onChange={(e) => setForm({ ...form, cccdNumber: e.target.value.replace(/\D/g, "") })} />
              </Field>
              <Field label="Địa chỉ thường trú" required>
                <input className="form-input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
            </StepCard>
          )}

          {/* Step 2 — Vehicle */}
          {step === 2 && (
            <StepCard title="Thông tin xe" icon={<CarIcon size={18} color="var(--brand-secondary)" />}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Loại xe" required>
                  <select className="form-input" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                    <option value="CAR">Ô tô (4–9 chỗ)</option>
                    <option value="VAN">Xe van</option>
                    <option value="TRUCK">Xe tải</option>
                  </select>
                </Field>
                <Field label="Biển số xe" required error="Biển số không hợp lệ (VD: 51A-12345)" valid={form.vehiclePlate === "" || (form.vehiclePlate.length >= 5 && PLATE_RE.test(form.vehiclePlate))}>
                  <input className="form-input" placeholder="51A-12345" value={form.vehiclePlate}
                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })} />
                </Field>
              </div>
              <Field label="Số ghế hành khách" required>
                <input className="form-input" type="number" min={1} max={45} value={form.seats}
                  onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
              </Field>

              {/* Cargo */}
              <div style={{ marginTop: 6, padding: "14px 16px", borderRadius: 12, background: form.allowCargo ? "rgba(34,211,238,.08)" : "var(--bg-overlay)", border: `1px solid ${form.allowCargo ? "rgba(34,211,238,.3)" : "var(--border-subtle)"}` }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.allowCargo} onChange={(e) => setForm({ ...form, allowCargo: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: "var(--brand-secondary)", cursor: "pointer" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.allowCargo ? "var(--brand-secondary)" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <PackageIcon size={14} /> Chấp nhận ghép hàng hoá
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Tăng thu nhập mỗi chuyến bằng cách nhận thêm hàng gửi.</div>
                  </div>
                </label>
                {form.allowCargo && (
                  <Field label="Tải trọng tối đa (kg)" style={{ marginTop: 12, marginBottom: 0 }}>
                    <input className="form-input" type="number" min={1} placeholder="50" value={form.cargoCapacityKg}
                      onChange={(e) => setForm({ ...form, cargoCapacityKg: e.target.value })} />
                  </Field>
                )}
              </div>
            </StepCard>
          )}

          {/* Step 3 — Documents */}
          {step === 3 && (
            <StepCard title="Giấy tờ (ảnh chụp rõ nét)" icon={<DocumentIcon size={18} color="var(--brand-pink)" />}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                <span>Cần đủ 5 giấy tờ. Có thể chụp trực tiếp hoặc chọn ảnh có sẵn.</span>
                <span style={{ fontWeight: 700, color: step3Valid ? "var(--brand-emerald)" : "var(--text-secondary)" }}>{docsDone}/5</span>
              </div>
              {DOC_SLOTS.map((slot) => (
                <DocUploader key={slot.type} slot={slot} state={docs[slot.type]}
                  onPick={(f) => onPickFile(slot.type, f)} onRemove={() => removeDoc(slot.type)} />
              ))}
            </StepCard>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <StepCard title="Xác nhận & gửi" icon={<ShieldIcon size={18} color="var(--brand-emerald)" />}>
              <Summary title="Cá nhân" rows={[["Số CCCD", form.cccdNumber], ["Địa chỉ", form.address]]} onEdit={() => setStep(1)} />
              <Summary title="Xe" rows={[
                ["Loại xe", { CAR: "Ô tô", VAN: "Xe van", TRUCK: "Xe tải" }[form.vehicleType] ?? form.vehicleType],
                ["Biển số", form.vehiclePlate],
                ["Số ghế", String(form.seats)],
                ["Ghép hàng", form.allowCargo ? `Có${form.cargoCapacityKg ? ` · ${form.cargoCapacityKg}kg` : ""}` : "Không"],
              ]} onEdit={() => setStep(2)} />
              <div style={{ marginTop: 4 }}>
                <SummaryHead title="Giấy tờ" onEdit={() => setStep(3)} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                  {DOC_SLOTS.map((d) => (
                    <div key={d.type} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-subtle)", background: "var(--bg-overlay)" }}>
                      {docs[d.type].url
                        ? <img src={docs[d.type].url} alt={d.label} style={{ width: "100%", height: 64, objectFit: "cover", display: "block" }} />
                        : <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}><XIcon size={16} color="var(--danger)" /></div>}
                      <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "4px 6px", textAlign: "center" }}>{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </StepCard>
          )}

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={goBack} style={{ flex: "0 0 auto", padding: "12px 18px" }}>← Quay lại</button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={goNext} style={{ flex: 1, padding: 12, fontSize: 14 }}>Tiếp tục →</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !allValid}
                style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "var(--glow-primary)" }}>
                {saving ? <><span style={spinner(16, true)} /> Đang gửi...</> : <><ZapIcon size={16} /> {status === "REJECTED" ? "Gửi lại hồ sơ" : "Gửi hồ sơ KYC"}</>}
              </button>
            )}
          </div>
        </>
      )}

      <style>{spinKeyframes}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function StatusGlyph({ status, color }: { status: Status; color: string }) {
  const Icon = status === "APPROVED" ? CheckCircleIcon : status === "PENDING" ? ClockIcon : status === "REJECTED" ? XIcon : DocumentIcon;
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `${color}20`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={18} color={color} />
    </div>
  );
}

function DocUploader({ slot, state, onPick, onRemove }: {
  slot: { type: DocType; label: string; hint: string; selfie?: boolean };
  state: DocState; onPick: (f: File | null) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const done = !!state.path;
  return (
    <div style={{ marginBottom: 10, padding: 12, borderRadius: 12, background: "var(--bg-overlay)", border: `1px solid ${done ? "rgba(52,211,153,.4)" : state.error ? "var(--danger-border)" : "var(--border-subtle)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Thumb */}
        <button type="button" onClick={() => inputRef.current?.click()} aria-label={done ? `Đổi ảnh ${slot.label}` : `Tải ảnh ${slot.label}`}
          style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: "hidden", cursor: "pointer", padding: 0, border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {state.uploading ? <span style={spinner(18)} />
            : done && state.url ? <img src={state.url} alt={slot.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : done ? <CheckCircleIcon size={20} color="var(--brand-emerald)" />
            : <ImageIcon size={20} color="var(--text-muted)" />}
        </button>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            {slot.label}
            {done && <CheckCircleIcon size={13} color="var(--brand-emerald)" />}
          </div>
          <div role="status" aria-live="polite" style={{ fontSize: 11, color: state.error ? "var(--danger)" : "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
            {state.uploading ? "Đang tải lên..." : state.error ?? (done ? "Đã tải — nhấn để đổi" : slot.hint)}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={state.uploading}
            title={done ? "Đổi ảnh" : "Tải ảnh"} aria-label={`${done ? "Đổi" : "Tải"} ảnh ${slot.label}`}
            style={iconBtn}>
            {done ? <RefreshIcon size={14} color="var(--text-secondary)" /> : <ImageIcon size={14} color="var(--brand-primary)" />}
          </button>
          {done && (
            <button type="button" onClick={onRemove} title="Xoá" aria-label={`Xoá ảnh ${slot.label}`} style={iconBtn}>
              <TrashIcon size={14} color="var(--danger)" />
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture={slot.selfie ? "user" : "environment"}
        style={{ display: "none" }} onChange={(e) => { onPick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </div>
  );
}

function ReadOnlyView({ kyc }: { kyc: KycData | null }) {
  if (!kyc) return null;
  return (
    <StepCard title="Hồ sơ đã gửi" icon={<ShieldIcon size={18} color="var(--brand-primary)" />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <InfoRow label="Số CCCD" value={kyc.cccdNumber} />
        <InfoRow label="Biển số" value={kyc.vehiclePlate} />
        <InfoRow label="Loại xe" value={{ CAR: "Ô tô", VAN: "Xe van", TRUCK: "Xe tải" }[kyc.vehicleType] ?? kyc.vehicleType} />
        <InfoRow label="Số ghế" value={String(kyc.seats)} />
        <InfoRow label="Địa chỉ" value={kyc.address} full />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
        {kyc.documents.map((d) => (
          <a key={d.id} href={d.url ?? undefined} target="_blank" rel="noreferrer" style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-subtle)", textDecoration: "none", background: "var(--bg-overlay)" }}>
            {d.url
              ? <img src={d.url} alt={DOC_LABEL[d.type] ?? d.type} style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }} />
              : <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={18} color="var(--text-muted)" /></div>}
            <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "4px 6px", textAlign: "center" }}>{DOC_LABEL[d.type] ?? d.type}</div>
          </a>
        ))}
      </div>
    </StepCard>
  );
}

function StepCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {icon}<span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, valid = true, error, style, children }: { label: string; required?: boolean; valid?: boolean; error?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: valid ? "var(--text-muted)" : "var(--danger)", textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      {children}
      {!valid && error && <div role="status" aria-live="polite" style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginTop: 2 }}>{value || "—"}</div>
    </div>
  );
}

function SummaryHead({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: .5 }}>{title}</span>
      <button type="button" onClick={onEdit} style={{ fontSize: 11, color: "var(--brand-primary)", background: "none", border: "none", cursor: "pointer" }}>Sửa</button>
    </div>
  );
}

function Summary({ title, rows, onEdit }: { title: string; rows: Array<[string, string]>; onEdit: () => void }) {
  return (
    <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
      <SummaryHead title={title} onEdit={onEdit} />
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
          <span style={{ color: "var(--text-muted)" }}>{k}</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500, textAlign: "right", maxWidth: "65%" }}>{v || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Style helpers ─────────────────────────────────────────────────────────── */
const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const spinKeyframes = `@keyframes spin{to{transform:rotate(360deg)}}`;
function spinner(size: number, onPrimary = false): React.CSSProperties {
  return {
    width: size, height: size, borderRadius: "50%", display: "inline-block",
    border: `${Math.max(2, size / 12)}px solid ${onPrimary ? "rgba(255,255,255,.3)" : "rgba(99,102,241,.2)"}`,
    borderTopColor: onPrimary ? "#fff" : "var(--brand-primary)", animation: "spin .7s linear infinite",
  };
}

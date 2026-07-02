"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import PlaceAutocomplete, { type PlaceResult } from "@/components/PlaceAutocomplete";
import {
  RouteIcon, MapPinIcon, ClockIcon, SeatIcon, RulerIcon,
  PackageIcon, CheckCircleIcon, AlertTriangleIcon, RefreshIcon,
  PlusIcon, XIcon,
} from "@/components/ui/Icons";
import dynamic from "next/dynamic";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

interface Route {
  id: string;
  originAddress: string;
  destAddress: string;
  departureTime: string;
  availableSeats: number;
  maxDetourKm: number;
  allowCargo: boolean;
  cargoCapacityKg: number | null;
  status: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:    { label: "Hoạt động", color:"var(--brand-emerald)", bg:"rgba(52,211,153,.12)", border:"rgba(52,211,153,.3)" },
  PAUSED:    { label: "Tạm dừng",  color:"var(--brand-amber)", bg:"rgba(251,191,36,.12)", border:"rgba(251,191,36,.3)" },
  COMPLETED: { label: "Hoàn thành",color:"var(--text-secondary)", bg:"rgba(148,163,184,.12)",border:"rgba(148,163,184,.3)" },
};

interface FormState {
  originAddress: string; originLat: number | null; originLng: number | null;
  destAddress:   string; destLat:   number | null; destLng:   number | null;
  departureTime: string;
  availableSeats: number;
  maxDetourKm: number;
  allowCargo: boolean;
  cargoCapacityKg: string;
}

const EMPTY_FORM: FormState = {
  originAddress:"", originLat:null, originLng:null,
  destAddress:"",   destLat:null,   destLng:null,
  departureTime:"", availableSeats:3, maxDetourKm:50,
  allowCargo:false, cargoCapacityKg:"",
};

export default function DriverRoutesPage() {
  const [items,    setItems]    = useState<Route[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [toggleId, setToggleId] = useState<string | null>(null);

  const [noProfile, setNoProfile] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ items: Route[] }>("/driver/routes")
      .then((r) => { setItems(r.data.items); setNoProfile(false); })
      .catch((e: { status?: number }) => {
        if (e?.status === 404 || e?.status === 403) setNoProfile(true);
        else setError("Không tải được danh sách lộ trình");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.originLat || !form.destLat) {
      setError("Chọn địa điểm từ danh sách gợi ý để lấy tọa độ");
      return;
    }
    setError(""); setSaving(true);
    try {
      await api.post("/driver/routes", {
        origin: { lat: form.originLat, lng: form.originLng, address: form.originAddress },
        dest:   { lat: form.destLat,   lng: form.destLng,   address: form.destAddress },
        departureTime: new Date(form.departureTime).toISOString(),
        availableSeats: Number(form.availableSeats),
        maxDetourKm: Number(form.maxDetourKm),
        allowCargo: form.allowCargo,
        cargoCapacityKg: form.cargoCapacityKg ? Number(form.cargoCapacityKg) : undefined,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setSuccess("Đã tạo lộ trình thành công!");
      setTimeout(() => setSuccess(""), 3000);
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggle = async (r: Route) => {
    setToggleId(r.id); setError("");
    try {
      await api.patch(`/driver/routes/${r.id}`, {
        status: r.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
      });
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setToggleId(null); }
  };

  return (
    <div style={{ maxWidth:760 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <RouteIcon size={22} color="var(--brand-secondary)"/> Lộ trình của tôi
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:13 }}>{items.length} lộ trình đã tạo</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={load} disabled={loading} style={{
            width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
            background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)", cursor:"pointer", color:"var(--text-muted)",
          }}>
            <RefreshIcon size={15} style={{ animation: loading ? "spin .8s linear infinite" : "none" }}/>
          </button>
          <button onClick={() => { setShowForm(!showForm); setError(""); setForm(EMPTY_FORM); }}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 18px",
              background: showForm ? "var(--bg-overlay)" : "var(--grad-primary)",
              border: showForm ? "1px solid var(--border-subtle)" : "none",
              borderRadius:10, color: showForm ? "var(--text-muted)" : "#fff",
              fontWeight:600, fontSize:13, cursor:"pointer", boxShadow: showForm ? "none" : "var(--glow-sm)",
            }}>
            {showForm ? <><XIcon size={14}/> Đóng</> : <><PlusIcon size={14}/> Tạo lộ trình</>}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"var(--danger-bg)", border:"1px solid var(--danger-border)", color:"var(--danger)", fontSize:13 }}>
          <AlertTriangleIcon size={13}/> {error}
        </div>
      )}
      {success && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:16,
          background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)", color:"var(--brand-emerald)", fontSize:13 }}>
          <CheckCircleIcon size={13}/> {success}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{
          background:"var(--bg-surface)", border:"1px solid var(--border-medium)",
          borderRadius:18, overflow:"hidden", marginBottom:24,
          boxShadow:"var(--shadow-md)",
        }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:10 }}>
            <GeoIcon type="route" size={36}/>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:"var(--text-primary)" }}>Tạo lộ trình mới</div>
              <div style={{ fontSize:12, color:"var(--text-muted)" }}>Nhập điểm đi, điểm đến và thông tin chuyến</div>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding:20 }}>
            {/* Addresses */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }} className="route-form-grid">
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:8 }}>
                  Điểm xuất phát
                </label>
                <PlaceAutocomplete
                  placeholder="Tìm điểm xuất phát..."
                  value={form.originAddress}
                  onChange={(v) => setForm((f) => ({ ...f, originAddress: v, originLat: null, originLng: null }))}
                  onSelect={(r: PlaceResult) => setForm((f) => ({ ...f, originAddress: r.address, originLat: r.lat, originLng: r.lng }))}
                  icon={<MapPinIcon size={15} color="var(--brand-secondary)"/>}
                />
                {form.originLat && (
                  <div style={{ fontSize:10, color:"var(--brand-secondary)", marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                    <CheckCircleIcon size={10} color="var(--brand-secondary)"/>
                    {form.originLat.toFixed(5)}, {form.originLng?.toFixed(5)}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:8 }}>
                  Điểm đến
                </label>
                <PlaceAutocomplete
                  placeholder="Tìm điểm đến..."
                  value={form.destAddress}
                  onChange={(v) => setForm((f) => ({ ...f, destAddress: v, destLat: null, destLng: null }))}
                  onSelect={(r: PlaceResult) => setForm((f) => ({ ...f, destAddress: r.address, destLat: r.lat, destLng: r.lng }))}
                  icon={<MapPinIcon size={15} color="var(--brand-pink)"/>}
                />
                {form.destLat && (
                  <div style={{ fontSize:10, color:"var(--brand-pink)", marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                    <CheckCircleIcon size={10} color="var(--brand-pink)"/>
                    {form.destLat.toFixed(5)}, {form.destLng?.toFixed(5)}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule + settings */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }} className="route-settings-grid">
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:8 }}>
                  Giờ khởi hành
                </label>
                <input type="datetime-local" value={form.departureTime} required
                  onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
                  style={{ width:"100%", padding:"11px 12px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                    borderRadius:10, color:"var(--text-primary)", fontSize:13, outline:"none", colorScheme:"dark" }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:8 }}>
                  Số ghế trống
                </label>
                <div style={{ position:"relative" }}>
                  <SeatIcon size={14} color="var(--brand-primary)" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input type="number" min={1} max={45} value={form.availableSeats}
                    onChange={(e) => setForm((f) => ({ ...f, availableSeats: Number(e.target.value) }))}
                    style={{ width:"100%", padding:"11px 12px 11px 36px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                      borderRadius:10, color:"var(--text-primary)", fontSize:13, outline:"none" }}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:8 }}>
                  Detour tối đa (km)
                </label>
                <div style={{ position:"relative" }}>
                  <RulerIcon size={14} color="var(--brand-violet)" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                  <input type="number" min={0} max={200} value={form.maxDetourKm}
                    onChange={(e) => setForm((f) => ({ ...f, maxDetourKm: Number(e.target.value) }))}
                    style={{ width:"100%", padding:"11px 12px 11px 36px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                      borderRadius:10, color:"var(--text-primary)", fontSize:13, outline:"none" }}/>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4, paddingLeft:2 }}>
                    Tuyến liên tỉnh nên để 50–100km để ghép được nhiều khách hơn
                  </div>
                </div>
              </div>
            </div>

            {/* Cargo toggle */}
            <div style={{
              background:"var(--bg-overlay)", borderRadius:12, padding:"14px 16px",
              marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <PackageIcon size={18} color={form.allowCargo ? "var(--brand-amber)" : "var(--text-muted)"}/>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:"var(--text-primary)" }}>Nhận hàng hoá</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>Tăng thu nhập bằng cách nhận thêm hàng gửi</div>
                </div>
              </div>
              <button type="button" onClick={() => setForm((f) => ({ ...f, allowCargo: !f.allowCargo }))}
                style={{
                  width:46, height:26, borderRadius:999, border:"none", cursor:"pointer", position:"relative",
                  background: form.allowCargo ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "var(--bg-elevated)",
                  transition:"background .25s", flexShrink:0,
                }}>
                <span style={{
                  position:"absolute", top:3, width:20, height:20, borderRadius:"50%",
                  background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,.3)",
                  left: form.allowCargo ? 23 : 3,
                  transition:"left .25s",
                }}/>
              </button>
            </div>

            {form.allowCargo && (
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:8 }}>
                  Tải trọng tối đa (kg)
                </label>
                <input type="number" value={form.cargoCapacityKg}
                  onChange={(e) => setForm((f) => ({ ...f, cargoCapacityKg: e.target.value }))}
                  placeholder="200"
                  style={{ width:"100%", maxWidth:200, padding:"11px 12px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                    borderRadius:10, color:"var(--text-primary)", fontSize:13, outline:"none" }}/>
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button type="submit" disabled={saving}
                style={{ padding:"11px 24px", background:"var(--grad-primary)", border:"none",
                  borderRadius:10, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer",
                  boxShadow:"var(--glow-sm)", display:"flex", alignItems:"center", gap:8,
                  opacity: saving ? .7 : 1 }}>
                {saving ? (
                  <><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff",
                    borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/> Đang tạo...</>
                ) : (
                  <><CheckCircleIcon size={14}/> Tạo lộ trình</>
                )}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }}
                style={{ padding:"11px 20px", background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                  borderRadius:10, color:"var(--text-muted)", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* No driver profile guard */}
      {noProfile && (
        <div style={{
          textAlign:"center", padding:"48px 20px",
          background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.25)", borderRadius:18,
        }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🪪</div>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--brand-amber)", marginBottom:6 }}>Chưa có hồ sơ tài xế</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20, lineHeight:1.6 }}>
            Bạn cần hoàn thành đăng ký tài xế và được admin duyệt trước khi tạo lộ trình.
          </div>
          <a href="/driver/kyc" style={{
            display:"inline-block", padding:"10px 24px", background:"var(--grad-primary)",
            borderRadius:10, color:"#fff", fontWeight:600, fontSize:13, textDecoration:"none",
            boxShadow:"var(--glow-sm)",
          }}>Hoàn thành KYC →</a>
        </div>
      )}

      {/* Route list */}
      {!noProfile && loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:48 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(34,211,238,.2)", borderTopColor:"var(--brand-secondary)", animation:"spin .8s linear infinite" }}/>
        </div>
      ) : !noProfile && items.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 20px", background:"var(--bg-surface)", border:"1px dashed var(--border-subtle)", borderRadius:18 }}>
          <div style={{ marginBottom:16, display:"flex", justifyContent:"center" }}>
            <GeoIcon type="route" size={72}/>
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 }}>Chưa có lộ trình nào</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>Tạo lộ trình để bắt đầu ghép xe với hành khách.</div>
          <button onClick={() => setShowForm(true)}
            style={{ padding:"9px 22px", background:"var(--grad-primary)", border:"none",
              borderRadius:10, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", boxShadow:"var(--glow-sm)" }}>
            Tạo lộ trình đầu tiên
          </button>
        </div>
      ) : !noProfile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {items.map((r) => {
            const sc = STATUS_CFG[r.status] ?? STATUS_CFG.COMPLETED;
            return (
              <div key={r.id} style={{
                background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
                borderRadius:16, overflow:"hidden",
                transition:"border-color .2s, box-shadow .2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--border-medium)"; e.currentTarget.style.boxShadow="var(--shadow-sm)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.boxShadow="none"; }}
              >
                {/* Status bar */}
                <div style={{
                  padding:"9px 18px", borderBottom:"1px solid var(--border-subtle)",
                  background:"var(--bg-elevated)", display:"flex", alignItems:"center", justifyContent:"space-between",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <SeatIcon size={13} color="var(--brand-primary)"/>
                    <span style={{ fontSize:12, fontWeight:600, color:"var(--text-secondary)" }}>{r.availableSeats} ghế</span>
                    <span style={{ width:4, height:4, borderRadius:"50%", background:"var(--border-medium)" }}/>
                    <RulerIcon size={12} color="var(--brand-violet)"/>
                    <span style={{ fontSize:12, color:"var(--text-muted)" }}>detour ≤{r.maxDetourKm} km</span>
                    {r.allowCargo && (
                      <>
                        <span style={{ width:4, height:4, borderRadius:"50%", background:"var(--border-medium)" }}/>
                        <PackageIcon size={12} color="var(--brand-amber)"/>
                        <span style={{ fontSize:12, color:"var(--text-muted)" }}>
                          {r.cargoCapacityKg ? `≤${r.cargoCapacityKg}kg` : "hàng"}
                        </span>
                      </>
                    )}
                  </div>
                  <span style={{
                    padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                    background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`,
                  }}>{sc.label}</span>
                </div>

                <div style={{ padding:18 }}>
                  {/* Route */}
                  <div style={{ background:"var(--bg-overlay)", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
                    <div style={{ display:"flex", gap:10, marginBottom:8 }}>
                      <MapPinIcon size={14} color="var(--brand-secondary)" style={{ flexShrink:0, marginTop:2 }}/>
                      <div>
                        <div style={{ fontSize:10, color:"var(--brand-secondary)", fontWeight:700, textTransform:"uppercase", letterSpacing:.4, marginBottom:1 }}>Xuất phát</div>
                        <div style={{ fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{r.originAddress}</div>
                      </div>
                    </div>
                    <div style={{ width:2, height:10, background:"var(--border-medium)", margin:"0 7px" }}/>
                    <div style={{ display:"flex", gap:10 }}>
                      <MapPinIcon size={14} color="var(--brand-pink)" style={{ flexShrink:0, marginTop:2 }}/>
                      <div>
                        <div style={{ fontSize:10, color:"var(--brand-pink)", fontWeight:700, textTransform:"uppercase", letterSpacing:.4, marginBottom:1 }}>Điểm đến</div>
                        <div style={{ fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{r.destAddress}</div>
                      </div>
                    </div>
                  </div>

                  {/* Time + action */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <ClockIcon size={13} color="var(--brand-primary)"/>
                      <span style={{ fontSize:12, color:"var(--text-secondary)" }}>
                        {new Date(r.departureTime).toLocaleString("vi-VN", {
                          weekday:"short", hour:"2-digit", minute:"2-digit",
                          day:"2-digit", month:"2-digit",
                        })}
                      </span>
                    </div>
                    {r.status !== "COMPLETED" && (
                      <button
                        onClick={() => toggle(r)}
                        disabled={toggleId === r.id}
                        style={{
                          padding:"6px 16px",
                          background: r.status === "ACTIVE"
                            ? "rgba(251,191,36,.12)" : "rgba(52,211,153,.12)",
                          border: `1px solid ${r.status === "ACTIVE" ? "rgba(251,191,36,.3)" : "rgba(52,211,153,.3)"}`,
                          borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12,
                          color: r.status === "ACTIVE" ? "var(--brand-amber)" : "var(--brand-emerald)",
                          opacity: toggleId === r.id ? .6 : 1,
                        }}>
                        {toggleId === r.id ? "..." : r.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:600px){
          .route-form-grid,.route-settings-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}

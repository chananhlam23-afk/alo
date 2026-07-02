"use client";
import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import PlaceAutocomplete, { type PlaceResult } from "@/components/PlaceAutocomplete";
import { api } from "@/lib/api/client";
import {
  PackageIcon, MapPinIcon, CrosshairIcon, ArrowUpDownIcon,
  TruckIcon, RulerIcon, CoinIcon, CheckCircleIcon,
  AlertTriangleIcon, SendIcon, HistoryIcon,
} from "@/components/ui/Icons";
import { useRouter } from "next/navigation";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

interface CargoQuote { quotedPrice: number; }

export default function CustomerCargoPage() {
  const router = useRouter();

  /* ── Form state ────────────────────────────────────────────── */
  const [pickup,  setPickup]  = useState<PlaceResult | null>(null);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);
  const [pickupInput,  setPickupInput]  = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [weightKg,     setWeightKg]     = useState("5");
  const [description,  setDescription] = useState("");

  const [receiverName,  setReceiverName]  = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [quote,    setQuote]    = useState<CargoQuote | null>(null);
  const [quoting,  setQuoting]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  /* ── Auto quote ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!pickup || !dropoff) { setQuote(null); return; }
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const distKm = haversine(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
        const quotedPrice = Math.round(10000 + Number(weightKg || 1) * 500 + distKm * 800);
        setQuote({ quotedPrice });
      } catch { setQuote(null); }
      finally { setQuoting(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [pickup, dropoff, weightKg]);

  const onPickupSelect  = (r: PlaceResult) => { setPickup(r);  setPickupInput(r.address);  };
  const onDropoffSelect = (r: PlaceResult) => { setDropoff(r); setDropoffInput(r.address); };

  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Trình duyệt không hỗ trợ định vị GPS."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          headers: { "Accept-Language": "vi" },
        })
          .then((r) => r.json())
          .then((data) => {
            const address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPickup({ address, lat, lng }); setPickupInput(address);
          })
          .catch(() => {
            const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPickup({ address, lat, lng }); setPickupInput(address);
          })
          .finally(() => setLocating(false));
      },
      () => { setLocating(false); setError("Không lấy được vị trí. Hãy cho phép truy cập vị trí trên trình duyệt."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const distKm = haversine(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      await api.post("/customer/cargo", {
        pickupAddress: pickup.address,  pickupLat: pickup.lat,  pickupLng: pickup.lng,
        dropoffAddress: dropoff.address, dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
        weightKg: Number(weightKg), description, distanceKm: distKm,
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
      });
      setSuccess("Đã gửi yêu cầu vận chuyển hàng! Chúng tôi sẽ ghép hàng vào chuyến xe gần nhất.");
      setPickup(null); setDropoff(null); setPickupInput(""); setDropoffInput("");
      setWeightKg("5"); setDescription(""); setQuote(null);
      setReceiverName(""); setReceiverPhone("");
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const swap = () => {
    const p = pickup; const pi = pickupInput;
    setPickup(dropoff); setPickupInput(dropoffInput);
    setDropoff(p); setDropoffInput(pi);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      {/* ── Page header ────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: "var(--text-primary)",
          display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
        }}>
          <PackageIcon size={22} color="var(--brand-secondary)"/>
          Gửi hàng liên tỉnh
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          Hàng của bạn sẽ được ghép vào chuyến xe đang chạy tuyến — chi phí thấp, giao nhanh.
        </p>
      </div>

      {/* ── Feature highlights ─────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24,
      }} className="cargo-features">
        {[
          { type: "cargo" as const, title: "Ghép thông minh", desc: "Ghép hàng vào chuyến xe có sẵn" },
          { type: "realtime" as const, title: "Theo dõi live", desc: "Biết chính xác hàng đang ở đâu" },
          { type: "payment" as const, title: "Giá tối ưu", desc: "Tiết kiệm 40–60% so với chuyển phát" },
        ].map((f) => (
          <div key={f.title} className="cargo-feat-card" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, textAlign: "center",
          }}>
            <span className="cargo-feat-ico"><GeoIcon type={f.type} size={44}/></span>
            <div className="cargo-feat-title" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{f.title}</div>
            <div className="cargo-feat-desc" style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Header row ─────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 20 }}>
        <span style={{ fontSize:15, fontWeight:700, color:"var(--text-primary)" }}>Gửi hàng mới</span>
        <button onClick={() => router.push("/customer/trips")} style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"7px 14px", borderRadius:9, border:"1px solid var(--border-subtle)",
          background:"var(--bg-overlay)", color:"var(--text-secondary)",
          fontSize:12, fontWeight:600, cursor:"pointer",
          transition:"all .2s",
        }}>
          <HistoryIcon size={13}/> Xem lịch sử
        </button>
      </div>

      {/* ── Send form ──────────────────────────────────────────── */}
      <>
          {success && (
            <div style={{
              display: "flex", gap: 10, padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)",
              color: "var(--brand-emerald)", fontSize: 13,
            }}>
              <CheckCircleIcon size={16} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div style={{
              display: "flex", gap: 10, padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
              color: "var(--danger)", fontSize: 13,
            }}>
              <AlertTriangleIcon size={16} style={{ flexShrink: 0, marginTop: 1 }}/> {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Route card */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 16, padding: 20, marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
                Tuyến vận chuyển
              </div>

              {/* Pickup */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--brand-secondary)", textTransform: "uppercase", letterSpacing: .4 }}>
                    Lấy hàng tại
                  </div>
                  <button type="button" onClick={useMyLocation} disabled={locating} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "var(--bg-active)", border: "1px solid var(--border-medium)",
                    borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                    color: "var(--brand-secondary)", cursor: locating ? "default" : "pointer",
                  }}>
                    <CrosshairIcon size={11}/> {locating ? "Đang định vị..." : "Vị trí của tôi"}
                  </button>
                </div>
                <PlaceAutocomplete
                  placeholder="Địa chỉ lấy hàng..."
                  value={pickupInput} onChange={setPickupInput}
                  onSelect={onPickupSelect}
                  icon={<CrosshairIcon size={15} color="var(--brand-secondary)"/>}
                />
              </div>

              {/* Swap button */}
              <div style={{ display: "flex", alignItems: "center", padding: "4px 0 8px 10px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 4, background: "var(--border-medium)", borderRadius: 2 }}/>)}
                </div>
                <button type="button" onClick={swap} style={{
                  marginLeft: 8, width: 28, height: 28, borderRadius: 8,
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-muted)",
                }}>
                  <ArrowUpDownIcon size={13}/>
                </button>
              </div>

              {/* Dropoff */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--brand-pink)", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>
                  Giao hàng đến
                </div>
                <PlaceAutocomplete
                  placeholder="Địa chỉ giao hàng..."
                  value={dropoffInput} onChange={setDropoffInput}
                  onSelect={onDropoffSelect}
                  icon={<MapPinIcon size={15} color="var(--brand-pink)"/>}
                />
              </div>

              {/* Bản đồ tuyến lấy/giao hàng */}
              {(pickup || dropoff) && (
                <div style={{ marginTop: 14, height: 220, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                  <RouteMap
                    pickup={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
                    dropoff={dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null}
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              )}
            </div>

            {/* Package info */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 16, padding: 20, marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
                Thông tin hàng
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>
                    Khối lượng (kg)
                  </label>
                  <div style={{ position: "relative" }}>
                    <TruckIcon size={14} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}/>
                    <input
                      type="number" min={0.1} max={200} step={0.1}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 12px 10px 34px",
                        background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                        borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>
                    Loại hàng (tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Quần áo, thực phẩm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={100}
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                      borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Weight presets */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Chọn nhanh:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[0.5, 1, 2, 5, 10, 20].map((w) => (
                    <button key={w} type="button" onClick={() => setWeightKg(String(w))} style={{
                      padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                      background: weightKg === String(w) ? "var(--bg-active)" : "var(--bg-overlay)",
                      border: `1px solid ${weightKg === String(w) ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                      color: weightKg === String(w) ? "var(--brand-primary)" : "var(--text-muted)",
                    }}>
                      {w} kg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Receiver info */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: 16, padding: 20, marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
                Thông tin người nhận
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>
                    Tên người nhận <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    maxLength={100}
                    required
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                      borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>
                    Số điện thoại <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="0xxxxxxxxx"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value.replace(/\D/g, ""))}
                    maxLength={12}
                    required
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                      borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quote */}
            {(quoting || quote) && pickup && dropoff && (
              <div style={{
                borderRadius: 14, marginBottom: 16, overflow: "hidden",
                background: "linear-gradient(135deg,rgba(34,211,238,.1),rgba(99,102,241,.06))",
                border: "1px solid rgba(34,211,238,.25)",
              }}>
                {quoting ? (
                  <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(34,211,238,.3)", borderTopColor: "var(--brand-secondary)", animation: "spin .6s linear infinite", display: "inline-block" }}/>
                    Đang tính giá...
                  </div>
                ) : quote && (
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>
                      Giá vận chuyển ước tính
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: "var(--brand-secondary)", letterSpacing: -1 }}>
                        {quote.quotedPrice.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <MiniStat icon={<RulerIcon size={14} color="var(--brand-primary)"/>} label="Khoảng cách" value={`${haversine(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng).toFixed(0)} km`}/>
                      <MiniStat icon={<TruckIcon size={14} color="var(--brand-secondary)"/>} label="Khối lượng" value={`${weightKg} kg`}/>
                      <MiniStat icon={<CoinIcon size={14} color="var(--brand-emerald)"/>} label="Mỗi kg" value={`${Math.round(quote.quotedPrice / Number(weightKg)).toLocaleString()}đ`}/>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!pickup || !dropoff || loading || !receiverName.trim() || receiverPhone.length < 9}
              style={{
                width: "100%", padding: 14,
                background: pickup && dropoff && receiverName.trim() && receiverPhone.length >= 9 ? "var(--grad-primary)" : "var(--bg-overlay)",
                border: "none", borderRadius: 12, cursor: pickup && dropoff && receiverName.trim() && receiverPhone.length >= 9 ? "pointer" : "not-allowed",
                color: pickup && dropoff && receiverName.trim() && receiverPhone.length >= 9 ? "#fff" : "var(--text-muted)",
                fontWeight: 700, fontSize: 15,
                boxShadow: pickup && dropoff ? "var(--glow-primary)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all .2s",
              }}
            >
              {loading ? (
                <><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite", display: "inline-block" }}/> Đang gửi...</>
              ) : (
                <><SendIcon size={16}/> Gửi yêu cầu vận chuyển</>
              )}
            </button>
          </form>
      </>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          /* Điện thoại nhỏ: 3 thẻ thu gọn theo hàng ngang thay vì xếp dọc to */
          .cargo-features { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; margin-bottom: 18px !important; }
          .cargo-feat-card { padding: 10px 6px !important; gap: 4px !important; border-radius: 12px !important; }
          .cargo-feat-ico svg { width: 30px !important; height: 30px !important; }
          .cargo-feat-title { font-size: 11px !important; line-height: 1.25 !important; }
          .cargo-feat-desc { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>{icon}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

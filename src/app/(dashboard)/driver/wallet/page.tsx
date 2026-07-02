"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import {
  WalletIcon, TrendingUpIcon, ClockIcon, CheckCircleIcon,
  AlertTriangleIcon, CoinIcon, ActivityIcon, FireIcon,
} from "@/components/ui/Icons";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Tx {
  id: string; amount: number; type: string;
  description: string; createdAt: string;
}
interface PendingRelease { amount: number; availableAt: string | null; }
interface WalletData {
  withdrawableBalance: number;
  pendingBalance: number;
  transactions: Tx[];
  pendingReleases: PendingRelease[];
}

const TX_COLOR: Record<string, string> = {
  TRIP_CREDIT:  "#34d399",
  WITHDRAWAL:   "#f87171",
  ADJUSTMENT:   "#fbbf24",
  RELEASE:      "#22d3ee",
  REFUND:       "#a78bfa",
};

const TX_LABEL: Record<string, string> = {
  TRIP_CREDIT:  "Doanh thu chuyến",
  WITHDRAWAL:   "Rút tiền",
  ADJUSTMENT:   "Điều chỉnh",
  RELEASE:      "Giải phóng ký quỹ",
  REFUND:       "Hoàn tiền",
};

const TT_STYLE = {
  background: "rgba(15,23,42,.95)",
  border: "1px solid rgba(99,102,241,.3)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 12,
};

export default function DriverWalletPage() {
  const [data,     setData]     = useState<WalletData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ amount: "", bankName: "", bankAccountNo: "", bankAccountName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg,  setMsg]  = useState<{ ok: boolean; text: string } | null>(null);

  const fetchWallet = () =>
    api.get<WalletData>("/driver/wallet")
      .then((r) => setData(r.data))
      .catch(() => setData({ withdrawableBalance: 0, pendingBalance: 0, transactions: [], pendingReleases: [] }));

  useEffect(() => {
    fetchWallet().finally(() => setLoading(false));
  }, []);

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      await api.post("/driver/withdrawals", {
        amount: Number(form.amount),
        bankName: form.bankName,
        bankAccountNo: form.bankAccountNo,
        bankAccountName: form.bankAccountName,
      });
      setMsg({ ok: true, text: "Yêu cầu rút tiền đã gửi! Admin sẽ xử lý trong 1–2 ngày làm việc." });
      setShowForm(false);
      setForm({ amount: "", bankName: "", bankAccountNo: "", bankAccountName: "" });
      await fetchWallet();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <span style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "var(--brand-primary)", animation: "spin .8s linear infinite", display: "inline-block" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const txns = data?.transactions ?? [];

  // Chart: last 30 days
  const chartData = (() => {
    const map: Record<string, number> = {};
    txns.filter((t) => t.type === "TRIP_CREDIT").forEach((t) => {
      const d = new Date(t.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      map[d] = (map[d] ?? 0) + t.amount;
    });
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const key = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      return { date: key, thunhap: map[key] ?? 0 };
    });
    return days;
  })();

  const totalEarnings = txns.filter((t) => t.type === "TRIP_CREDIT").reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{ maxWidth: 760 }}>

      {/* ── Title ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: "var(--text-primary)",
          display: "flex", alignItems: "center", gap: 10, marginBottom: 4,
        }}>
          <WalletIcon size={22} color="var(--brand-emerald)"/> Ví & Thu nhập
        </h1>
      </div>

      {/* ── Alert ─────────────────────────────────────────────── */}
      {msg && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 16px", borderRadius: 12, marginBottom: 20,
          background: msg.ok ? "rgba(52,211,153,.1)" : "var(--danger-bg)",
          border: `1px solid ${msg.ok ? "rgba(52,211,153,.3)" : "var(--danger-border)"}`,
          color: msg.ok ? "var(--brand-emerald)" : "var(--danger)", fontSize: 13,
        }}>
          {msg.ok ? <CheckCircleIcon size={16} style={{ flexShrink:0, marginTop:1 }}/> : <AlertTriangleIcon size={16} style={{ flexShrink:0, marginTop:1 }}/>}
          {msg.text}
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }} className="wallet-stats">
        <StatCard
          icon={<CoinIcon size={18} color="var(--brand-emerald)"/>}
          label="Có thể rút" value={`${(data?.withdrawableBalance ?? 0).toLocaleString("vi-VN")}đ`}
          color="#34d399"
          action={
            <button
              onClick={() => setShowForm(true)}
              disabled={(data?.withdrawableBalance ?? 0) < 50_000}
              style={{
                width: "100%", marginTop: 10, padding: "7px",
                background: (data?.withdrawableBalance ?? 0) >= 50_000 ? "var(--grad-primary)" : "var(--bg-elevated)",
                border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 12,
                cursor: (data?.withdrawableBalance ?? 0) >= 50_000 ? "pointer" : "not-allowed",
                opacity: (data?.withdrawableBalance ?? 0) >= 50_000 ? 1 : .5,
              }}
            >
              Rút tiền
            </button>
          }
        />
        <StatCard
          icon={<ClockIcon size={18} color="var(--brand-amber)"/>}
          label="Đang giữ" value={`${(data?.pendingBalance ?? 0).toLocaleString("vi-VN")}đ`}
          color="#fbbf24"
          sub={data?.pendingReleases[0]?.availableAt
            ? `Gần nhất: ${new Date(data.pendingReleases[0].availableAt).toLocaleDateString("vi-VN")}`
            : "Sẽ giải phóng sau 3 ngày"
          }
        />
        <StatCard
          icon={<TrendingUpIcon size={18} color="var(--brand-primary)"/>}
          label="Tổng doanh thu" value={`${totalEarnings.toLocaleString("vi-VN")}đ`}
          color="#6366f1"
          sub={`${txns.filter((t) => t.type === "TRIP_CREDIT").length} chuyến`}
        />
      </div>

      {/* ── Withdraw form ─────────────────────────────────────── */}
      {showForm && (
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: 16, padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", display: "flex", gap: 8, alignItems: "center" }}>
              <WalletIcon size={16} color="var(--brand-emerald)"/> Yêu cầu rút tiền
            </div>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          <form onSubmit={withdraw}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="withdraw-grid">
              {[
                { key: "amount",         label: "Số tiền (VND)",   type: "number", placeholder: "500000" },
                { key: "bankName",       label: "Tên ngân hàng",   type: "text",   placeholder: "Vietcombank" },
                { key: "bankAccountNo",  label: "Số tài khoản",    type: "text",   placeholder: "1234567890" },
                { key: "bankAccountName",label: "Chủ tài khoản",   type: "text",   placeholder: "NGUYEN VAN A" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    type={type} placeholder={placeholder} required
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 12px",
                      background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                      borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: "11px", background: "var(--grad-primary)", border: "none",
                borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}>
                {submitting ? "Đang gửi..." : "Gửi yêu cầu rút tiền"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: "11px 20px", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                borderRadius: 10, color: "var(--text-muted)", fontSize: 14, cursor: "pointer",
              }}>
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Chart ─────────────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, marginBottom: 20, overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px 12px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <ActivityIcon size={16} color="var(--brand-emerald)"/>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Thu nhập 14 ngày qua</span>
        </div>
        <div style={{ padding: "16px 8px 8px" }}>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gEarn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--brand-emerald)" stopOpacity={.3}/>
                  <stop offset="95%" stopColor="var(--brand-emerald)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,.07)"/>
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1}/>
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => v === 0 ? "0" : `${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={TT_STYLE}
                formatter={(v: unknown) => [Number(v).toLocaleString("vi-VN") + "đ", "Thu nhập"]}/>
              <Area type="monotone" dataKey="thunhap" stroke="var(--brand-emerald)" strokeWidth={2.5}
                fill="url(#gEarn)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Transaction list ──────────────────────────────────── */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px 12px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <CoinIcon size={16} color="var(--brand-primary)"/>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Lịch sử giao dịch</span>
        </div>
        {txns.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Chưa có giao dịch nào
          </div>
        ) : (
          <div>
            {txns.slice(0, 30).map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 20px",
                borderBottom: i < txns.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${TX_COLOR[t.type] ?? "#94a3b8"}18`,
                  border: `1px solid ${TX_COLOR[t.type] ?? "#94a3b8"}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {t.type === "TRIP_CREDIT" ? <TrendingUpIcon size={15} color={TX_COLOR[t.type]}/> :
                   t.type === "WITHDRAWAL"  ? <WalletIcon size={15} color={TX_COLOR[t.type]}/> :
                                              <CoinIcon size={15} color={TX_COLOR[t.type] ?? "var(--text-secondary)"}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 1 }}>
                    {TX_LABEL[t.type] ?? t.type}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.description}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: t.amount > 0 ? "var(--brand-emerald)" : "var(--danger)" }}>
                    {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("vi-VN")}đ
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .wallet-stats { grid-template-columns: 1fr !important; }
          .withdraw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, color, sub, action }: {
  icon: React.ReactNode; label: string; value: string;
  color: string; sub?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: `1px solid ${color}20`,
      borderRadius: 16, padding: 18, position: "relative", overflow: "hidden",
    }}>
      {/* Glow bg */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: "none",
      }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -.5, marginBottom: sub ? 4 : 0 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
      {action}
    </div>
  );
}

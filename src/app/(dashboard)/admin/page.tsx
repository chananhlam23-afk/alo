"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ActivityIcon, CarIcon, DocumentIcon, RouteIcon, ZapIcon,
  WalletIcon, FlagIcon, TagIcon, UsersGroupIcon, CheckCircleIcon,
  ShieldIcon, AlertTriangleIcon,
} from "@/components/ui/Icons";

import type { ChartDatum } from "./_AdminCharts";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });
// Recharts (~170KB) được tách ra chunk riêng, chỉ tải khi dashboard render ở client.
const AdminCharts = dynamic(() => import("./_AdminCharts"), { ssr: false });

interface DashboardMetrics {
  totalUsers: number; totalDrivers: number; pendingKyc: number;
  totalTrips: number; activeTrips: number; pendingWithdrawals: number; openReports: number;
}

type GType = "notification"|"backhaul"|"cargo"|"route"|"realtime"|"payment"|"ai";

const STATS: Array<{
  key: keyof DashboardMetrics; label: string; geo: GType;
  color: string; Icon: React.FC<{size?:number;color?:string}>;
  href?: string; alert?: boolean;
}> = [
  { key:"totalUsers",        label:"Người dùng",    geo:"notification", color:"#00A18B", Icon:UsersGroupIcon },
  { key:"totalDrivers",      label:"Tài xế",        geo:"backhaul",     color:"#0BA5C7", Icon:CarIcon },
  { key:"pendingKyc",        label:"KYC chờ duyệt", geo:"cargo",        color:"#E8912E", Icon:DocumentIcon, href:"/admin/drivers?status=PENDING", alert:true },
  { key:"totalTrips",        label:"Tổng chuyến",   geo:"route",        color:"#0F766E", Icon:RouteIcon },
  { key:"activeTrips",       label:"Đang chạy",     geo:"realtime",     color:"#12B886", Icon:ZapIcon },
  { key:"pendingWithdrawals",label:"Rút tiền chờ",  geo:"payment",      color:"#0E9F6E", Icon:WalletIcon, href:"/admin/withdrawals?status=PENDING", alert:true },
  { key:"openReports",       label:"Báo cáo mở",    geo:"ai",           color:"#E03E3E", Icon:FlagIcon, href:"/admin/reports?status=OPEN", alert:true },
];

type DashboardResponse = DashboardMetrics & {
  series: Array<{ date: string; trips: number; revenue: number; users: number }>;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDatum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardResponse>("/admin/dashboard")
      .then((r) => {
        setMetrics(r.data);
        setChartData(
          (r.data.series ?? []).map((s) => ({
            date: s.date,
            "chuyến": s.trips,
            doanhthu: s.revenue,
            nguoidung: s.users,
          })),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid var(--border-medium)", borderTopColor:"var(--brand-primary)", animation:"spin .8s linear infinite" }}/>
      <span style={{ color:"var(--text-muted)", fontSize:13 }}>Đang tải dữ liệu...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!metrics) return (
    <div style={{ textAlign:"center", padding:48 }}>
      <AlertTriangleIcon size={40} color="var(--danger)" style={{ margin:"0 auto 12px" }}/>
      <p style={{ color:"var(--text-muted)", marginBottom:16 }}>Không tải được dữ liệu</p>
      <button onClick={() => window.location.reload()} style={{ padding:"8px 20px", borderRadius:8, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)", color:"var(--text-primary)", cursor:"pointer" }}>
        Thử lại
      </button>
    </div>
  );

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <h1 style={{ fontSize:"clamp(18px,4.5vw,22px)", fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, margin:0 }}>
            <ActivityIcon size={22} color="var(--brand-primary)"/> Tổng quan hệ thống
          </h1>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)",
            borderRadius:99, padding:"5px 14px", fontSize:11, color:"var(--brand-emerald)", fontWeight:600,
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--brand-emerald)" }}/>
            Thời gian thực
          </div>
        </div>
        <div style={{ height:2, background:"linear-gradient(90deg,var(--brand-primary),var(--brand-secondary),transparent)", marginTop:16, borderRadius:99 }}/>
      </div>

      {/* ── Stat cards with GeoIcon ─────────────────────────────── */}
      <div className="adm-stat-grid" style={{ marginBottom:24 }}>
        {STATS.map(({ key, label, geo, color, Icon, href, alert }) => {
          const value = metrics[key];
          const Card = (
            <div style={{
              background:"var(--bg-surface)", border:`1px solid ${value > 0 && alert ? `${color}35` : "var(--border-subtle)"}`,
              borderRadius:16, padding:18, position:"relative", overflow:"hidden", height:"100%",
              cursor: href ? "pointer" : "default", transition:"border-color .2s, transform .2s, box-shadow .2s",
            }}
              onMouseEnter={(e) => { if (href) { e.currentTarget.style.borderColor=color+"60"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${color}18`; } }}
              onMouseLeave={(e) => { if (href) { e.currentTarget.style.borderColor=value>0&&alert?`${color}35`:"var(--border-subtle)"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; } }}
            >
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, gap:8 }}>
                <GeoIcon type={geo} size={40}/>
                {alert && value > 0 && (
                  <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:`${color}20`, color, border:`1px solid ${color}40`, whiteSpace:"nowrap", flexShrink:0 }}>
                    CẦN XỬ LÝ
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>
                {label}
              </div>
              <div style={{ fontSize:"clamp(20px,5vw,28px)", fontWeight:800, color:"var(--text-primary)", letterSpacing:-.5, lineHeight:1, minWidth:0 }}>
                {value.toLocaleString("vi-VN")}
              </div>
              {href && (
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:6, display:"flex", alignItems:"center", gap:4 }}>
                  <Icon size={10}/> Xem chi tiết →
                </div>
              )}
            </div>
          );
          return href ? <Link key={key} href={href} style={{ textDecoration:"none", display:"block", height:"100%" }}>{Card}</Link> : <div key={key} style={{ display:"block", height:"100%" }}>{Card}</div>;
        })}
      </div>

      {/* ── Quick actions + System status ───────────────────────── */}
      <div className="adm-panel-grid" style={{ marginBottom:24 }}>
        {/* Quick actions */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <ZapIcon size={15} color="var(--warning)"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Thao tác nhanh</span>
          </div>
          <div style={{ padding:"4px 0" }}>
            {[
              { href:"/admin/drivers?status=PENDING",     Icon:DocumentIcon,   label:"Duyệt KYC đang chờ",    count:metrics.pendingKyc,        color:"#E8912E" },
              { href:"/admin/withdrawals?status=PENDING", Icon:WalletIcon,     label:"Duyệt rút tiền",         count:metrics.pendingWithdrawals, color:"#00A18B" },
              { href:"/admin/reports?status=OPEN",        Icon:FlagIcon,       label:"Xử lý báo cáo",          count:metrics.openReports,        color:"#E03E3E" },
              { href:"/admin/pricing",                    Icon:TagIcon,        label:"Cấu hình bảng giá",      count:null,                       color:"#12B886" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:"1px solid var(--border-subtle)", color:"var(--text-primary)", fontSize:13, fontWeight:500, transition:"all .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = l.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-primary)"; }}
              >
                <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <l.Icon size={14}/> {l.label}
                </span>
                {l.count !== null && l.count > 0 && (
                  <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:`${l.color}20`, color:l.color, border:`1px solid ${l.color}40` }}>{l.count}</span>
                )}
                {l.count === null && <span style={{ color:"var(--text-muted)", fontSize:12 }}>→</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* System status */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <ShieldIcon size={15} color="var(--brand-primary)"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Trạng thái hệ thống</span>
          </div>
          <div style={{ padding:"4px 0" }}>
            {[
              { label:"Chuyến đang hoạt động", value:metrics.activeTrips,                                    ok:true },
              { label:"Yêu cầu tồn đọng",      value:metrics.pendingKyc+metrics.pendingWithdrawals,          ok:metrics.pendingKyc+metrics.pendingWithdrawals<=5 },
              { label:"Báo cáo chưa xử lý",    value:metrics.openReports,                                   ok:metrics.openReports===0 },
            ].map((item, i, arr) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:i<arr.length-1?"1px solid var(--border-subtle)":"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-secondary)" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:item.ok?"var(--brand-emerald)":item.value>5?"var(--brand-amber)":"var(--danger)" }}/>
                  {item.label}
                </div>
                <span style={{ fontWeight:700, fontSize:18, color:item.ok?"var(--success)":item.value>5?"var(--warning)":"var(--danger)" }}>
                  {item.value}
                </span>
              </div>
            ))}
            <div style={{ margin:"0 20px 14px", padding:"10px 14px", borderRadius:10, background:"var(--success-bg)", border:"1px solid var(--success-border)", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--success)" }}>
              <CheckCircleIcon size={13}/> Hệ thống hoạt động bình thường
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts (Recharts tách chunk riêng) ──────────────────── */}
      <AdminCharts chartData={chartData} />

      <style>{`
        .adm-stat-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (min-width: 640px)  { .adm-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 1440px) { .adm-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

        .adm-panel-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 1024px) { .adm-panel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
}


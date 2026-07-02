"use client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { TrendingUpIcon, UsersGroupIcon, WalletIcon } from "@/components/ui/Icons";

const TT = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-medium)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 12,
};

export interface ChartDatum {
  date: string;
  "chuyến": number;
  doanhthu: number;
  nguoidung: number;
}

/**
 * Tách riêng các biểu đồ Recharts để dynamic-import (ssr:false) từ trang admin,
 * giúp Recharts (~170KB) không bị gộp vào bundle khởi tạo của trang.
 */
export default function AdminCharts({ chartData }: { chartData: ChartDatum[] }) {
  return (
    <>
      {/* ── Charts ──────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }} className="admin-charts">
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <TrendingUpIcon size={15} color="#00A18B"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Chuyến xe — 14 ngày qua</span>
          </div>
          <div style={{ padding:"16px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gTrip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00A18B" stopOpacity={.3}/>
                    <stop offset="95%" stopColor="#00A18B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,128,110,.10)"/>
                <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TT} formatter={(v: unknown) => [v+" chuyến","Số chuyến"]}/>
                <Area type="monotone" dataKey="chuyến" stroke="#00A18B" strokeWidth={2.5} fill="url(#gTrip)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <UsersGroupIcon size={15} color="#0BA5C7"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Người dùng mới</span>
          </div>
          <div style={{ padding:"16px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,128,110,.10)"/>
                <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TT} formatter={(v: unknown) => [v+" người","Mới"]}/>
                <Line type="monotone" dataKey="nguoidung" stroke="#0BA5C7" strokeWidth={2.5} dot={{ fill:"#0BA5C7", r:3 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
          <WalletIcon size={15} color="#12B886"/>
          <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Doanh thu ước tính — 14 ngày qua</span>
        </div>
        <div style={{ padding:"16px 8px 8px" }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,128,110,.10)"/>
              <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000000).toFixed(1)}tr`}/>
              <Tooltip contentStyle={TT} formatter={(v: unknown) => [Number(v).toLocaleString("vi-VN")+"đ","Doanh thu"]}/>
              <Bar dataKey="doanhthu" fill="#12B886" radius={[4,4,0,0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        /* Ghép 2 biểu đồ trên cùng chỉ khi có sidebar cố định (>=1025px);
           dưới mức đó (drawer, full-width) xếp dọc cho khỏi chật. */
        @media (max-width: 1024px) {
          .admin-charts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

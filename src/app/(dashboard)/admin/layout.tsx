"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeProvider";
import {
  ActivityIcon, CarIcon, RouteIcon, WalletIcon, FlagIcon,
  TagIcon, UsersGroupIcon, LogOutIcon, XIcon, ShieldIcon, ClockIcon,
  GiftIcon, HomeIcon, MenuIcon, DocumentIcon,
} from "@/components/ui/Icons";

const NAV = [
  { href: "/admin",             Icon: ActivityIcon,  label: "Tổng quan",    color: "#00A18B" },
  { href: "/admin/landing",     Icon: HomeIcon,      label: "Trang chủ",    color: "#0BA5C7" },
  { href: "/admin/orders",      Icon: ClockIcon,     label: "Đơn chờ",      color: "#E8912E" },
  { href: "/admin/drivers",     Icon: CarIcon,       label: "Tài xế & KYC", color: "#0891B2" },
  { href: "/admin/trips",       Icon: RouteIcon,     label: "Chuyến xe",    color: "#0F766E" },
  { href: "/admin/withdrawals", Icon: WalletIcon,    label: "Rút tiền",     color: "#12B886" },
  { href: "/admin/reports",     Icon: FlagIcon,      label: "Báo cáo",      color: "#E03E3E" },
  { href: "/admin/pricing",     Icon: TagIcon,       label: "Bảng giá",     color: "#0E9F6E" },
  { href: "/admin/rewards",     Icon: GiftIcon,      label: "Khuyến mãi",   color: "#F2994A" },
  { href: "/admin/blog",        Icon: DocumentIcon,  label: "Blog",         color: "#0EA5A0" },
  { href: "/admin/users",       Icon: UsersGroupIcon,label: "Người dùng",   color: "#14B8A6" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.href = "/login"; return; }
    if (user.role === "DRIVER") { window.location.href = "/driver"; return; }
    if (user.role === "CUSTOMER") { window.location.href = "/customer"; return; }
    if (user.role !== "ADMIN") { window.location.href = "/login"; }
  }, [user, loading]);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      background: "var(--bg-base)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid var(--border-medium)", borderTopColor: "var(--brand-primary)",
        animation: "spin .8s linear infinite",
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return null;

  const initial = (user.fullName ?? user.email ?? "A").charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* Mobile backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)",
        }}/>
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: open ? 0 : "var(--adm-sw,-260px)",
        width: 260, height: "100vh", zIndex: 50,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        transition: "left .25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 18px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{
              width: 40, height: 40, borderRadius: 11, objectFit: "cover",
              border: "1px solid var(--border-subtle)",
            }} />
            <div>
              <div className="brand-name" style={{ fontSize: 16 }}>Thuận Chuyến</div>
              <div style={{ fontSize: 10, color: "var(--brand-primary)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>ADMIN</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="admin-close-btn"
            style={{ display:"none", width:28, height:28, borderRadius:6, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)", cursor:"pointer", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}
          >
            <XIcon size={14}/>
          </button>
        </div>

        {/* Admin badge */}
        <div style={{ padding: "10px 16px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--bg-active)", border: "1px solid var(--border-medium)",
            borderRadius: 99, padding: "4px 10px", fontSize: 11, color: "var(--brand-primary)", fontWeight: 600,
          }}>
            <ShieldIcon size={10}/> Admin Dashboard
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
          {NAV.map(({ href, Icon, label, color }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, marginBottom: 2,
                  background: active ? `${color}18` : "transparent",
                  border: `1px solid ${active ? `${color}35` : "transparent"}`,
                  color: active ? color : "var(--text-secondary)",
                  fontWeight: active ? 600 : 400, fontSize: 13,
                  transition: "all .15s",
                }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                >
                  <Icon size={16} color={active ? color : "currentColor"}/>
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }}/>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
            borderRadius: 10, marginBottom: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0,
            }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.fullName ?? user.email}
              </div>
              <div style={{ fontSize: 10, color: "var(--brand-primary)", fontWeight: 600 }}>Administrator</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <ThemeToggle />
            <button onClick={logout} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8,
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)", fontSize: 12, cursor: "pointer", transition: "all .15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger-border)"; e.currentTarget.style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <LogOutIcon size={13}/> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────── */}
      <div className="adm-main-wrap" style={{ flex: 1, marginLeft: "var(--adm-ml, 260px)", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile header */}
        <header className="adm-mobile-hdr" style={{
          display: "none", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: 56,
          background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)",
          position: "sticky", top: 0, zIndex: 30,
        }}>
          <button onClick={() => setOpen(true)} aria-label="Mở menu" style={{
            width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-primary)",
          }}>
            <MenuIcon size={18} strokeWidth={2.5} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} /> Admin
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle />
            <button onClick={logout} style={{ minHeight: 40, padding: "8px 14px", borderRadius: 8, background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Thoát
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }} className="admin-main">
          {children}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Sidebar cố định từ ≥1025px; nhỏ hơn → dạng drawer + header mobile */
        @media (max-width: 1024px) {
          .adm-mobile-hdr { display: flex !important; }
          .admin-main { padding: 20px !important; }
          aside { --adm-sw: -280px; }
          .adm-main-wrap { margin-left: 0 !important; }
          .admin-close-btn { display: flex !important; }
        }
        @media (max-width: 480px) {
          .admin-main { padding: 14px !important; }
        }
        @media (min-width: 1025px) {
          aside { left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

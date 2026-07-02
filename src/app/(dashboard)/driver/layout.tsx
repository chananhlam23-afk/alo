"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeProvider";
import NotificationBell from "@/components/NotificationBell";
import PhoneGate from "@/components/PhoneGate";
import {
  HomeIcon, ListIcon, HistoryIcon, WalletIcon, DocumentIcon,
  RouteIcon, BackhaulIcon, PackageIcon, LogOutIcon, XIcon, CarIcon, ChatIcon, MenuIcon,
} from "@/components/ui/Icons";

const NAV = [
  { href: "/driver",           Icon: HomeIcon,      label: "Trang chủ",     color: "#6366f1" },
  { href: "/driver/matches",   Icon: ListIcon,      label: "Chuyến chờ",    color: "#22d3ee" },
  { href: "/driver/messages",  Icon: ChatIcon,      label: "Tin nhắn",      color: "#a78bfa" },
  { href: "/driver/accepted",  Icon: CarIcon,       label: "Chuyến đã nhận",color: "#34d399" },
  { href: "/driver/trips",     Icon: HistoryIcon,   label: "Lịch sử",       color: "#a78bfa" },
  { href: "/driver/wallet",   Icon: WalletIcon,    label: "Ví & Thu nhập",color: "#34d399" },
  { href: "/driver/kyc",      Icon: DocumentIcon,  label: "Hồ sơ KYC",    color: "#f472b6" },
  { href: "/driver/routes",   Icon: RouteIcon,     label: "Lộ trình",     color: "#fbbf24" },
  { href: "/driver/backhaul", Icon: BackhaulIcon,  label: "Chiều quay về",color: "#f97316" },
  { href: "/driver/cargo",    Icon: PackageIcon,   label: "Hàng ghép",    color: "#22d3ee" },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
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
        border: "3px solid rgba(99,102,241,.2)",
        borderTopColor: "var(--brand-primary)",
        animation: "spin .8s linear infinite",
      }}/>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return null;

  const initial = (user.fullName ?? user.email ?? "T").charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Bắt liên kết số điện thoại nếu tài khoản chưa có */}
      <PhoneGate />

      {/* ── Backdrop (mobile) ─────────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: open ? 0 : "var(--sidebar-w,-260px)",
        width: 260, height: "100vh", zIndex: 50,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        transition: "left .25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{
              width: 40, height: 40, borderRadius: 11, objectFit: "cover",
              boxShadow: "0 0 0 1px rgba(99,102,241,.45), 0 0 16px rgba(99,102,241,.42), 0 0 30px rgba(34,211,238,.18)",
            }} />
            <div>
              <div className="brand-name" style={{ fontSize: 16 }}>Tài xế</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Driver Hub</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              display: "none", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 6,
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              cursor: "pointer", color: "var(--text-muted)",
            }}
            className="sidebar-close-btn"
            aria-label="Đóng menu"
          >
            <XIcon size={14}/>
          </button>
        </div>

        {/* Online badge */}
        <div style={{ padding: "10px 16px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)",
            borderRadius: 99, padding: "4px 10px", fontSize: 11, color: "var(--brand-emerald)", fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand-emerald)", boxShadow: "0 0 6px var(--brand-emerald)" }}/>
            Driver Dashboard
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
          {NAV.map(({ href, Icon, label, color }) => {
            const active = pathname === href || (href !== "/driver" && pathname.startsWith(href));
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
                  cursor: "pointer",
                }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "var(--bg-overlay)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <Icon size={16} color={active ? color : "currentColor"}/>
                  {label}
                  {active && (
                    <span style={{
                      marginLeft: "auto", width: 5, height: 5, borderRadius: "50%",
                      background: color, boxShadow: `0 0 8px ${color}`,
                    }}/>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <a href="/profile" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 10, marginBottom: 8,
              cursor: "pointer", transition: "background .15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-overlay)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--grad-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0,
              }}>{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.fullName ?? user.email ?? "Tài xế"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Xem hồ sơ →</div>
              </div>
            </div>
          </a>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <NotificationBell />
            <ThemeToggle />
            <button
              onClick={logout}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "7px 12px", borderRadius: 8,
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger-border)"; e.currentTarget.style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <LogOutIcon size={13}/> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        marginLeft: "var(--content-ml, 260px)",
        display: "flex", flexDirection: "column", minWidth: 0,
      }}>
        {/* Mobile header */}
        <header style={{
          display: "none",
          alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: 56,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "sticky", top: 0, zIndex: 30,
        }} className="mobile-header-bar">
          <button
            onClick={() => setOpen(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 8,
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              cursor: "pointer", color: "var(--text-primary)",
            }}
            aria-label="Mở menu"
          >
            <MenuIcon size={18} strokeWidth={2.5} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
            Tài xế
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ThemeToggle />
            <button onClick={logout} style={{ padding: "5px 12px", borderRadius: 6, background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
              Thoát
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }} className="driver-main">
          {children}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .mobile-header-bar { display: flex !important; }
          .driver-main { padding: 16px !important; }
          aside { --sidebar-w: -260px; }
          div[style*="--content-ml"] { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          .sidebar-close-btn { display: none !important; }
          aside { left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

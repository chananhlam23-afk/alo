"use client";
import { useState, useEffect } from "react";
import type { NavItem } from "@/types/landing";
import { MenuIcon, XIcon, ExternalLinkIcon } from "@/components/ui/Icons";

interface Props {
  brand: string;
  items: NavItem[];
}

export default function LandingNav({ brand, items }: Props) {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else            document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleNav = (href: string, external: boolean) => {
    setMobileOpen(false);
    if (external) { window.open(href, "_blank", "noopener"); return; }
    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 60,
        background: scrolled
          ? "var(--bg-glass)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--border-subtle)"
          : "1px solid transparent",
        transition: "background .3s,border-color .3s,backdrop-filter .3s",
        display: "flex", alignItems: "center",
        padding: "0 max(24px, calc((100vw - 1200px)/2))",
      }}>
        {/* Brand */}
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          marginRight: "auto", cursor: "pointer",
        }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src="/logo.png" alt={brand}
            style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: -.2 }}>
            {brand}
          </span>
        </div>

        {/* Desktop nav items */}
        <div className="nav-links" style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.href, item.external)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 14px", borderRadius: 8,
                fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                display: "flex", alignItems: "center", gap: 5,
                transition: "color .15s, background .15s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
            >
              {item.label}
              {item.badge && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 5px",
                  borderRadius: 99, background: "var(--brand-primary)",
                  color: "#04302A", lineHeight: 1.4,
                }}>
                  {item.badge}
                </span>
              )}
              {item.external && (
                <ExternalLinkIcon size={10} strokeWidth={2.5} style={{ opacity: .5 }} />
              )}
            </button>
          ))}
        </div>

        {/* CTA + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
          <button
            onClick={() => document.getElementById("login-card")?.scrollIntoView({ behavior: "smooth" })}
            className="nav-cta"
            style={{
              padding: "8px 18px", borderRadius: 10,
              background: "var(--brand-primary)",
              border: "none", color: "#04302A", fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all .18s",
              boxShadow: "0 2px 8px rgba(0,194,168,.28)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,194,168,.38)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,194,168,.28)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Đăng nhập
          </button>

          <button
            className="nav-hamburger"
            onClick={() => setMobileOpen(true)}
            style={{
              display: "none", width: 36, height: 36, borderRadius: 8,
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              cursor: "pointer", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)",
            }}
            aria-label="Menu"
          >
            <MenuIcon size={18} strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex",
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{ flex: 1, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}
          />
          {/* Drawer */}
          <div style={{
            width: 280, height: "100%",
            background: "var(--bg-deep)", backdropFilter: "blur(20px)",
            borderLeft: "1px solid var(--border-subtle)",
            display: "flex", flexDirection: "column",
            padding: 20,
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/logo.png" alt={brand}
                  style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{brand}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                <XIcon size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.href, item.external)}
                  style={{
                    background: "none", border: "1px solid transparent",
                    cursor: "pointer", padding: "12px 14px", borderRadius: 10,
                    textAlign: "left", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)",
                    display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.borderColor = "var(--border-medium)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px",
                      borderRadius: 99, background: "var(--brand-primary)", color: "#04302A",
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <button
              onClick={() => { setMobileOpen(false); document.getElementById("login-card")?.scrollIntoView({ behavior: "smooth" }); }}
              style={{
                width: "100%", padding: "12px",
                background: "var(--brand-primary)",
                border: "none", borderRadius: 12, color: "#04302A",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 3px 12px rgba(0,194,168,.3)",
              }}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-cta { display: none !important; }
        }
      `}</style>
    </>
  );
}

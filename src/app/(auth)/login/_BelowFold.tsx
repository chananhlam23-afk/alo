"use client";
import type {
  SectionConfig, BlogPostSummary, EventSummary,
  FooterGroup,
} from "@/types/landing";
import { SearchIcon, MapPinIcon, CreditCardIcon, DocumentIcon } from "@/components/ui/Icons";

/* ── Constants ────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  TIN_TUC:   "Tin tức",
  KHUYEN_MAI:"Khuyến mãi",
  HUONG_DAN: "Hướng dẫn",
  CAU_CHUYEN:"Câu chuyện",
  THI_TRUONG:"Thị trường",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CASHBACK:     "Hoàn tiền",
  DOUBLE_POINT: "Điểm đôi",
  DISCOUNT:     "Giảm giá",
  FREE_RIDE:    "Chuyến miễn phí",
  STREAK_BONUS: "Thưởng liên tiếp",
  REFERRAL:     "Giới thiệu bạn",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  CASHBACK:     "#12B886",
  DOUBLE_POINT: "#0BA5C7",
  DISCOUNT:     "#D97706",
  FREE_RIDE:    "#00A18B",
  STREAK_BONUS: "#00806E",
  REFERRAL:     "#0F766E",
};

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    color: "#00A18B",
    title: "Đặt chuyến trong 30 giây",
    desc: "Nhập điểm đi, điểm đến và giờ xuất phát. AI sẽ tìm tài xế phù hợp nhất trong bán kính tuyến đường của bạn.",
    icon: <SearchIcon size={24} />,
  },
  {
    step: "02",
    color: "#0BA5C7",
    title: "Theo dõi hành trình thực",
    desc: "Biết vị trí xe theo thời gian thực. Chia sẻ hành trình với người thân chỉ bằng một cú chạm.",
    icon: <MapPinIcon size={24} />,
  },
  {
    step: "03",
    color: "#12B886",
    title: "Thanh toán & đánh giá",
    desc: "Thanh toán qua VNPay, MoMo, PayOS hoặc ví Thuận Chuyến. Đánh giá tài xế để xây dựng cộng đồng tin cậy.",
    icon: <CreditCardIcon size={24} />,
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function fmtDate(d: Date | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(d));
}

function daysLeft(endsAt: Date) {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/* ── Section Header ───────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, desc, ctaLabel, ctaHref }: {
  eyebrow: string; title: string; desc: string;
  ctaLabel?: string; ctaHref?: string;
}) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
      <div>
        <div style={{
          display:"inline-block", padding:"3px 10px", borderRadius:99,
          background:"var(--bg-active)", border:"1px solid var(--border-medium)",
          fontSize:11, fontWeight:700, color:"var(--brand-primary)", letterSpacing:0.5,
          marginBottom:10, textTransform:"uppercase",
        }}>{eyebrow}</div>
        <h2 style={{ fontSize:"clamp(20px,2.5vw,28px)", fontWeight:800, color:"var(--text-primary)", marginBottom:8 }}>
          {title}
        </h2>
        <p style={{ color:"var(--text-muted)", fontSize:14, lineHeight:1.7, maxWidth:560 }}>{desc}</p>
      </div>
      {ctaLabel && ctaHref && (
        <a href={ctaHref} style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 18px", borderRadius:10,
          border:"1px solid var(--border-medium)",
          color:"var(--brand-primary-dark)", fontSize:13, fontWeight:600,
          textDecoration:"none", transition:"all .2s", whiteSpace:"nowrap",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          {ctaLabel} →
        </a>
      )}
    </div>
  );
}

/* ── Events Section ───────────────────────────────────────────────── */

function EventsSection({ section, events }: { section: SectionConfig; events: EventSummary[] }) {
  if (events.length === 0) return null;
  return (
    <section id="events" style={{ marginBottom:72 }}>
      <SectionHeader
        eyebrow="Ưu đãi đang diễn ra"
        title={section.title}
        desc={section.subtitle}
        ctaLabel={section.ctaLabel}
        ctaHref={section.ctaHref}
      />
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",
        gap:16, marginTop:32,
      }}>
        {events.map((ev) => {
          const color = EVENT_TYPE_COLORS[ev.type] ?? "#00A18B";
          const left  = daysLeft(ev.endsAt);
          return (
            <div key={ev.id} style={{
              background:"var(--bg-surface)",
              border:`1px solid ${color}28`,
              borderRadius:16, overflow:"hidden", position:"relative",
              transition:"transform .2s, border-color .2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor=`${color}55`; (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor=`${color}28`; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}
            >
              <div style={{ height:3, background:`linear-gradient(90deg,${color},${color}44)` }} />
              <div style={{ padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
                    background:`${color}18`, color, border:`1px solid ${color}30`,
                  }}>
                    {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                  </span>
                  {left <= 3 ? (
                    <span style={{ fontSize:11, color:"var(--danger)", fontWeight:600 }}>Còn {left} ngày</span>
                  ) : (
                    <span style={{ fontSize:11, color:"#475569" }}>Đến {fmtDate(ev.endsAt)}</span>
                  )}
                </div>
                <h3 style={{ color:"var(--text-primary)", fontSize:15, fontWeight:700, marginBottom:8, lineHeight:1.4 }}>
                  {ev.name}
                </h3>
                <p style={{ color:"var(--text-muted)", fontSize:13, lineHeight:1.6, marginBottom:14 }}>
                  {ev.description.slice(0, 120)}{ev.description.length > 120 ? "…" : ""}
                </p>
                <a href="/login" style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  fontSize:13, fontWeight:600, color, textDecoration:"none",
                }}>
                  Tham gia ngay →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Posts Section ────────────────────────────────────────────────── */

function PostsSection({ section, posts }: { section: SectionConfig; posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;
  return (
    <section id="posts" style={{ marginBottom:72 }}>
      <SectionHeader
        eyebrow="Kiến thức & Chia sẻ"
        title={section.title}
        desc={section.subtitle}
        ctaLabel={section.ctaLabel}
        ctaHref={section.ctaHref}
      />
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",
        gap:20, marginTop:32,
      }}>
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/blog/${post.slug}`}
            style={{
              display:"block", textDecoration:"none",
              background:"var(--bg-surface)",
              border:"1px solid var(--border-subtle)",
              borderRadius:16, overflow:"hidden",
              transition:"border-color .2s, transform .2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor="var(--brand-primary)"; (e.currentTarget as HTMLElement).style.transform="translateY(-3px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="var(--border-subtle)"; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}
          >
            {post.coverImage ? (
              <div style={{ height:160, overflow:"hidden" }}>
                <img
                  src={post.coverImage} alt={post.title}
                  style={{ width:"100%", height:"100%", objectFit:"cover",
                    transition:"transform .4s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform="scale(1.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform="scale(1)"; }}
                />
              </div>
            ) : (
              <div style={{
                height:120, background:"linear-gradient(135deg,rgba(0,194,168,.15),rgba(11,165,199,.08))",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <DocumentIcon size={32} color="rgba(0,128,110,.5)" />
              </div>
            )}
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{
                  padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
                  background:"var(--bg-active)", color:"var(--brand-primary-dark)",
                  border:"1px solid var(--border-medium)",
                }}>
                  {CATEGORY_LABELS[post.category] ?? post.category}
                </span>
                <span style={{ fontSize:11, color:"#475569" }}>{post.readTime} phút đọc</span>
              </div>
              <h3 style={{ color:"var(--text-primary)", fontSize:15, fontWeight:700, lineHeight:1.4, marginBottom:8 }}>
                {post.title}
              </h3>
              <p style={{ color:"var(--text-muted)", fontSize:13, lineHeight:1.6, marginBottom:12 }}>
                {post.summary.slice(0, 100)}{post.summary.length > 100 ? "…" : ""}
              </p>
              {post.publishedAt && (
                <span style={{ fontSize:11, color:"#334155" }}>{fmtDate(post.publishedAt)}</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ── How It Works Section ─────────────────────────────────────────── */

function HowItWorksSection({ section }: { section: SectionConfig }) {
  return (
    <section id="how-it-works" style={{ marginBottom:72 }}>
      <SectionHeader
        eyebrow="Đơn giản & Nhanh chóng"
        title={section.title}
        desc={section.subtitle}
      />
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",
        gap:20, marginTop:36,
        position:"relative",
      }}>
        {HOW_IT_WORKS_STEPS.slice(0, section.limit ?? 3).map((step, i) => (
          <div key={i} style={{ position:"relative" }}>
            {/* Connector line */}
            {i < (section.limit ?? 3) - 1 && (
              <div className="hiw-connector" style={{
                position:"absolute", top:32, left:"calc(50% + 70px)",
                width:"calc(100% - 70px)", height:1,
                background:"linear-gradient(90deg,var(--border-medium),transparent)",
                display:"none",
              }} />
            )}
            <div style={{
              background:"var(--bg-surface)",
              border:"1px solid var(--border-subtle)",
              borderRadius:18, padding:"28px 24px",
              position:"relative", overflow:"hidden",
              transition:"border-color .2s, transform .2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor=`${step.color}40`; (e.currentTarget as HTMLElement).style.transform="translateY(-3px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="var(--border-subtle)"; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}
            >
              {/* Background number */}
              <div style={{
                position:"absolute", top:-10, right:10, fontSize:80, fontWeight:900,
                color:`${step.color}08`, lineHeight:1, userSelect:"none",
              }}>
                {step.step}
              </div>
              <div style={{
                width:52, height:52, borderRadius:14, marginBottom:20,
                background:`${step.color}18`, border:`1px solid ${step.color}35`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:step.color,
              }}>
                {step.icon}
              </div>
              <div style={{
                display:"inline-block", padding:"2px 8px", borderRadius:99,
                background:`${step.color}15`, color:step.color,
                fontSize:10, fontWeight:800, letterSpacing:1,
                marginBottom:12,
              }}>
                BƯỚC {step.step}
              </div>
              <h3 style={{ color:"var(--text-primary)", fontSize:16, fontWeight:700, marginBottom:10, lineHeight:1.4 }}>
                {step.title}
              </h3>
              <p style={{ color:"var(--text-muted)", fontSize:13, lineHeight:1.7 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`@media(min-width:900px){ .hiw-connector{display:block!important} }`}</style>
    </section>
  );
}

/* ── Banner chiến dịch (ảnh full-width, có thể click) ─────────────── */

function BannerSection({ section }: { section: SectionConfig }) {
  if (!section.imageUrl) return null;
  const inner = (
    <div style={{
      position:"relative", borderRadius:16, overflow:"hidden",
      border:"1px solid var(--border-subtle)", background:"var(--bg-overlay)",
    }}>
      <img
        src={section.imageUrl}
        alt={section.title || "Banner"}
        style={{ width:"100%", height:"clamp(160px, 32vw, 400px)", display:"block", objectFit:"cover" }}
      />
      {section.title && (
        <div style={{
          position:"absolute", left:0, right:0, bottom:0,
          padding:"28px 22px 18px",
          background:"linear-gradient(to top, rgba(0,0,0,.6), transparent)",
          color:"#fff",
        }}>
          <div style={{ fontSize:"clamp(18px,2.6vw,26px)", fontWeight:800, lineHeight:1.25 }}>{section.title}</div>
          {section.subtitle && <div style={{ fontSize:14, opacity:.92, marginTop:4 }}>{section.subtitle}</div>}
        </div>
      )}
    </div>
  );
  return (
    <section style={{ marginBottom:72 }}>
      {section.ctaHref
        ? <a href={section.ctaHref} style={{ display:"block", textDecoration:"none" }}>{inner}</a>
        : inner}
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────────────────── */

function LandingFooter({ groups, copy }: { groups: FooterGroup[]; copy: string }) {
  return (
    <footer style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "48px 0 32px",
      background: "var(--bg-surface)",
    }}>
      <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 24px" }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:`200px repeat(${Math.min(groups.length, 4)}, 1fr)`,
          gap:40, marginBottom:48,
        }}>
          {/* Brand column */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <img src="/logo.png" alt="Thuận Chuyến" style={{ width:32, height:32, borderRadius:8, objectFit:"cover" }} />
              <span style={{ fontWeight:700, fontSize:15, color:"var(--text-primary)" }}>Thuận Chuyến</span>
            </div>
            <p style={{ color:"#475569", fontSize:13, lineHeight:1.7 }}>
              Nền tảng ghép xe thế hệ mới. Kết nối tài xế &amp; hành khách thông minh bằng AI.
            </p>
          </div>
          {/* Link groups */}
          {groups.map((group) => (
            <div key={group.id}>
              <div style={{ color:"var(--text-secondary)", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:16 }}>
                {group.label}
              </div>
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:10 }}>
                {group.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener" : undefined}
                      style={{ color:"#475569", fontSize:13, textDecoration:"none", transition:"color .15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#475569"; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div style={{
          borderTop:"1px solid var(--border-subtle)",
          paddingTop:24,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
        }}>
          <span style={{ color:"#334155", fontSize:12 }}>{copy}</span>
          <div style={{ display:"flex", gap:16 }}>
            {[
              { label:"Điều khoản", href:"#" },
              { label:"Bảo mật",    href:"#" },
            ].map((l) => (
              <a key={l.href} href={l.href}
                style={{ color:"#334155", fontSize:12, textDecoration:"none", transition:"color .15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#334155"; }}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── BelowFold (entry point) ─────────────────────────────────────── */

interface Props {
  sections: SectionConfig[];
  posts: BlogPostSummary[];
  events: EventSummary[];
  footerGroups: FooterGroup[];
  footerCopy: string;
}

export default function BelowFold({ sections, posts, events, footerGroups, footerCopy }: Props) {
  return (
    <div style={{ background:"var(--bg-deep)", position:"relative", zIndex:5 }}>
      {sections.length > 0 && (
        <div style={{ maxWidth:1120, margin:"0 auto", padding:"72px 24px 0" }}>
          {sections.map((section) => {
            if (section.type === "events")       return <EventsSection      key={section.id} section={section} events={events} />;
            if (section.type === "posts")        return <PostsSection       key={section.id} section={section} posts={posts} />;
            if (section.type === "how_it_works") return <HowItWorksSection  key={section.id} section={section} />;
            if (section.type === "banner")       return <BannerSection      key={section.id} section={section} />;
            return null;
          })}
        </div>
      )}
      <LandingFooter groups={footerGroups} copy={footerCopy} />
    </div>
  );
}

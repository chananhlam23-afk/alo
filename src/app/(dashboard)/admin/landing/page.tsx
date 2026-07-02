"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type {
  LandingConfigData, NavItem, HeroFeature, SectionConfig,
  FooterGroup, FooterLink, GeoType, SectionType, ThemeConfig,
} from "@/types/landing";
import { DEFAULT_LANDING_CONFIG } from "@/lib/landing/defaults";
import { normalizeTheme, themeToCssText } from "@/lib/landing/theme";
import { ChevronUpIcon, ChevronDownIcon, TrashIcon, ExternalLinkIcon } from "@/components/ui/Icons";
import ImageInput from "@/components/ui/ImageInput";
// Icon thư viện (lucide-react) — thay toàn bộ emoji trong trang cấu hình
import {
  Palette, Menu as MenuGlyph, Sparkles, LayoutGrid, PanelBottom,
  Gift, Newspaper, Map as MapGlyph, BarChart3, Image as ImageGlyph,
  Layers, Type as TypeGlyph, CircleDot, Info, Eye, EyeOff,
  Monitor, Smartphone, RotateCw, Globe, Check, AlertTriangle, ExternalLink,
  type LucideIcon,
} from "lucide-react";

/* ── nanoid lite (no dep) ─────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);

/* ── Constants ────────────────────────────────────────────────────── */

const GEO_OPTIONS: { value: GeoType; label: string }[] = [
  { value:"ai",           label:"AI / Lộ trình" },
  { value:"payment",      label:"Thanh toán"    },
  { value:"realtime",     label:"Thời gian thực"},
  { value:"notification", label:"Thông báo"     },
];

const SECTION_TYPE_META: Record<SectionType, { label: string; Icon: LucideIcon; desc: string }> = {
  events:       { label:"Ưu đãi / Chiến dịch", Icon: Gift,      desc:"Hiển thị các PromotionEvent đang ACTIVE từ DB" },
  posts:        { label:"Bài viết / Blog",      Icon: Newspaper, desc:"Hiển thị các BlogPost đã PUBLISHED từ DB"      },
  how_it_works: { label:"Cách hoạt động",       Icon: MapGlyph,  desc:"3 bước sử dụng dịch vụ — nội dung cố định"    },
  stats:        { label:"Số liệu nổi bật",      Icon: BarChart3, desc:"Thống kê tài xế, chuyến xe (sắp ra mắt)"      },
  banner:       { label:"Banner chiến dịch",    Icon: ImageGlyph, desc:"Dải ảnh full-width cho chiến dịch — tải ảnh lên hoặc dán URL, có thể gắn link khi click. Thêm được nhiều banner." },
};

/* ── Tab types ────────────────────────────────────────────────────── */

type EditorTab = "theme" | "nav" | "hero" | "sections" | "footer";

const TABS: { id: EditorTab; label: string; Icon: LucideIcon }[] = [
  { id:"theme",    label:"Giao diện",  Icon: Palette },
  { id:"nav",      label:"Điều hướng", Icon: MenuGlyph },
  { id:"hero",     label:"Hero",       Icon: Sparkles },
  { id:"sections", label:"Sections",   Icon: LayoutGrid },
  { id:"footer",   label:"Footer",     Icon: PanelBottom },
];

/* ── Shared primitives ────────────────────────────────────────────── */

function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", color:"var(--text-secondary)", fontSize:12, fontWeight:600,
        letterSpacing:.3, marginBottom:6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ color:"var(--text-muted)", fontSize:11, marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  const style: React.CSSProperties = {
    width:"100%",padding:"9px 12px",
    background:"var(--bg-overlay)",
    border:"1px solid var(--border-subtle)",
    borderRadius:8,color:"var(--text-primary)",fontSize:13,outline:"none",
    transition:"border-color .15s",boxSizing:"border-box",
    resize: rows ? "vertical" : "none",
    fontFamily:"inherit",
  };
  if (rows) {
    return (
      <textarea
        value={value} rows={rows} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={style}
        onFocus={(e) => { e.target.style.borderColor = "var(--brand-primary)"; }}
        onBlur={(e)  => { e.target.style.borderColor = "var(--border-subtle)"; }}
      />
    );
  }
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      onFocus={(e) => { e.target.style.borderColor = "var(--brand-primary)"; }}
      onBlur={(e)  => { e.target.style.borderColor = "var(--border-subtle)"; }}
    />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <button
        type="button" onClick={() => onChange(!value)}
        style={{
          width:38, height:22, borderRadius:99, border:"none", cursor:"pointer",
          background: value ? "var(--brand-primary)" : "var(--border-subtle)",
          position:"relative", transition:"background .2s", flexShrink:0,
        }}
      >
        <span style={{
          position:"absolute", top:3, left: value ? 19 : 3,
          width:16, height:16, borderRadius:"50%",
          background:"#fff", transition:"left .2s",
        }} />
      </button>
      {label && <span style={{ fontSize:13, color: value ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>}
    </div>
  );
}

function MoveBtn({ dir, onClick, disabled }: {
  dir: "up" | "down"; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        width:26, height:26, borderRadius:6, border:"1px solid var(--border-subtle)",
        background:"var(--bg-overlay)", cursor:disabled?"not-allowed":"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
        opacity: disabled ? .4 : 1, transition:"all .15s",
      }}
    >
      {dir === "up"
        ? <ChevronUpIcon size={12} strokeWidth={2.5} />
        : <ChevronDownIcon size={12} strokeWidth={2.5} />}
    </button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width:26, height:26, borderRadius:6, border:"1px solid rgba(239,68,68,.25)",
        background:"rgba(239,68,68,.08)", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"var(--danger)", transition:"all .15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,.15)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,.08)"; }}
    >
      <TrashIcon size={12} strokeWidth={2.5} />
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
      borderRadius:14, padding:"20px 24px", ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Nav editor ───────────────────────────────────────────────────── */

function NavEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const items = config.navItems;

  const update = (id: string, patch: Partial<NavItem>) =>
    onChange({ navItems: items.map((x) => x.id === id ? { ...x, ...patch } : x) });

  const move = (id: string, dir: -1 | 1) => {
    const idx  = items.findIndex((x) => x.id === id);
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ navItems: next.map((x, i) => ({ ...x, order: i + 1 })) });
  };

  const remove = (id: string) => onChange({ navItems: items.filter((x) => x.id !== id) });

  const add = () => onChange({
    navItems: [...items, {
      id: uid(), label:"Liên kết mới", href:"#", external:false,
      visible:true, order: items.length + 1,
    }],
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <Field label="Tên thương hiệu (navbar)">
          <TextInput value={config.navBrand} onChange={(v) => onChange({ navBrand: v })} placeholder="Thuận Chuyến"/>
        </Field>
      </Card>

      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Menu điều hướng</div>
            <div style={{ color:"var(--text-muted)", fontSize:12, marginTop:2 }}>Các liên kết hiển thị trên thanh nav</div>
          </div>
          <button
            type="button" onClick={add}
            style={{
              padding:"6px 14px", borderRadius:8,
              background:"rgba(0,194,168,.14)", border:"1px solid rgba(0,194,168,.3)",
              color:"var(--brand-primary)", fontSize:12, fontWeight:600, cursor:"pointer",
            }}
          >
            + Thêm
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {items.sort((a,b)=>a.order-b.order).map((item, i) => (
            <div key={item.id} style={{
              display:"grid",
              gridTemplateColumns:"26px 1fr 1fr 80px 80px auto",
              gap:8, alignItems:"center",
              padding:"10px 12px", borderRadius:10,
              background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
            }}>
              {/* Visible toggle */}
              <Toggle value={item.visible} onChange={(v) => update(item.id, { visible: v })} />
              {/* Label */}
              <TextInput value={item.label} onChange={(v) => update(item.id, { label: v })} placeholder="Label" />
              {/* Href */}
              <TextInput value={item.href} onChange={(v) => update(item.id, { href: v })} placeholder="href hoặc #anchor" />
              {/* Badge */}
              <TextInput value={item.badge ?? ""} onChange={(v) => update(item.id, { badge: v || undefined })} placeholder="Badge?" />
              {/* External */}
              <Toggle value={item.external} onChange={(v) => update(item.id, { external: v })} label="Ngoài" />
              {/* Actions */}
              <div style={{ display:"flex", gap:4 }}>
                <MoveBtn dir="up"   onClick={() => move(item.id, -1)} disabled={i === 0} />
                <MoveBtn dir="down" onClick={() => move(item.id,  1)} disabled={i === items.length - 1} />
                <DeleteBtn onClick={() => remove(item.id)} />
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--text-muted)", fontSize:13, padding:"24px 0" }}>
              Chưa có liên kết nào. Nhấn &quot;+ Thêm&quot; để bắt đầu.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── Hero editor ──────────────────────────────────────────────────── */

function HeroEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const features = [...config.heroFeatures].sort((a,b)=>a.order-b.order);

  const updateFeature = (id: string, patch: Partial<HeroFeature>) =>
    onChange({ heroFeatures: config.heroFeatures.map((f) => f.id === id ? { ...f, ...patch } : f) });

  const moveFeature = (id: string, dir: -1 | 1) => {
    const idx  = features.findIndex((f) => f.id === id);
    const next = [...features];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ heroFeatures: next.map((f, i) => ({ ...f, order: i + 1 })) });
  };

  const addFeature = () => onChange({
    heroFeatures: [...config.heroFeatures, {
      id:uid(), geoType:"ai" as GeoType, title:"Tính năng mới", desc:"Mô tả ngắn gọn",
      visible:true, order: config.heroFeatures.length + 1,
    }],
  });

  const removeFeature = (id: string) =>
    onChange({ heroFeatures: config.heroFeatures.filter((f) => f.id !== id) });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Text content */}
      <Card>
        <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)", marginBottom:16 }}>Nội dung Hero</div>
        <Field label="Badge (dòng nhỏ đầu trang)">
          <TextInput value={config.heroBadge} onChange={(v) => onChange({ heroBadge: v })} placeholder="Thuận đường · Thuận chuyến"/>
        </Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Tiêu đề chính">
            <TextInput value={config.heroTitle} onChange={(v) => onChange({ heroTitle: v })} placeholder="Mỗi cuốc xe —"/>
          </Field>
          <Field label="Tiêu đề highlight (màu gradient)">
            <TextInput value={config.heroHighlight} onChange={(v) => onChange({ heroHighlight: v })} placeholder="một câu chuyện người"/>
          </Field>
        </div>
        <Field label="Mô tả phụ (xuống dòng = \\n)" hint="Dòng thứ 2 trở đi sẽ hiển thị màu sáng hơn">
          <TextInput value={config.heroSubtitle} onChange={(v) => onChange({ heroSubtitle: v })} rows={3}
            placeholder="Tài xế không còn trống xe về..."/>
        </Field>
      </Card>

      {/* Social proof */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Social Proof</div>
          <Toggle value={config.socialVisible} onChange={(v) => onChange({ socialVisible: v })} label="Hiển thị"/>
        </div>
        {config.socialVisible && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Tiêu đề">
              <TextInput value={config.socialTitle} onChange={(v) => onChange({ socialTitle: v })}/>
            </Field>
            <Field label="Dòng phụ">
              <TextInput value={config.socialSub} onChange={(v) => onChange({ socialSub: v })}/>
            </Field>
          </div>
        )}
      </Card>

      {/* Feature list */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Danh sách tính năng</div>
            <div style={{ color:"var(--text-muted)", fontSize:12, marginTop:2 }}>Hiển thị dọc bên trái hero panel (desktop)</div>
          </div>
          <button
            type="button" onClick={addFeature}
            style={{
              padding:"6px 14px", borderRadius:8,
              background:"rgba(0,194,168,.14)", border:"1px solid rgba(0,194,168,.3)",
              color:"var(--brand-primary)", fontSize:12, fontWeight:600, cursor:"pointer",
            }}
          >
            + Thêm
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {features.map((f, i) => (
            <div key={f.id} style={{
              padding:"14px 16px", borderRadius:12,
              background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
              display:"flex", flexDirection:"column", gap:10,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Toggle value={f.visible} onChange={(v) => updateFeature(f.id, { visible: v })} />
                <select
                  value={f.geoType}
                  onChange={(e) => updateFeature(f.id, { geoType: e.target.value as GeoType })}
                  style={{
                    padding:"6px 10px", borderRadius:7, fontSize:12,
                    background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
                    color:"var(--text-primary)", cursor:"pointer",
                  }}
                >
                  {GEO_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                  <MoveBtn dir="up"   onClick={() => moveFeature(f.id, -1)} disabled={i === 0} />
                  <MoveBtn dir="down" onClick={() => moveFeature(f.id,  1)} disabled={i === features.length - 1} />
                  <DeleteBtn onClick={() => removeFeature(f.id)} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10 }}>
                <TextInput value={f.title} onChange={(v) => updateFeature(f.id, { title: v })} placeholder="Tiêu đề"/>
                <TextInput value={f.desc}  onChange={(v) => updateFeature(f.id, { desc:  v })} placeholder="Mô tả ngắn"/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Sections editor ──────────────────────────────────────────────── */

function SectionsEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const sections = [...config.sections].sort((a,b) => a.order - b.order);
  const [expanded, setExpanded] = useState<string | null>(null);

  const update = (id: string, patch: Partial<SectionConfig>) =>
    onChange({ sections: config.sections.map((s) => s.id === id ? { ...s, ...patch } : s) });

  const move = (id: string, dir: -1 | 1) => {
    const idx  = sections.findIndex((s) => s.id === id);
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ sections: next.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  const remove = (id: string) => onChange({ sections: config.sections.filter((s) => s.id !== id) });

  const addSection = (type: SectionType) => {
    const meta = SECTION_TYPE_META[type];
    if (type === "banner") {
      onChange({
        sections: [...config.sections, {
          id: uid(), type, visible:true, order: config.sections.length + 1,
          title:"", subtitle:"", limit:1, imageUrl:"", ctaHref:"",
        }],
      });
      return;
    }
    onChange({
      sections: [...config.sections, {
        id: uid(), type, visible:true, order: config.sections.length + 1,
        title: meta.label, subtitle: "Mô tả ngắn cho section này",
        limit: type === "events" ? 4 : type === "posts" ? 6 : 3,
        ctaLabel: type === "how_it_works" ? undefined : "Xem thêm",
        ctaHref:  type === "how_it_works" ? undefined : "#",
      }],
    });
  };

  // Banner cho phép thêm NHIỀU lần; các section khác chỉ 1.
  const usedTypes = new Set(sections.map((s) => s.type));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Existing sections */}
      {sections.map((section, i) => {
        const meta = SECTION_TYPE_META[section.type];
        const isExpanded = expanded === section.id;
        return (
          <Card key={section.id} style={{ padding:0, overflow:"hidden" }}>
            {/* Header row */}
            <div
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"14px 18px", cursor:"pointer",
                borderBottom: isExpanded ? "1px solid var(--border-subtle)" : "none",
              }}
              onClick={() => setExpanded(isExpanded ? null : section.id)}
            >
              <meta.Icon size={19} style={{ flexShrink:0, color:"var(--brand-primary)" }} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)" }}>{meta.label}</span>
                  {!section.visible && (
                    <span style={{
                      fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:99,
                      background:"rgba(239,68,68,.1)", color:"var(--danger)",
                      border:"1px solid rgba(239,68,68,.2)",
                    }}>Ẩn</span>
                  )}
                </div>
                <div style={{ color:"var(--text-muted)", fontSize:11, marginTop:1 }}>
                  {section.type === "banner"
                    ? (section.title || (section.imageUrl ? "Đã đặt ảnh" : "Chưa đặt ảnh"))
                    : section.title}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()} style={{ display:"flex", gap:6, alignItems:"center" }}>
                <Toggle value={section.visible} onChange={(v) => update(section.id, { visible: v })} />
                <MoveBtn dir="up"   onClick={() => move(section.id, -1)} disabled={i === 0} />
                <MoveBtn dir="down" onClick={() => move(section.id,  1)} disabled={i === sections.length - 1} />
                <DeleteBtn onClick={() => remove(section.id)} />
              </div>
              <ChevronDownIcon
                size={16} strokeWidth={2.5} color="var(--text-muted)"
                style={{ transition:"transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
              />
            </div>

            {/* Expanded config */}
            {isExpanded && (
              <div style={{ padding:"18px 18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{
                  padding:"8px 12px", borderRadius:8,
                  background:"rgba(0,194,168,.08)", border:"1px solid rgba(0,194,168,.14)",
                  color:"var(--text-secondary)", fontSize:12,
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <Info size={13} style={{ flexShrink:0 }} /> {meta.desc}
                </div>
                {section.type === "banner" ? (
                  <>
                    <Field label="Ảnh banner">
                      <ImageInput value={section.imageUrl ?? ""} onChange={(url) => update(section.id, { imageUrl: url })} previewHeight={140} />
                    </Field>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Link khi click (tuỳ chọn)">
                        <TextInput value={section.ctaHref ?? ""} onChange={(v) => update(section.id, { ctaHref: v || undefined })} placeholder="/khuyen-mai hoặc https://…"/>
                      </Field>
                      <Field label="Chú thích (tuỳ chọn — đè lên ảnh)">
                        <TextInput value={section.title} onChange={(v) => update(section.id, { title: v })} placeholder="VD: Ưu đãi hè 2026"/>
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Field label="Tiêu đề section">
                        <TextInput value={section.title} onChange={(v) => update(section.id, { title: v })}/>
                      </Field>
                      <Field label="Dòng phụ (subtitle)">
                        <TextInput value={section.subtitle} onChange={(v) => update(section.id, { subtitle: v })}/>
                      </Field>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr", gap:12 }}>
                      <Field label="Số lượng hiển thị">
                        <input
                          type="number" min={1} max={20} value={section.limit ?? 4}
                          onChange={(e) => update(section.id, { limit: Number(e.target.value) })}
                          style={{
                            width:"100%", padding:"9px 12px",
                            background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                            borderRadius:8, color:"var(--text-primary)", fontSize:13, outline:"none",
                          }}
                        />
                      </Field>
                      {section.type !== "how_it_works" && (
                        <>
                          <Field label="CTA label">
                            <TextInput value={section.ctaLabel ?? ""} onChange={(v) => update(section.id, { ctaLabel: v || undefined })} placeholder="Xem thêm"/>
                          </Field>
                          <Field label="CTA href">
                            <TextInput value={section.ctaHref ?? ""} onChange={(v) => update(section.id, { ctaHref: v || undefined })} placeholder="/blog"/>
                          </Field>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Add section */}
      <Card>
        <div style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)", marginBottom:12 }}>Thêm section mới</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(Object.keys(SECTION_TYPE_META) as SectionType[]).map((type) => {
            const meta = SECTION_TYPE_META[type];
            const used = type !== "banner" && usedTypes.has(type);
            return (
              <button
                key={type} type="button"
                onClick={() => !used && addSection(type)}
                disabled={used}
                style={{
                  padding:"8px 14px", borderRadius:10, cursor: used ? "not-allowed" : "pointer",
                  background: used ? "var(--bg-overlay)" : "rgba(0,194,168,.1)",
                  border:`1px solid ${used ? "var(--border-subtle)" : "rgba(0,194,168,.3)"}`,
                  color: used ? "var(--text-muted)" : "var(--brand-primary)",
                  fontSize:12, fontWeight:600, opacity: used ? .5 : 1,
                  display:"flex", alignItems:"center", gap:6,
                }}
              >
                <meta.Icon size={15} style={{ flexShrink:0 }} />
                {meta.label}
                {used && <span style={{ fontSize:10 }}>(đã có)</span>}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ── Footer editor ────────────────────────────────────────────────── */

function FooterEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const groups = config.footerGroups;

  const updateGroup = (id: string, patch: Partial<FooterGroup>) =>
    onChange({ footerGroups: groups.map((g) => g.id === id ? { ...g, ...patch } : g) });

  const removeGroup = (id: string) =>
    onChange({ footerGroups: groups.filter((g) => g.id !== id) });

  const addGroup = () => onChange({
    footerGroups: [...groups, { id:uid(), label:"Nhóm mới", links:[] }],
  });

  const updateLink = (gid: string, lid: string, patch: Partial<FooterLink>) =>
    onChange({
      footerGroups: groups.map((g) =>
        g.id === gid
          ? { ...g, links: g.links.map((l) => l.id === lid ? { ...l, ...patch } : l) }
          : g
      ),
    });

  const removeLink = (gid: string, lid: string) =>
    onChange({
      footerGroups: groups.map((g) =>
        g.id === gid ? { ...g, links: g.links.filter((l) => l.id !== lid) } : g
      ),
    });

  const addLink = (gid: string) =>
    onChange({
      footerGroups: groups.map((g) =>
        g.id === gid
          ? { ...g, links: [...g.links, { id:uid(), label:"Liên kết", href:"#", external:false }] }
          : g
      ),
    });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <Field label="Dòng bản quyền (copyright)">
          <TextInput value={config.footerCopy} onChange={(v) => onChange({ footerCopy: v })}
            placeholder="© 2025 Thuận Chuyến..."/>
        </Field>
      </Card>

      {groups.map((group) => (
        <Card key={group.id}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <TextInput value={group.label} onChange={(v) => updateGroup(group.id, { label: v })} placeholder="Tên nhóm"/>
            <button
              type="button" onClick={() => addLink(group.id)}
              style={{
                padding:"7px 12px", borderRadius:8, whiteSpace:"nowrap",
                background:"rgba(0,194,168,.12)", border:"1px solid rgba(0,194,168,.25)",
                color:"var(--brand-primary)", fontSize:12, fontWeight:600, cursor:"pointer",
              }}
            >+ Link</button>
            <DeleteBtn onClick={() => removeGroup(group.id)} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {group.links.map((link) => (
              <div key={link.id} style={{
                display:"grid", gridTemplateColumns:"1fr 1fr 80px auto",
                gap:8, alignItems:"center",
                padding:"8px 10px", borderRadius:8,
                background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
              }}>
                <TextInput value={link.label} onChange={(v) => updateLink(group.id, link.id, { label: v })} placeholder="Label"/>
                <TextInput value={link.href}  onChange={(v) => updateLink(group.id, link.id, { href: v })}  placeholder="href"/>
                <Toggle value={link.external ?? false} onChange={(v) => updateLink(group.id, link.id, { external: v })} label="Ngoài"/>
                <DeleteBtn onClick={() => removeLink(group.id, link.id)} />
              </div>
            ))}
            {group.links.length === 0 && (
              <div style={{ color:"var(--text-muted)", fontSize:12, textAlign:"center", padding:"8px 0" }}>
                Chưa có liên kết
              </div>
            )}
          </div>
        </Card>
      ))}

      <button
        type="button" onClick={addGroup}
        style={{
          padding:"10px", borderRadius:10, cursor:"pointer",
          background:"rgba(0,194,168,.08)", border:"1px dashed rgba(0,194,168,.3)",
          color:"var(--brand-primary)", fontSize:13, fontWeight:600,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        }}
      >
        + Thêm nhóm footer
      </button>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

/* ── Theme editor ─────────────────────────────────────────────────── */

function SectionTitle({ Icon, children }: { Icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700, fontSize:14, color:"var(--text-primary)", marginBottom:14 }}>
      {Icon && <Icon size={16} style={{ color:"var(--brand-primary)", flexShrink:0 }} />}
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
      <input
        type="color" value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width:34, height:30, border:"1px solid var(--border-subtle)", borderRadius:8,
          background:"none", cursor:"pointer", padding:2, flexShrink:0 }}
      />
      <span style={{ flex:1, minWidth:0, fontSize:12.5, color:"var(--text-secondary)", fontWeight:500 }}>{label}</span>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
        style={{ width:92, padding:"6px 8px", fontFamily:"monospace", fontSize:12,
          background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
          borderRadius:7, color:"var(--text-primary)", outline:"none", textAlign:"center" }}
      />
    </div>
  );
}

function RangeRow({ label, value, min, max, suffix, onChange }: {
  label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}${suffix}`}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width:"100%", accentColor:"var(--brand-primary)", cursor:"pointer" }}
      />
    </Field>
  );
}

function ThemeEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const t = config.theme;
  const set = (patch: Partial<ThemeConfig>) => onChange({ theme: { ...t, ...patch } });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <SectionTitle Icon={Palette}>Màu thương hiệu</SectionTitle>
        <ColorRow label="Chính (primary)"        value={t.brandPrimary}     onChange={(v) => set({ brandPrimary: v })} />
        <ColorRow label="Chính đậm (gradient)"   value={t.brandPrimaryDark} onChange={(v) => set({ brandPrimaryDark: v })} />
        <ColorRow label="Sáng (link / icon)"     value={t.brandLight}       onChange={(v) => set({ brandLight: v })} />
        <ColorRow label="Phụ (cyan)"             value={t.brandSecondary}   onChange={(v) => set({ brandSecondary: v })} />
        <ColorRow label="Tím"                    value={t.brandViolet}      onChange={(v) => set({ brandViolet: v })} />
        <ColorRow label="Hồng"                   value={t.brandPink}        onChange={(v) => set({ brandPink: v })} />
        <ColorRow label="Lục"                    value={t.brandEmerald}     onChange={(v) => set({ brandEmerald: v })} />
        <ColorRow label="Hổ phách"               value={t.brandAmber}       onChange={(v) => set({ brandAmber: v })} />
      </Card>

      <Card>
        <SectionTitle Icon={Layers}>Nền (surfaces)</SectionTitle>
        <ColorRow label="Nền trang"      value={t.bgBase}     onChange={(v) => set({ bgBase: v })} />
        <ColorRow label="Nền dưới fold"  value={t.bgDeep}     onChange={(v) => set({ bgDeep: v })} />
        <ColorRow label="Thẻ (card)"     value={t.bgSurface}  onChange={(v) => set({ bgSurface: v })} />
        <ColorRow label="Ô nhập / chip"  value={t.bgOverlay}  onChange={(v) => set({ bgOverlay: v })} />
        <ColorRow label="Nổi (elevated)" value={t.bgElevated} onChange={(v) => set({ bgElevated: v })} />
      </Card>

      <Card>
        <SectionTitle Icon={TypeGlyph}>Chữ & viền</SectionTitle>
        <ColorRow label="Chữ chính" value={t.textPrimary}   onChange={(v) => set({ textPrimary: v })} />
        <ColorRow label="Chữ phụ"   value={t.textSecondary} onChange={(v) => set({ textSecondary: v })} />
        <ColorRow label="Chữ mờ"    value={t.textMuted}     onChange={(v) => set({ textMuted: v })} />
        <ColorRow label="Viền"      value={t.borderColor}   onChange={(v) => set({ borderColor: v })} />
      </Card>

      <Card>
        <SectionTitle Icon={CircleDot}>Trạng thái</SectionTitle>
        <ColorRow label="Thành công"    value={t.success} onChange={(v) => set({ success: v })} />
        <ColorRow label="Lỗi / nguy hiểm" value={t.danger}  onChange={(v) => set({ danger: v })} />
        <ColorRow label="Cảnh báo"      value={t.warning} onChange={(v) => set({ warning: v })} />
        <ColorRow label="Thông tin"     value={t.info}    onChange={(v) => set({ info: v })} />
      </Card>

      <Card>
        <SectionTitle Icon={Sparkles}>Gradient & bo góc</SectionTitle>
        <ColorRow label="Gradient từ"  value={t.gradFrom} onChange={(v) => set({ gradFrom: v })} />
        <ColorRow label="Gradient đến" value={t.gradTo}   onChange={(v) => set({ gradTo: v })} />
        <RangeRow label="Góc gradient" value={t.gradAngle} min={0} max={360} suffix="°"  onChange={(v) => set({ gradAngle: v })} />
        <RangeRow label="Bo góc"       value={t.radius}    min={0} max={28}  suffix="px" onChange={(v) => set({ radius: v })} />
        <div style={{
          height:44, borderRadius:t.radius, marginTop:6,
          background:`linear-gradient(${t.gradAngle}deg, ${t.gradFrom}, ${t.gradTo})`,
          boxShadow:"inset 0 0 0 1px rgba(255,255,255,.08)",
        }} />
      </Card>
    </div>
  );
}

/* ── Live preview (iframe of /login with instant theme sync) ──────── */

function LivePreview({ theme }: { theme: ThemeConfig }) {
  const ref     = useRef<HTMLIFrameElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [device,    setDevice]    = useState<"desktop" | "mobile">("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [box,       setBox]       = useState({ w: 0, h: 0 });

  const push = useCallback(() => {
    ref.current?.contentWindow?.postMessage(
      { type: "tc-theme", css: themeToCssText(theme) },
      "*",
    );
  }, [theme]);

  // Re-skin the preview live whenever a token changes — no reload
  useEffect(() => { push(); }, [push]);

  // Push again when the iframe announces it's ready (load / reload)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "tc-preview-ready") push();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [push]);

  // Đo vùng preview để scale iframe LẤP ĐẦY khung (hết viền đen thừa).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const PAD    = 16;
  const availW = Math.max(0, box.w - PAD * 2);
  const availH = Math.max(0, box.h - PAD * 2);
  const isMobile = device === "mobile";
  const frameW = isMobile ? 390 : 1280;
  const phoneH = 812;
  // Desktop: scale vừa bề ngang → cao lấp đầy, cuộn nội dung ngay trong iframe.
  // Mobile: khung điện thoại canh giữa, scale vừa chiều cao.
  const scale = isMobile
    ? (availH > 0 ? Math.min(availH / phoneH, (availW || 320) / frameW, 1) : 0.85)
    : (availW > 0 ? availW / frameW : 0.5);
  const frameH = isMobile ? phoneH : (availH > 0 && scale > 0 ? Math.ceil(availH / scale) : 900);
  const boxW = Math.round(frameW * scale);
  const boxH = Math.round(frameH * scale);

  return (
    <Card style={{ padding:0, overflow:"hidden", display:"flex", flexDirection:"column", height:"100%", minHeight:0 }}>
      <div style={{
        display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
        borderBottom:"1px solid var(--border-subtle)", flexShrink:0,
      }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, color:"var(--text-primary)" }}><Eye size={14} /> Xem trước trực tiếp</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d} type="button" onClick={() => setDevice(d)}
              style={{
                padding:"4px 10px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer",
                border:"1px solid var(--border-subtle)",
                background: device === d ? "rgba(0,194,168,.16)" : "transparent",
                color: device === d ? "var(--brand-primary)" : "var(--text-muted)",
              }}
            >
              {d === "desktop"
                ? <><Monitor size={12} style={{ verticalAlign:"-2px", marginRight:5 }} />Desktop</>
                : <><Smartphone size={12} style={{ verticalAlign:"-2px", marginRight:5 }} />Mobile</>}
            </button>
          ))}
          <button
            type="button" onClick={() => setReloadKey((k) => k + 1)}
            title="Tải lại để xem thay đổi nội dung đã lưu"
            style={{
              padding:"4px 10px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer",
              border:"1px solid var(--border-subtle)", background:"transparent", color:"var(--text-muted)",
            }}
          >
            <RotateCw size={12} style={{ verticalAlign:"-2px", marginRight:5 }} />Tải lại
          </button>
        </div>
      </div>
      <div ref={bodyRef} style={{
        flex:1, minHeight:0, background:"var(--bg-base)", padding:PAD,
        display:"flex", alignItems: isMobile ? "center" : "flex-start", justifyContent:"center",
        overflow:"hidden",
      }}>
        <div style={{
          width:boxW, height:boxH, flexShrink:0, overflow:"hidden",
          borderRadius: isMobile ? 24 : 10,
          border:"1px solid var(--border-subtle)",
          boxShadow: isMobile ? "0 12px 40px rgba(0,0,0,.35)" : "0 6px 22px rgba(0,0,0,.22)",
          background:"#fff",
        }}>
          {boxW > 0 && (
            <iframe
              key={reloadKey}
              ref={ref}
              src="/login?preview=1"
              onLoad={push}
              title="Xem trước trang chủ"
              style={{
                width:frameW, height:frameH, border:"none", display:"block",
                transform:`scale(${scale})`, transformOrigin:"top left",
              }}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

export default function LandingAdminPage() {
  const [config,    setConfig]    = useState<LandingConfigData | null>(null);
  const [original,  setOriginal]  = useState<string>("");
  const [activeTab,   setActiveTab]   = useState<EditorTab>("theme");
  const [saving,      setSaving]      = useState(false);
  const [savedAt,     setSavedAt]     = useState<Date | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const isDirty = config ? JSON.stringify(config) !== original : false;

  /* Load */
  useEffect(() => {
    fetch("/api/v1/admin/landing-config")
      .then((r) => r.json())
      .then((d) => {
        const cfg = { ...DEFAULT_LANDING_CONFIG, ...(d.data?.config ?? {}) };
        cfg.theme = normalizeTheme(cfg.theme);
        setConfig(cfg);
        setOriginal(JSON.stringify(cfg));
      })
      .catch(() => {
        setConfig(DEFAULT_LANDING_CONFIG);
        setOriginal(JSON.stringify(DEFAULT_LANDING_CONFIG));
      });
  }, []);

  const handleChange = useCallback((patch: Partial<LandingConfigData>) => {
    setConfig((prev) => prev ? { ...prev, ...patch } : prev);
    setError(null);
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(null);
    try {
      const res  = await fetch("/api/v1/admin/landing-config", {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Lỗi khi lưu");
      setOriginal(JSON.stringify(config));
      setSavedAt(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm("Reset về mặc định? Mọi thay đổi chưa lưu sẽ mất.")) return;
    setConfig(DEFAULT_LANDING_CONFIG);
  };

  if (!config) return (
    <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:"3px solid rgba(0,194,168,.16)", borderTopColor:"var(--brand-primary)",
        animation:"spin .8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* ── Page header ────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        flexWrap:"wrap", gap:12, marginBottom:28,
      }}>
        <div>
          <h1 style={{ display:"flex", alignItems:"center", gap:9, fontSize:22, fontWeight:800, color:"var(--text-primary)", marginBottom:4 }}>
            <Globe size={22} style={{ color:"var(--brand-primary)", flexShrink:0 }} /> Cấu hình Trang chủ
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:13 }}>
            Quản lý nội dung, menu, sections và footer — không cần code, lưu là cập nhật ngay.
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {savedAt && !isDirty && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"var(--success)" }}>
              <Check size={13} /> Đã lưu lúc {savedAt.toLocaleTimeString("vi-VN")}
            </span>
          )}
          {isDirty && (
            <span style={{
              fontSize:11, padding:"3px 10px", borderRadius:99,
              background:"rgba(251,191,36,.12)", border:"1px solid rgba(251,191,36,.25)",
              color:"var(--brand-amber)", fontWeight:600,
            }}>
              Chưa lưu
            </span>
          )}
          <button
            type="button" onClick={reset}
            style={{
              padding:"7px 14px", borderRadius:8, cursor:"pointer",
              background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
              color:"var(--text-muted)", fontSize:12,
            }}
          >
            Reset mặc định
          </button>
          <button
            type="button" onClick={() => setShowPreview((v) => !v)}
            style={{
              padding:"7px 14px", borderRadius:8, cursor:"pointer",
              background: showPreview ? "rgba(0,194,168,.12)" : "var(--bg-overlay)",
              border:`1px solid ${showPreview ? "rgba(0,194,168,.25)" : "var(--border-subtle)"}`,
              color: showPreview ? "var(--brand-primary)" : "var(--text-muted)", fontSize:12, fontWeight:600,
              display:"inline-flex", alignItems:"center", gap:5,
            }}
          >
            {showPreview
              ? <><EyeOff size={13} />Ẩn preview</>
              : <><Eye size={13} />Hiện preview</>}
          </button>
          <a
            href="/login" target="_blank" rel="noopener"
            style={{
              padding:"7px 14px", borderRadius:8,
              background:"rgba(0,194,168,.12)", border:"1px solid rgba(0,194,168,.25)",
              color:"var(--brand-primary)", fontSize:12, fontWeight:600, textDecoration:"none",
              display:"flex", alignItems:"center", gap:5,
            }}
          >
            <ExternalLink size={13} /> Mở tab mới
            <ExternalLinkIcon size={10} strokeWidth={2.5} />
          </a>
          <button
            type="button" onClick={save} disabled={saving || !isDirty}
            style={{
              padding:"8px 20px", borderRadius:10,
              background: (saving || !isDirty) ? "var(--bg-overlay)" : "var(--grad-primary)",
              border:"none", color: (saving || !isDirty) ? "var(--text-muted)" : "#fff",
              fontSize:13, fontWeight:600, cursor: (saving || !isDirty) ? "not-allowed" : "pointer",
              opacity: !isDirty && !saving ? .5 : 1,
              boxShadow: isDirty ? "0 4px 16px rgba(0,194,168,.32)" : "none",
              transition:"all .2s",
            }}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding:"12px 16px", borderRadius:10, marginBottom:20,
          background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.22)",
          color:"var(--danger)", fontSize:13,
          display:"flex", alignItems:"center", gap:7,
        }}>
          <AlertTriangle size={15} style={{ flexShrink:0 }} /> {error}
        </div>
      )}

      {/* ── Tab bar ────────────────────────────────────── */}
      <div style={{
        display:"flex", gap:2, background:"var(--bg-surface)",
        border:"1px solid var(--border-subtle)",
        borderRadius:12, padding:4, marginBottom:24, width:"fit-content",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id} type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding:"8px 20px", borderRadius:9, border:"none", cursor:"pointer",
              background: activeTab === tab.id ? "rgba(0,194,168,.16)" : "transparent",
              color: activeTab === tab.id ? "var(--brand-primary)" : "var(--text-muted)",
              fontSize:13, fontWeight: activeTab === tab.id ? 700 : 400,
              display:"flex", alignItems:"center", gap:6,
              transition:"all .15s",
            }}
          >
            <tab.Icon size={15} style={{ flexShrink:0, verticalAlign:"-2px", marginRight:6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Editor panes + live preview ────────────────── */}
      <div className="landing-editor-row" style={{
        display:"flex", gap:20, alignItems:"stretch",
        ...(showPreview ? { height:"calc(100vh - 200px)", minHeight:480 } : {}),
      }}>
        <div className="landing-editor-pane" style={{
          flex: showPreview ? "0 0 440px" : "1 1 auto",
          width: showPreview ? 440 : "100%", maxWidth:"100%", minWidth:0,
          ...(showPreview ? { overflowY:"auto", overflowX:"hidden", paddingRight:6 } : {}),
        }}>
          {activeTab === "theme"    && <ThemeEditor    config={config} onChange={handleChange} />}
          {activeTab === "nav"      && <NavEditor      config={config} onChange={handleChange} />}
          {activeTab === "hero"     && <HeroEditor     config={config} onChange={handleChange} />}
          {activeTab === "sections" && <SectionsEditor config={config} onChange={handleChange} />}
          {activeTab === "footer"   && <FooterEditor   config={config} onChange={handleChange} />}
        </div>
        {showPreview && (
          <div className="landing-preview-pane" style={{ flex:"1 1 auto", minWidth:0, height:"100%" }}>
            <LivePreview theme={config.theme} />
          </div>
        )}
      </div>

      <style>{`
        /* Trên màn hẹp: xếp dọc, bỏ chiều cao cố định để không kẹt cuộn */
        @media (max-width: 900px) {
          .landing-editor-row { flex-direction: column; height: auto !important; }
          .landing-editor-pane { flex: 1 1 auto !important; width: 100% !important; overflow: visible !important; padding-right: 0 !important; }
          .landing-preview-pane { height: 70vh !important; }
        }
      `}</style>
    </div>
  );
}

export type NavItem = {
  id: string;
  label: string;
  href: string;
  badge?: string;
  external: boolean;
  visible: boolean;
  order: number;
};

export type GeoType = "ai" | "payment" | "realtime" | "notification";

export type HeroFeature = {
  id: string;
  geoType: GeoType;
  title: string;
  desc: string;
  visible: boolean;
  order: number;
};

export type SectionType = "events" | "posts" | "how_it_works" | "stats" | "banner";

export type SectionConfig = {
  id: string;
  type: SectionType;
  visible: boolean;
  order: number;
  title: string;
  subtitle: string;
  limit: number;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string; // dùng cho section "banner" (ảnh chiến dịch)
};

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export type FooterGroup = {
  id: string;
  label: string;
  links: FooterLink[];
};

/* ── Theme / design tokens ────────────────────────────────────────────
 * Every value maps to a CSS variable consumed by the landing components.
 * Editing one token re-skins the whole page (see lib/landing/theme.ts). */
export type ThemeConfig = {
  // Brand palette
  brandPrimary: string;      // main accent
  brandPrimaryDark: string;  // gradient end / pressed state
  brandLight: string;        // lighter accent (links, icons)
  brandSecondary: string;    // cyan accent
  brandViolet: string;
  brandPink: string;
  brandEmerald: string;
  brandAmber: string;
  // Surfaces (dark→light)
  bgBase: string;            // page background
  bgDeep: string;            // below-fold backdrop
  bgSurface: string;         // cards
  bgOverlay: string;         // inputs / chips
  bgElevated: string;        // hovered surfaces
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Lines
  borderColor: string;       // solid hairline color (alpha variants derived)
  // Status
  success: string;
  danger: string;
  warning: string;
  info: string;
  // Hero / button / text gradient
  gradFrom: string;
  gradTo: string;
  gradAngle: number;         // degrees
  // Shape
  radius: number;            // base corner radius (px); lg/xl derived
};

export type LandingConfigData = {
  theme: ThemeConfig;
  navBrand: string;
  navItems: NavItem[];
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroFeatures: HeroFeature[];
  socialVisible: boolean;
  socialTitle: string;
  socialSub: string;
  sections: SectionConfig[];
  footerGroups: FooterGroup[];
  footerCopy: string;
};

/* Serialisable shape returned by the API / passed as props */
export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  readTime: number;
  publishedAt: Date | null;
};

export type EventSummary = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  type: string;
  startsAt: Date;
  endsAt: Date;
};

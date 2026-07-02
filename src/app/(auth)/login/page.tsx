import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_LANDING_CONFIG } from "@/lib/landing/defaults";
import type { LandingConfigData, BlogPostSummary, EventSummary, SectionConfig } from "@/types/landing";
import { normalizeTheme } from "@/lib/landing/theme";
import LoginForm from "./_LoginForm";
import LandingNav from "./_LandingNav";
import BelowFold from "./_BelowFold";
import ThemeStyle from "./_ThemeStyle";

export const revalidate = 60; // ISR — rebuild every 60 s, or on admin save

export const metadata: Metadata = {
  title: "Đăng nhập | Thuận Chuyến",
  description:
    "Đăng nhập vào Thuận Chuyến — nền tảng ghép xe liên tỉnh thông minh, tiết kiệm chi phí, đi lại an toàn và minh bạch.",
};

/* ── helpers ─────────────────────────────────────────────────────── */

async function getLandingConfig(): Promise<LandingConfigData> {
  try {
    const row = await prisma.landingConfig.upsert({
      where: { key: "main" },
      create: {
        key:           "main",
        navBrand:      DEFAULT_LANDING_CONFIG.navBrand,
        navItems:      DEFAULT_LANDING_CONFIG.navItems,
        heroBadge:     DEFAULT_LANDING_CONFIG.heroBadge,
        heroTitle:     DEFAULT_LANDING_CONFIG.heroTitle,
        heroHighlight: DEFAULT_LANDING_CONFIG.heroHighlight,
        heroSubtitle:  DEFAULT_LANDING_CONFIG.heroSubtitle,
        heroFeatures:  DEFAULT_LANDING_CONFIG.heroFeatures,
        socialVisible: DEFAULT_LANDING_CONFIG.socialVisible,
        socialTitle:   DEFAULT_LANDING_CONFIG.socialTitle,
        socialSub:     DEFAULT_LANDING_CONFIG.socialSub,
        sections:      DEFAULT_LANDING_CONFIG.sections,
        footerGroups:  DEFAULT_LANDING_CONFIG.footerGroups,
        footerCopy:    DEFAULT_LANDING_CONFIG.footerCopy,
      },
      update: {},
    });

    return {
      theme:         normalizeTheme((row as { theme?: unknown }).theme),
      navBrand:      row.navBrand,
      navItems:      row.navItems as LandingConfigData["navItems"],
      heroBadge:     row.heroBadge,
      heroTitle:     row.heroTitle,
      heroHighlight: row.heroHighlight,
      heroSubtitle:  row.heroSubtitle,
      heroFeatures:  row.heroFeatures as LandingConfigData["heroFeatures"],
      socialVisible: row.socialVisible,
      socialTitle:   row.socialTitle,
      socialSub:     row.socialSub,
      sections:      row.sections as LandingConfigData["sections"],
      footerGroups:  row.footerGroups as LandingConfigData["footerGroups"],
      footerCopy:    row.footerCopy,
    };
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}

async function getDynamicContent(sections: SectionConfig[]) {
  const now = new Date();
  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const needsEvents = visibleSections.some((s) => s.type === "events");
  const needsPosts  = visibleSections.some((s) => s.type === "posts");

  const eventsSection = visibleSections.find((s) => s.type === "events");
  const postsSection  = visibleSections.find((s) => s.type === "posts");

  // blogPost may not exist on the Prisma singleton if the server hasn't been
  // restarted since the BlogPost model was added — guard and return empty list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasBlogPost = typeof (prisma as any).blogPost?.findMany === "function";

  try {
    const [posts, events] = await Promise.all([
      needsPosts && hasBlogPost
        ? prisma.blogPost.findMany({
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            take: postsSection?.limit ?? 6,
            select: {
              id: true, slug: true, title: true, summary: true,
              coverImage: true, category: true, tags: true,
              readTime: true, publishedAt: true,
            },
          })
        : ([] as BlogPostSummary[]),

      needsEvents
        ? prisma.promotionEvent.findMany({
            where: {
              status: "ACTIVE",
              startsAt: { lte: now },
              endsAt:   { gte: now },
            },
            orderBy: { startsAt: "asc" },
            take: eventsSection?.limit ?? 4,
            select: {
              id: true, name: true, description: true,
              imageUrl: true, type: true, startsAt: true, endsAt: true,
            },
          })
        : ([] as EventSummary[]),
    ]);

    return { posts, events };
  } catch {
    return { posts: [] as BlogPostSummary[], events: [] as EventSummary[] };
  }
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const config = await getLandingConfig();
  const { posts, events } = await getDynamicContent(config.sections);

  const preview = searchParams?.preview === "1";

  const visibleSections = config.sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Theme tokens (CSS variables) — re-skins the page; live-updates in preview */}
      <ThemeStyle theme={config.theme} preview={preview} />

      {/* Sticky nav — rendered outside the hero viewport unit */}
      <LandingNav
        brand={config.navBrand}
        items={config.navItems.filter((i) => i.visible).sort((a, b) => a.order - b.order)}
      />

      {/* Hero + login form (above the fold) */}
      <LoginForm config={config} />

      {/* Below-fold content sections */}
      {visibleSections.length > 0 && (
        <BelowFold
          sections={visibleSections}
          posts={posts as BlogPostSummary[]}
          events={events as EventSummary[]}
          footerGroups={config.footerGroups}
          footerCopy={config.footerCopy}
        />
      )}
    </>
  );
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_LANDING_CONFIG } from "@/lib/landing/defaults";
import type { LandingConfigData } from "@/types/landing";
import { revalidatePath } from "next/cache";

const LandingConfigSchema = z
  .object({
    theme: z.any().optional(),
    navBrand: z.string().optional(),
    navItems: z.any().optional(),
    heroBadge: z.string().optional(),
    heroTitle: z.string().optional(),
    heroHighlight: z.string().optional(),
    heroSubtitle: z.string().optional(),
    heroFeatures: z.any().optional(),
    socialVisible: z.boolean().optional(),
    socialTitle: z.string().optional(),
    socialSub: z.string().optional(),
    sections: z.any().optional(),
    footerGroups: z.any().optional(),
    footerCopy: z.string().optional(),
  });
  // KHÔNG dùng .strict(): client gửi lại cả bản ghi DB (id/key/updatedBy/updatedAt/
  // createdAt…); zod mặc định tự loại key thừa, và vòng allowlist bên dưới mới quyết
  // định key nào được ghi. Dùng .strict() sẽ chặn nhầm và làm admin không lưu được.

async function getOrCreateConfig() {
  return prisma.landingConfig.upsert({
    where: { key: "main" },
    create: {
      key: "main",
      theme:         DEFAULT_LANDING_CONFIG.theme,
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
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const config = await getOrCreateConfig();
  return ok({ config });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const parsed = LandingConfigSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);
  const body: Partial<LandingConfigData> = parsed.data;

  const allowed: (keyof LandingConfigData)[] = [
    "theme",
    "navBrand", "navItems",
    "heroBadge", "heroTitle", "heroHighlight", "heroSubtitle", "heroFeatures",
    "socialVisible", "socialTitle", "socialSub",
    "sections",
    "footerGroups", "footerCopy",
  ];

  const update: Record<string, unknown> = { updatedBy: auth.payload.userId };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const config = await prisma.landingConfig.upsert({
    where:  { key: "main" },
    create: {
      key: "main",
      ...update,
    },
    update,
  });

  // Bust the Next.js cache so the login page revalidates immediately
  revalidatePath("/login");

  return ok({ config });
}

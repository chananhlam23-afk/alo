import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateBannerSchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

const BannersQuerySchema = z.object({
  position: z.enum(["HOME_TOP", "HOME_BOTTOM", "TRIP_LISTING", "BOOKING_CONFIRM"]).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const parsed = BannersQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const position = parsed.data.position;
  const activeOnly = parsed.data.active === "true";

  const where: Record<string, unknown> = {};
  if (position) where.position = position;
  if (activeOnly) where.active = true;

  const banners = await prisma.banner.findMany({
    where,
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return ok({ banners });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateBannerSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  if (parsed.data.expiresAt && parsed.data.startsAt) {
    if (new Date(parsed.data.expiresAt) <= new Date(parsed.data.startsAt)) {
      return Errors.validation("Ngày hết hạn phải sau ngày bắt đầu");
    }
  }

  const banner = await prisma.banner.create({
    data: {
      ...parsed.data,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      createdBy: auth.payload.userId,
    },
  });

  return created({ banner });
}

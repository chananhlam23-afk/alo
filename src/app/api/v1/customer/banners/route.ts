import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

const BannersQuerySchema = z.object({
  position: z
    .enum(["HOME_TOP", "HOME_BOTTOM", "TRIP_LISTING", "BOOKING_CONFIRM"])
    .catch("HOME_TOP"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "CUSTOMER");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const { position } = BannersQuerySchema.parse(Object.fromEntries(searchParams));
  const now = new Date();

  try {
    const banners = await prisma.banner.findMany({
      where: {
        position,
        active: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 10,
    });

    return ok({ banners });
  } catch {
    return ok({ banners: [] });
  }
}

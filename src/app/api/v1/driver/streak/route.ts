import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";

/** GET /api/v1/driver/streak — lấy thông tin streak */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Chỉ dành cho tài xế");

  const streak = await prisma.driverStreak.findUnique({
    where: { driverProfileId: driver.id },
  });

  return ok({
    streak: streak ?? {
      currentStreak: 0,
      longestStreak: 0,
      bonusEarnedTotal: 0,
    },
  });
}

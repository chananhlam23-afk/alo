import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findOfferedMatchesByDriver } from "@/repositories/trip-request.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");

  const [items, openRequests] = await Promise.all([
    findOfferedMatchesByDriver(driver.id),
    prisma.tripRequest.findMany({
      where: {
        status:    "PENDING",
        expiresAt: { gt: new Date() },
        matches:   { none: { status: "ACCEPTED" } },
      },
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        departureTime: true,
        seats: true,
        quotedPrice: true,
        distanceKm: true,
        durationMin: true,
      },
      orderBy: { departureTime: "asc" },
      take: 20,
    }),
  ]);

  return ok({ items, openRequests, total: items.length });
}

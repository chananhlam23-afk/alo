import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

/** GET /api/v1/admin/trips/:id — chi tiết chuyến kèm hành khách */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      driverProfile: { include: { user: true } },
      passengers: {
        include: {
          request: {
            select: {
              id: true, passengerName: true, passengerPhone: true,
              pickupAddress: true, dropoffAddress: true,
              departureTime: true, seats: true, quotedPrice: true,
              distanceKm: true, status: true,
            },
          },
        },
        orderBy: { pickupOrder: "asc" },
      },
      stops: { orderBy: { order: "asc" } },
    },
  });

  if (!trip) return Errors.notFound("Chuyến không tồn tại");
  return ok({ trip });
}

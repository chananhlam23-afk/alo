import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

/** GET /api/v1/customer/trips/[id]/driver-location — poll driver GPS */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    select: {
      status: true,
      driverProfileId: true,
      passengers: {
        where: { customerId: auth.payload.userId },
        select: { id: true },
      },
      driverProfile: {
        select: {
          currentLat: true,
          currentLng: true,
          locationUpdatedAt: true,
        },
      },
    },
  });

  if (!trip) return Errors.notFound("Chuyến không tồn tại");
  if (trip.passengers.length === 0) return Errors.forbidden("Bạn không thuộc chuyến này");

  const { currentLat, currentLng, locationUpdatedAt } = trip.driverProfile ?? {};

  return ok({
    status: trip.status,
    location: currentLat && currentLng
      ? { lat: currentLat, lng: currentLng, updatedAt: locationUpdatedAt }
      : null,
  });
}

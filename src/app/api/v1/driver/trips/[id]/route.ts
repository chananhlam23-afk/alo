import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findTripById } from "@/repositories/trip.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  const trip = await findTripById(params.id);
  if (!trip) return Errors.notFound("Chuyến không tồn tại");
  if (trip.driverProfileId !== driver.id) return Errors.forbidden();

  return ok({
    trip,
    stops: trip.stops,
    passengers: trip.passengers,
    currentStopIndex: trip.currentStopIndex,
  });
}

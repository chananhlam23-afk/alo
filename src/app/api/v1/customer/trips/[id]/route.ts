import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findTripById, findPassengersByTrip } from "@/repositories/trip.repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const trip = await findTripById(params.id);
  if (!trip) return Errors.notFound("Chuyến không tồn tại");

  const passengers = await findPassengersByTrip(params.id);
  const myPassenger = passengers.find((p) => p.customerId === auth.payload.userId);
  if (!myPassenger) return Errors.forbidden("Bạn không thuộc chuyến này");

  return ok({
    trip,
    myPickupOrder: myPassenger.pickupOrder,
    myLegStatus: myPassenger.legStatus,
    totalPassengers: passengers.length,
    currentStopIndex: trip.currentStopIndex,
    stops: trip.stops,
    driverProfile: trip.driverProfile,
  });
}

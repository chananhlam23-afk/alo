import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findTripById, findPassengersByTrip, updatePassenger } from "@/repositories/trip.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const trip = await findTripById(params.id);
  if (!trip) return Errors.notFound();

  const passengers = await findPassengersByTrip(params.id);
  const myPassenger = passengers.find((p) => p.customerId === auth.payload.userId);
  if (!myPassenger) return Errors.forbidden();

  if (trip.status !== "COMPLETED") {
    return Errors.conflict("Chuyến chưa hoàn thành");
  }

  await updatePassenger(myPassenger.id, { legStatus: "DROPPED" });
  return ok({ confirmed: true });
}

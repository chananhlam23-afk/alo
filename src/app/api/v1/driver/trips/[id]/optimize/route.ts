import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { buildStopsForTrip } from "@/services/trip.service";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { findTripById } from "@/repositories/trip.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  const trip = await findTripById(params.id);
  if (!trip) return Errors.notFound();
  if (trip.driverProfileId !== driver.id) return Errors.forbidden();

  const stops = await buildStopsForTrip(params.id, driver.id);
  return ok({ stops });
}

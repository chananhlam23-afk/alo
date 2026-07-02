import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findActiveTripByDriver } from "@/repositories/trip.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const trip = await findActiveTripByDriver(driver.id);
  return ok({ trip });
}

import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { startTrip } from "@/services/trip.service";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  try {
    const trip = await startTrip(params.id, driver.id);
    return ok({ trip });
  } catch (e) {
    return Errors.conflict((e as Error).message);
  }
}

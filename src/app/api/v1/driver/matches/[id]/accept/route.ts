import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { acceptMatch } from "@/services/trip.service";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Không có hồ sơ tài xế");
  if (driver.verificationStatus !== "APPROVED") return Errors.kycPending();

  try {
    const trip = await acceptMatch(params.id, driver.id);
    return ok({ trip, stops: trip.stops, passengers: trip.passengers });
  } catch (e) {
    return Errors.conflict((e as Error).message);
  }
}

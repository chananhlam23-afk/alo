import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { markNoShow } from "@/services/trip.service";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; stopId: string } },
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  try {
    const result = await markNoShow(params.id, params.stopId, driver.id);
    return ok(result);
  } catch (e) {
    return Errors.conflict((e as Error).message);
  }
}

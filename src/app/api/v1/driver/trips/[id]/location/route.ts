import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { updateDriverLocation } from "@/services/trip.service";
import { UpdateLocationSchema } from "@/validators/driver.validator";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateLocationSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  await updateDriverLocation(
    params.id,
    driver.id,
    parsed.data.lat,
    parsed.data.lng,
    parsed.data.heading,
  );

  return ok({ updated: true });
}

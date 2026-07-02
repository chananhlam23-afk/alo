import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { AvailabilitySchema } from "@/validators/driver.validator";
import { setDriverOnline } from "@/services/driver.service";
import { findDriverByUserId } from "@/repositories/driver.repository";

const PatchSchema = z.object({ isOnline: z.boolean() });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");
  if (driver.verificationStatus !== "APPROVED") return Errors.kycPending();

  const body = await req.json().catch(() => null);
  const parsed = AvailabilitySchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const updated = await setDriverOnline(driver.id, parsed.data.online);
  return ok({ isOnline: updated.isOnline });
}

// App: DriverRepository.setOnline() → PATCH /driver/availability with body
// {isOnline} (note the field name differs from POST's {online}).
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");
  if (driver.verificationStatus !== "APPROVED") return Errors.kycPending();

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const updated = await setDriverOnline(driver.id, parsed.data.isOnline);
  return ok({ isOnline: updated.isOnline });
}

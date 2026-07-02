import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { findBackhaulOpportunities, acceptBackhaul } from "@/services/backhaul.service";
import { z } from "zod";

const QuerySchema = z.object({
  tripId:       z.string().cuid(),
  maxPickupKm:  z.coerce.number().min(1).max(50).default(15),
  windowHours:  z.coerce.number().min(1).max(12).default(3),
});

const AcceptSchema = z.object({
  requestId: z.string().cuid(),
});

/** GET /api/v1/driver/backhaul?tripId=xxx — lấy danh sách cơ hội backhaul */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Chỉ dành cho tài xế");

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const opportunities = await findBackhaulOpportunities(
    driver.id,
    parsed.data.tripId,
    { maxPickupKm: parsed.data.maxPickupKm, windowHours: parsed.data.windowHours },
  );

  return ok({ opportunities, total: opportunities.length });
}

/** POST /api/v1/driver/backhaul — nhận chuyến backhaul */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Chỉ dành cho tài xế");

  const body   = await req.json().catch(() => null);
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  await acceptBackhaul(driver.id, parsed.data.requestId);

  return created({ message: "Đã nhận chuyến chiều về thành công" });
}

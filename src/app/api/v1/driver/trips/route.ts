import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findTripsByDriver } from "@/repositories/trip.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { z } from "zod";
import type { TripStatus } from "@prisma/client";

const QuerySchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const items = await findTripsByDriver(driver.id, parsed.data.status as TripStatus | undefined);
  const start = (parsed.data.page - 1) * parsed.data.limit;
  const paged = items.slice(start, start + parsed.data.limit);

  return ok({
    items: paged,
    total: items.length,
    page: parsed.data.page,
    limit: parsed.data.limit,
    totalPages: Math.ceil(items.length / parsed.data.limit),
  });
}

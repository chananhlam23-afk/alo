import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findTripsByCustomer } from "@/repositories/trip.repository";
import { ListTripsSchema } from "@/validators/customer.validator";
import type { TripStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ListTripsSchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const [items, total] = await findTripsByCustomer(auth.payload.userId, {
    page: parsed.data.page,
    limit: parsed.data.limit,
    status: parsed.data.status as TripStatus | undefined,
  });

  return ok({
    items,
    total,
    page: parsed.data.page,
    limit: parsed.data.limit,
    totalPages: Math.ceil(total / parsed.data.limit),
  });
}

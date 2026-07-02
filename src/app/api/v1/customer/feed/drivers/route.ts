import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findMatchingDrivers } from "@/services/matching.service";
import { matchingRateLimit } from "@/lib/security/rate-limit";
import { FeedDriversSchema } from "@/validators/customer.validator";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const rl = await matchingRateLimit.limit(auth.payload.userId);
  if (!rl.success) return Errors.rateLimited();

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = FeedDriversSchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { pickupLat, pickupLng, dropoffLat, dropoffLng, departureTime, seats } = parsed.data;

  const drivers = await findMatchingDrivers({
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    departureTime: new Date(departureTime),
    seats,
  });

  return ok({ items: drivers, total: drivers.length });
}

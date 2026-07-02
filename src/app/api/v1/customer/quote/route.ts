import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { calculateQuote } from "@/services/matching.service";
import { QuoteSchema } from "@/validators/customer.validator";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = QuoteSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { pickup, dropoff } = parsed.data;
  const result = await calculateQuote(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

  return ok({
    distanceKm: result.distanceKm,
    durationMin: result.durationMin,
    quotedPrice: result.quotedPrice,
    priceBreakdown: {
      base: result.quotedPrice,
      perKm: result.distanceKm > 0 ? Math.round(result.quotedPrice / result.distanceKm) : 0,
    },
  });
}

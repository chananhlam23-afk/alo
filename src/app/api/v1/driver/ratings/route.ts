import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findRatingsByReceiver } from "@/repositories/pricing.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const ratings = await findRatingsByReceiver(auth.payload.userId);
  return ok({ items: ratings, total: ratings.length });
}

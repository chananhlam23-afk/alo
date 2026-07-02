import { NextRequest } from "next/server";
import { z } from "zod";
import { created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { createRating, recalcDriverRating } from "@/repositories/pricing.repository";
import { findTripById, findPassengersByTrip } from "@/repositories/trip.repository";
import { findDriverByUserId, updateDriverProfile } from "@/repositories/driver.repository";

// App calls POST /customer/trips/{id}/rating with body {stars, comment} — the
// tripId comes from the path (sibling contract of /customer/ratings, which takes
// tripId in the body). Same business logic as the ratings handler.
const Schema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const trip = await findTripById(params.id);
  if (!trip) return Errors.notFound("Chuyến không tồn tại");
  if (trip.status !== "COMPLETED") return Errors.conflict("Chuyến chưa hoàn thành");

  const passengers = await findPassengersByTrip(params.id);
  const isPassenger = passengers.some((p) => p.customerId === auth.payload.userId);
  if (!isPassenger) return Errors.forbidden();

  let rating;
  try {
    rating = await createRating({
      tripId: params.id,
      giverId: auth.payload.userId,
      receiverId: trip.driverProfile.userId,
      stars: parsed.data.stars,
      comment: parsed.data.comment,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return Errors.conflict("Bạn đã đánh giá chuyến này");
    throw e;
  }

  const { avg } = await recalcDriverRating(trip.driverProfile.userId);
  const driver = await findDriverByUserId(trip.driverProfile.userId);
  if (driver) await updateDriverProfile(driver.id, { rating: avg });

  return created({ rating });
}

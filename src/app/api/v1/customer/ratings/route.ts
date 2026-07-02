import { NextRequest } from "next/server";
import { created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateRatingSchema } from "@/validators/customer.validator";
import { createRating, recalcDriverRating } from "@/repositories/pricing.repository";
import { findTripById, findPassengersByTrip } from "@/repositories/trip.repository";
import { updateDriverProfile } from "@/repositories/driver.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateRatingSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const trip = await findTripById(parsed.data.tripId);
  if (!trip) return Errors.notFound("Chuyến không tồn tại");
  if (trip.status !== "COMPLETED") return Errors.conflict("Chuyến chưa hoàn thành");

  const passengers = await findPassengersByTrip(parsed.data.tripId);
  const isPassenger = passengers.some((p) => p.customerId === auth.payload.userId);
  if (!isPassenger) return Errors.forbidden();

  let rating;
  try {
    rating = await createRating({
      tripId: parsed.data.tripId,
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
  if (driver) {
    await updateDriverProfile(driver.id, { rating: avg });
  }

  return created({ rating });
}

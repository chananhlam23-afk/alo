import { NextRequest } from "next/server";
import { created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { initiatePayment } from "@/services/payment.service";
import { CreatePaymentSchema } from "@/validators/customer.validator";
import { findTripById, findPassengersByTrip } from "@/repositories/trip.repository";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreatePaymentSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const trip = await findTripById(parsed.data.tripId);
  if (!trip) return Errors.notFound("Chuyến không tồn tại");

  const passengers = await findPassengersByTrip(parsed.data.tripId);
  const myPassenger = passengers.find((p) => p.customerId === auth.payload.userId);
  if (!myPassenger) return Errors.forbidden("Bạn không thuộc chuyến này");

  const ipAddr =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";

  const result = await initiatePayment(
    parsed.data.tripId,
    auth.payload.userId,
    parsed.data.gateway,
    myPassenger.fareShare,
  );

  return created(result);
}

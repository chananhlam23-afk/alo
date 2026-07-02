import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";

// App: DriverRepository.getProfile() → GET /driver/profile, parsed by
// DriverProfileFull.fromJson (needs id + userId non-null; the rest optional).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const d = await findDriverByUserId(auth.payload.userId);
  if (!d) return Errors.notFound("Chưa có hồ sơ tài xế");

  return ok({
    id:                 d.id,
    userId:             d.userId,
    vehicleType:        d.vehicleType,
    vehiclePlate:       d.vehiclePlate,
    seats:              d.seats,
    address:            d.address,
    verificationStatus: d.verificationStatus,
    isOnline:           d.isOnline,
    rating:             d.rating,
    totalTrips:         d.totalTrips,
    allowCargo:         d.allowCargo,
    cargoCapacityKg:    d.cargoCapacityKg,
    rejectReason:       d.rejectReason,
  });
}

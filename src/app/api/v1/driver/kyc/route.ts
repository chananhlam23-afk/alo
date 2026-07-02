import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { SubmitKycSchema } from "@/validators/driver.validator";
import { submitKyc } from "@/services/driver.service";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { KYC_BUCKET, createDownloadSignedUrls } from "@/lib/supabase/storage";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Chưa có hồ sơ KYC");

  // Cột url lưu PATH (private bucket) → ký signed URL ngắn hạn để client hiển thị.
  const signed = await createDownloadSignedUrls(KYC_BUCKET, driver.documents.map((d) => d.url));

  return ok({
    verificationStatus: driver.verificationStatus,
    rejectReason: driver.rejectReason,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate,
    seats: driver.seats,
    cccdNumber: driver.cccdNumber,
    address: driver.address,
    allowCargo: driver.allowCargo,
    cargoCapacityKg: driver.cargoCapacityKg,
    documents: driver.documents.map((d) => ({ id: d.id, type: d.type, path: d.url, url: signed[d.url] ?? null })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = SubmitKycSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  try {
    const driverProfile = await submitKyc(auth.payload.userId, parsed.data);
    return created({ driverProfile });
  } catch (e) {
    return Errors.conflict((e as Error).message);
  }
}

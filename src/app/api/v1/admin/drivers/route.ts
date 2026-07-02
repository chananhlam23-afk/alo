import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { listDrivers } from "@/repositories/driver.repository";
import { ListQuerySchema } from "@/validators/admin.validator";
import { KYC_BUCKET, createDownloadSignedUrls } from "@/lib/supabase/storage";
import type { VerificationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ListQuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { items, total, stats } = await listDrivers({
    page: parsed.data.page,
    limit: parsed.data.limit,
    status: parsed.data.status as VerificationStatus | undefined,
    search: parsed.data.search,
  });

  // Ảnh giấy tờ nằm ở private bucket — ký signed URL (1 request cho tất cả path).
  const signed = await createDownloadSignedUrls(
    KYC_BUCKET,
    items.flatMap((d) => d.documents.map((doc) => doc.url)),
  );
  const mapped = items.map((d) => ({
    id: d.id,
    vehiclePlate: d.vehiclePlate,
    vehicleType: d.vehicleType,
    seats: d.seats,
    cccdNumber: d.cccdNumber,
    address: d.address,
    allowCargo: d.allowCargo,
    cargoCapacityKg: d.cargoCapacityKg,
    verificationStatus: d.verificationStatus,
    rejectReason: d.rejectReason,
    rating: d.rating,
    totalTrips: d.totalTrips,
    isOnline: d.isOnline,
    createdAt: d.createdAt,
    user: { phone: d.user.phone, fullName: d.user.fullName, avatarUrl: d.user.avatarUrl },
    documents: d.documents.map((doc) => ({ id: doc.id, type: doc.type, url: signed[doc.url] ?? null })),
  }));

  return ok({ items: mapped, total, stats, page: parsed.data.page });
}

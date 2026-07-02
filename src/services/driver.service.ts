import {
  findDriverByUserId,
  createDriverProfile,
  updateDriverProfile,
  addKycDocument,
  replaceKycDocuments,
  createRoute,
  updateRoute,
  findRouteById,
} from "@/repositories/driver.repository";
import { getDirections } from "@/lib/goong/directions";
import { notify } from "@/lib/notifications/notification.service";
import type { SubmitKycSchema } from "@/validators/driver.validator";
import type { z } from "zod";

// ─── KYC ─────────────────────────────────────────────────────────────────────

export async function submitKyc(userId: string, data: z.infer<typeof SubmitKycSchema>) {
  const { documents, ...profile } = data;

  const existing = await findDriverByUserId(userId);
  if (existing && existing.verificationStatus === "PENDING") {
    throw new Error("Hồ sơ đang chờ duyệt");
  }
  if (existing && existing.verificationStatus === "APPROVED") {
    throw new Error("Hồ sơ đã được duyệt");
  }

  // Chỉ chấp nhận giấy tờ nằm trong thư mục của chính tài xế này (chống mạo danh path).
  if (documents && documents.length > 0) {
    const prefix = `kyc/${userId}/`;
    for (const d of documents) {
      if (!d.path.startsWith(prefix)) throw new Error("Giấy tờ không hợp lệ");
    }
  }

  // Tắt ghép hàng → xoá luôn tải trọng cũ để không còn giá trị tồn dư.
  const normalized = {
    ...profile,
    cargoCapacityKg: profile.allowCargo ? (profile.cargoCapacityKg ?? null) : null,
  };

  const driver = existing
    ? await updateDriverProfile(existing.id, {
        ...normalized,
        verificationStatus: "PENDING",
        rejectReason: null,
      })
    : await createDriverProfile({
        user: { connect: { id: userId } },
        ...normalized,
        verificationStatus: "PENDING",
      });

  // Nộp kèm giấy tờ → thay toàn bộ bộ giấy tờ cũ bằng bộ mới (lưu PATH vào cột url)
  if (documents && documents.length > 0) {
    await replaceKycDocuments(driver.id, documents.map((d) => ({ type: d.type, url: d.path })));
  }

  return driver;
}

export async function uploadDocument(userId: string, type: string, url: string) {
  const driver = await findDriverByUserId(userId);
  if (!driver) throw new Error("Chưa có hồ sơ tài xế");
  return addKycDocument({ driverProfileId: driver.id, type, url });
}

// ─── KYC Admin Actions ───────────────────────────────────────────────────────

export async function approveKyc(driverProfileId: string, adminUserId: string) {
  const driver = await updateDriverProfile(driverProfileId, {
    verificationStatus: "APPROVED",
    rejectReason: null,
  });

  void notify({ userId: driver.userId, event: "KYC_APPROVED", templateData: {} });

  return driver;
}

export async function rejectKyc(driverProfileId: string, reason: string) {
  const driver = await updateDriverProfile(driverProfileId, {
    verificationStatus: "REJECTED",
    rejectReason: reason,
  });

  void notify({ userId: driver.userId, event: "KYC_REJECTED", templateData: { reason } });

  return driver;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function createDriverRoute(
  driverProfileId: string,
  data: {
    origin: { lat: number; lng: number; address: string };
    dest: { lat: number; lng: number; address: string };
    departureTime: string;
    availableSeats: number;
    maxDetourKm: number;
    allowCargo: boolean;
    cargoCapacityKg?: number;
  },
) {
  const directions = await getDirections(
    data.origin.lat,
    data.origin.lng,
    data.dest.lat,
    data.dest.lng,
  );

  return createRoute({
    driverProfile: { connect: { id: driverProfileId } },
    originAddress: data.origin.address,
    destAddress: data.dest.address,
    originLat: data.origin.lat,
    originLng: data.origin.lng,
    destLat: data.dest.lat,
    destLng: data.dest.lng,
    polylineEncoded: directions.polylineEncoded,
    departureTime: new Date(data.departureTime),
    availableSeats: data.availableSeats,
    maxDetourKm: data.maxDetourKm,
    allowCargo: data.allowCargo,
    cargoCapacityKg: data.cargoCapacityKg,
  });
}

export async function setDriverOnline(driverProfileId: string, online: boolean) {
  return updateDriverProfile(driverProfileId, { isOnline: online });
}

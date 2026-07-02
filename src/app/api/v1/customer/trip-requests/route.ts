import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateTripRequestSchema, ListTripsSchema } from "@/validators/customer.validator";
import {
  createTripRequest,
  findRequestsByCustomer,
  createMatch,
} from "@/repositories/trip-request.repository";
import { calculateQuote } from "@/services/matching.service";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { notify } from "@/lib/notifications/notification.service";
import { findUserById } from "@/repositories/user.repository";
import { prisma } from "@/lib/db/prisma";
import { evaluateVoucher, parseConditions, extractProvince, type VoucherCore } from "@/lib/vouchers/conditions";
import { buildVoucherContext } from "@/lib/vouchers/context";
import { driverNetForFare } from "@/repositories/pricing.repository";
import { recordVoucherUsage } from "@/repositories/voucher.repository";

const REQUEST_TTL_HOURS = 24;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ListTripsSchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { items, total } = await findRequestsByCustomer(
    auth.payload.userId,
    parsed.data.status as never,
    parsed.data.page,
    parsed.data.limit,
  );
  return ok({ items, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateTripRequestSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { pickup, dropoff, voucherCode, ...rest } = parsed.data;

  let distanceKm: number, durationMin: number, basePrice: number;
  try {
    const q = await calculateQuote(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    distanceKm = q.distanceKm;
    durationMin = q.durationMin;
    basePrice = q.quotedPrice;
  } catch (e) {
    return Errors.internal((e as Error).message ?? "Không tính được giá chuyến");
  }

  // Apply voucher discount if provided (best-effort: bỏ qua nếu không đủ điều kiện)
  let quotedPrice = basePrice;
  let appliedVoucher: { id: string; usageLimit: number | null } | null = null;
  if (voucherCode) {
    const voucher = await prisma.voucher.findUnique({ where: { code: voucherCode.toUpperCase() } });
    if (voucher) {
      const ctx = await buildVoucherContext({
        voucherId: voucher.id,
        userId: auth.payload.userId,
        userRole: "CUSTOMER",
        orderValue: basePrice,
        order: {
          service: rest.cargoWeightKg ? "CARGO" : "RIDE",
          seats: rest.seats,
          distanceKm,
          bookingMode: rest.bookingMode,
          originProvince: extractProvince(rest.pickupAddress),
          destProvince: extractProvince(rest.dropoffAddress),
        },
      });
      const result = evaluateVoucher(voucher as VoucherCore, parseConditions(voucher.conditions), ctx);
      if (result.ok) {
        quotedPrice = result.finalPrice;
        appliedVoucher = { id: voucher.id, usageLimit: voucher.usageLimit };
      }
    }
  }

  let request: Awaited<ReturnType<typeof createTripRequest>>;
  try {
    request = await createTripRequest({
      customer: { connect: { id: auth.payload.userId } },
      passengerName: rest.passengerName,
      passengerPhone: rest.passengerPhone,
      note: rest.note,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: rest.pickupAddress,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      dropoffAddress: rest.dropoffAddress,
      departureTime: new Date(rest.departureTime),
      seats: rest.seats,
      cargoWeightKg: rest.cargoWeightKg,
      bookingMode: rest.bookingMode,
      targetDriverId: rest.targetDriverId,
      quotedPrice,
      distanceKm,
      durationMin,
      expiresAt: new Date(Date.now() + REQUEST_TTL_HOURS * 60 * 60 * 1000),
    });
  } catch (e) {
    return Errors.internal((e as Error).message ?? "Không tạo được yêu cầu chuyến");
  }

  // Ghi nhận lượt dùng voucher (gắn với requestId để hoàn lại khi hủy). Đơn đã được
  // tạo ở trên nên KHÔNG để lỗi ở bước này làm hỏng cả booking (best-effort).
  if (appliedVoucher) {
    try {
      await recordVoucherUsage({
        voucherId: appliedVoucher.id,
        userId: auth.payload.userId,
        requestId: request.id,
        discount: basePrice - quotedPrice,
        usageLimit: appliedVoucher.usageLimit,
      });
    } catch {
      /* booking đã tạo thành công — bỏ qua lỗi ghi lượt dùng voucher */
    }
  }

  // Thông báo cho khách: đặt chuyến thành công (email + Zalo ZNS). Fire-and-forget.
  void notify({
    userId: auth.payload.userId,
    event: "TRIP_REQUEST_CREATED",
    templateData: {
      passengerName: rest.passengerName,
      pickup: rest.pickupAddress,
      dropoff: rest.dropoffAddress,
      departureTime: new Date(rest.departureTime).toLocaleString("vi-VN"),
      price: quotedPrice.toLocaleString("vi-VN"),
    },
  });

  if (rest.bookingMode === "DIRECT_BOOK" && rest.targetDriverId) {
    const targetDriver = await findDriverByUserId(rest.targetDriverId);
    if (targetDriver) {
      await createMatch({
        request: { connect: { id: request.id } },
        driverProfile: { connect: { id: targetDriver.id } },
        detourKm: 0,
        fareShare: quotedPrice,
        driverNet: await driverNetForFare(quotedPrice),
        status: "OFFERED",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const [customer, driverUser] = await Promise.all([
        findUserById(auth.payload.userId),
        findUserById(rest.targetDriverId),
      ]);

      if (customer && driverUser) {
        void notify({
          userId: targetDriver.userId,
          phone: driverUser.phone ?? undefined,
          event: "DIRECT_BOOK_REQUESTED",
          templateData: {
            customerName: customer.fullName ?? "Khách hàng",
            pickup: rest.pickupAddress,
            dropoff: rest.dropoffAddress,
            departureTime: rest.departureTime,
          },
        });
      }
    }
  }

  return created({ request });
}

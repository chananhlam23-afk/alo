import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";
import { notify } from "@/lib/notifications/notification.service";
import { findUserById } from "@/repositories/user.repository";
import { driverNetForFare } from "@/repositories/pricing.repository";

/**
 * POST /api/v1/driver/open-requests/:id/take
 * Tài xế chủ động nhận một đơn mở.
 * - Tạo Trip mới cho tài xế (nếu chưa có)
 * - Tạo TripMatch ACCEPTED
 * - Tạo TripPassenger + TripStop
 * - Cập nhật TripRequest → MATCHED
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Bạn chưa đăng ký hồ sơ tài xế");
  if (driver.verificationStatus !== "APPROVED") {
    return Errors.forbidden("Hồ sơ chưa được duyệt. Vui lòng chờ admin xét duyệt.");
  }

  const request = await prisma.tripRequest.findUnique({
    where: { id: params.id },
    include: { matches: { where: { status: "ACCEPTED" } } },
  });
  if (!request) return Errors.notFound("Không tìm thấy đơn hàng");
  if (request.status !== "PENDING") return Errors.validation("Đơn này không còn khả dụng");
  if (request.expiresAt < new Date()) return Errors.validation("Đơn đã hết hạn");
  if (request.matches.length > 0) return Errors.validation("Đơn này đã được tài xế khác nhận");
  if (request.seats > driver.seats) return Errors.validation("Yêu cầu vượt quá số chỗ của xe");

  const driverNet = await driverNetForFare(request.quotedPrice);

  // Tất cả trong 1 transaction
  let result: { trip: { id: string }; passenger: { id: string } };
  try {
    result = await prisma.$transaction(async (tx) => {
    // Nhận đơn có điều kiện (re-check trong DB) — chống 2 tài xế cùng nhận 1 đơn
    const flip = await tx.tripRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data:  { status: "MATCHED" },
    });
    if (flip.count !== 1) throw new Error("__TAKEN__");

    // Tạo Trip cho tài xế
    const trip = await tx.trip.create({
      data: {
        driverProfileId: driver.id,
        status:          "ACTIVE",
        seatsTotal:      driver.seats,
        seatsFilled:     request.seats,
      },
    });

    // TripMatch ACCEPTED (bỏ qua bước OFFERED)
    await tx.tripMatch.create({
      data: {
        requestId:       request.id,
        driverRouteId:   (await tx.driverRoute.findFirst({ where: { driverProfileId: driver.id } }))?.id ?? null,
        driverProfileId: driver.id,
        detourKm:        0,
        fareShare:       request.quotedPrice,
        driverNet,
        status:          "ACCEPTED",
        respondedAt:     new Date(),
        expiresAt:       new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // TripPassenger
    const passenger = await tx.tripPassenger.create({
      data: {
        tripId:      trip.id,
        requestId:   request.id,
        customerId:  request.customerId,
        seats:       request.seats,
        fareShare:   request.quotedPrice,
        pickupOrder: 1,
        legStatus:   "WAITING",
      },
    });

    // TripStop: pickup + dropoff
    await tx.tripStop.createMany({
      data: [
        {
          tripId:      trip.id,
          passengerId: passenger.id,
          order:       1,
          type:        "PICKUP",
          address:     request.pickupAddress,
          lat:         request.pickupLat,
          lng:         request.pickupLng,
        },
        {
          tripId:      trip.id,
          passengerId: passenger.id,
          order:       2,
          type:        "DROPOFF",
          address:     request.dropoffAddress,
          lat:         request.dropoffLat,
          lng:         request.dropoffLng,
        },
      ],
    });

    return { trip, passenger };
    });
  } catch (e) {
    if ((e as Error).message === "__TAKEN__") {
      return Errors.conflict("Đơn này đã được tài xế khác nhận");
    }
    throw e;
  }

  // Thông báo khách hàng
  void (async () => {
    const customer = await findUserById(request.customerId);
    const driverUser = await findUserById(auth.payload.userId);
    if (customer) {
      await notify({
        userId: request.customerId,
        phone:  customer.phone ?? undefined,
        email:  customer.email ?? undefined,
        event:  "TRIP_ACCEPTED",
        templateData: {
          driverName: driverUser?.fullName ?? "Tài xế",
          plate:      driver.vehiclePlate,
          pickup:     request.pickupAddress,
          dropoff:    request.dropoffAddress,
        },
      });
    }
  })();

  return ok({ tripId: result.trip.id, passengerId: result.passenger.id });
}

import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { refundVoucherForRequest } from "@/repositories/voucher.repository";

/** POST /api/v1/customer/trips/:id/cancel — khách hủy chuyến */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const passenger = await prisma.tripPassenger.findFirst({
    where: { tripId: params.id, customerId: auth.payload.userId },
    include: { trip: { select: { id: true, status: true, seatsFilled: true } } },
  });

  if (!passenger) return Errors.notFound("Bạn không thuộc chuyến này");

  if (!["PENDING", "ACTIVE"].includes(passenger.trip.status)) {
    return Errors.conflict("Không thể hủy chuyến đang di chuyển hoặc đã kết thúc");
  }

  // Idempotent: chỉ hủy khi vé còn ở trạng thái hủy được (chống hủy 2 lần làm âm seatsFilled).
  // legStatus CANCELLED (không phải DROPPED) để completeTrip KHÔNG tính tiền cho khách đã hủy.
  const done = await prisma.$transaction(async (tx) => {
    const flip = await tx.tripPassenger.updateMany({
      where: { id: passenger.id, legStatus: { notIn: ["DROPPED", "CANCELLED", "NO_SHOW"] } },
      data:  { legStatus: "CANCELLED" },
    });
    if (flip.count !== 1) return false;
    await tx.tripRequest.update({
      where: { id: passenger.requestId },
      data:  { status: "CANCELLED" },
    });
    await tx.trip.update({
      where: { id: params.id },
      data:  { seatsFilled: { decrement: passenger.seats } },
    });
    return true;
  });
  if (!done) return Errors.conflict("Chuyến này đã được hủy trước đó");

  // Hoàn lại lượt voucher đã dùng cho yêu cầu này (best-effort, không chặn việc hủy).
  await refundVoucherForRequest(passenger.requestId).catch(() => {});

  return ok({ cancelled: true });
}

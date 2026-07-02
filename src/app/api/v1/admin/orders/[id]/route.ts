import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

/** GET /api/v1/admin/orders/:id — chi tiết đơn hàng */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;
  if (auth.payload.role !== "ADMIN") return Errors.forbidden("Không có quyền truy cập");

  const order = await prisma.tripRequest.findUnique({
    where: { id: params.id },
    include: {
      customer: {
        select: {
          id: true, fullName: true, phone: true, email: true,
          createdAt: true,
          driverProfile: { select: { verificationStatus: true } },
        },
      },
      matches: {
        include: {
          driverProfile: {
            select: {
              id: true, vehicleType: true, vehiclePlate: true, rating: true,
              user: { select: { fullName: true, phone: true } },
            },
          },
        },
        orderBy: { offeredAt: "desc" },
      },
      tripPassenger: {
        include: { trip: { select: { id: true, status: true, startedAt: true } } },
      },
    },
  });

  if (!order) return Errors.notFound("Không tìm thấy đơn hàng");

  return ok({ order });
}

/** PATCH /api/v1/admin/orders/:id — admin cancel đơn */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;
  if (auth.payload.role !== "ADMIN") return Errors.forbidden("Không có quyền truy cập");

  const order = await prisma.tripRequest.findUnique({ where: { id: params.id } });
  if (!order) return Errors.notFound("Không tìm thấy đơn hàng");
  if (order.status !== "PENDING") return Errors.validation("Chỉ hủy được đơn đang chờ");

  await prisma.tripRequest.update({
    where: { id: params.id },
    data:  { status: "CANCELLED" },
  });

  return ok({ success: true });
}

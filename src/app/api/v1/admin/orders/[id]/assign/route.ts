import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { driverNetForFare } from "@/repositories/pricing.repository";
import { z } from "zod";

const Schema = z.object({ driverProfileId: z.string().cuid() });

/** POST /api/v1/admin/orders/:id/assign — admin gán tài xế cho đơn đang chờ */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const order = await prisma.tripRequest.findUnique({ where: { id: params.id } });
  if (!order) return Errors.notFound("Không tìm thấy đơn hàng");
  if (order.status !== "PENDING") return Errors.validation("Chỉ gán tài xế cho đơn đang chờ");

  const driver = await prisma.driverProfile.findUnique({
    where: { id: parsed.data.driverProfileId },
    select: { id: true, verificationStatus: true },
  });
  if (!driver) return Errors.notFound("Không tìm thấy tài xế");
  if (driver.verificationStatus !== "APPROVED") {
    return Errors.validation("Tài xế chưa được duyệt KYC, không thể gán đơn");
  }

  const now = new Date();
  const fareShare = order.quotedPrice;
  const driverNet = await driverNetForFare(order.quotedPrice); // theo hoa hồng cấu hình
  const expiresAt = order.expiresAt && order.expiresAt > now
    ? order.expiresAt
    : new Date(now.getTime() + 30 * 60 * 1000);

  const [, match] = await prisma.$transaction([
    // Hủy các lời mời đang chờ khác của đơn này (nếu có)
    prisma.tripMatch.updateMany({
      where: { requestId: order.id, status: "OFFERED" },
      data: { status: "EXPIRED", respondedAt: now },
    }),
    prisma.tripMatch.create({
      data: {
        request: { connect: { id: order.id } },
        driverProfile: { connect: { id: driver.id } },
        detourKm: 0,
        fareShare,
        driverNet,
        status: "ACCEPTED",
        respondedAt: now,
        expiresAt,
      },
    }),
    prisma.tripRequest.update({
      where: { id: order.id },
      data: { status: "MATCHED" },
    }),
  ]);

  return ok({ matchId: match.id });
}

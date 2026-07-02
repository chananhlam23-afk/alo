import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const Schema = z.object({
  departureTime: z.string().datetime({ message: "Thời gian không hợp lệ" }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");

  const match = await prisma.tripMatch.findUnique({
    where: { id: params.id },
    select: { id: true, driverProfileId: true, requestId: true, status: true },
  });

  if (!match) return Errors.notFound("Không tìm thấy chuyến");
  if (match.driverProfileId !== driver.id) return Errors.forbidden("Không có quyền chỉnh sửa chuyến này");
  if (match.status !== "ACCEPTED") return Errors.validation("Chỉ có thể chỉnh sửa chuyến đã nhận");

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const newTime = new Date(parsed.data.departureTime);
  if (newTime < new Date()) return Errors.validation("Thời gian đón phải ở tương lai");

  await prisma.tripRequest.update({
    where: { id: match.requestId },
    data: { departureTime: newTime },
  });

  return ok({ message: "Đã cập nhật thời gian đón" });
}

import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  myRouteOnly: z.coerce.boolean().default(false),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * GET /api/v1/driver/open-requests
 * Tài xế duyệt tất cả đơn PENDING chưa có người nhận.
 * Nếu myRouteOnly=true, lọc theo vùng gần tuyến của tài xế.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Bạn chưa đăng ký hồ sơ tài xế");
  if (driver.verificationStatus !== "APPROVED") {
    return Errors.forbidden("Hồ sơ chưa được duyệt. Vui lòng chờ admin xét duyệt.");
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { page, limit } = parsed.data;

  // Đơn chưa ai nhận: PENDING, chưa hết hạn, chưa có match ACCEPTED
  const items = await prisma.tripRequest.findMany({
    where: {
      status:    "PENDING",
      expiresAt: { gt: new Date() },
      matches:   { none: { status: "ACCEPTED" } },
    },
    include: {
      customer: { select: { fullName: true } },
      // Kiểm tra xem tài xế này đã offer chưa
      matches: {
        where:  { driverProfileId: driver.id },
        select: { id: true, status: true },
      },
    },
    orderBy: { departureTime: "asc" },
    skip:  (page - 1) * limit,
    take:  limit,
  });

  const total = await prisma.tripRequest.count({
    where: {
      status:    "PENDING",
      expiresAt: { gt: new Date() },
      matches:   { none: { status: "ACCEPTED" } },
    },
  });

  // Đánh dấu đơn nào tài xế đã offer rồi
  const result = items.map((r) => ({
    ...r,
    alreadyOffered: r.matches.length > 0,
    matches: undefined,
    customer: { fullName: r.customer.fullName },
  }));

  return ok({ items: result, total, page, limit });
}

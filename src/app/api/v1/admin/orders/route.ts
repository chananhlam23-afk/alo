import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "MATCHED", "CANCELLED", "EXPIRED"]).optional(),
});

/** GET /api/v1/admin/orders — danh sách đơn hàng (TripRequest) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;
  if (auth.payload.role !== "ADMIN") return Errors.forbidden("Không có quyền truy cập");

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { page, limit, status } = parsed.data;
  const resolvedStatus = status ?? "PENDING";
  const where = {
    status: resolvedStatus,
    ...(resolvedStatus === "PENDING" ? { expiresAt: { gt: new Date() } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tripRequest.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        matches: {
          where:   { status: "ACCEPTED" },
          include: {
            driverProfile: {
              select: {
                vehiclePlate: true, vehicleType: true, rating: true,
                user: { select: { fullName: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tripRequest.count({ where }),
  ]);

  return ok({ items, total, page, limit });
}

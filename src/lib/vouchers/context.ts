/**
 * Dựng VoucherEvalContext từ DB: thống kê người dùng (số chuyến hoàn thành,
 * lần đi gần nhất), số lần đã dùng voucher (tổng / trong ngày) và ngân sách đã chi.
 * Tách khỏi conditions.ts để giữ module đánh giá thuần (không phụ thuộc prisma).
 */
import { prisma } from "@/lib/db/prisma";
import type {
  VoucherEvalContext,
  VoucherService,
  VoucherBookingMode,
  VoucherPaymentMethod,
} from "./conditions";

export interface OrderContext {
  service?: VoucherService;
  seats?: number;
  distanceKm?: number;
  bookingMode?: VoucherBookingMode;
  paymentMethod?: VoucherPaymentMethod;
  originProvince?: string;
  destProvince?: string;
}

export async function buildVoucherContext(opts: {
  voucherId: string;
  userId: string;
  userRole: string;
  orderValue: number;
  order?: OrderContext;
}): Promise<VoucherEvalContext> {
  const { voucherId, userId, userRole, orderValue, order } = opts;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const completedTripWhere = {
    status: "COMPLETED" as const,
    passengers: { some: { customerId: userId } },
  };

  const [user, userCompletedTrips, lastTrip, userUsageCount, userUsageToday, budgetAgg] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, phone: true } }),
      prisma.trip.count({ where: completedTripWhere }),
      prisma.trip.findFirst({
        where: completedTripWhere,
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
      prisma.voucherUsage.count({ where: { voucherId, userId } }),
      prisma.voucherUsage.count({ where: { voucherId, userId, usedAt: { gte: startOfDay } } }),
      prisma.voucherUsage.aggregate({ where: { voucherId }, _sum: { discount: true } }),
    ]);

  return {
    now,
    orderValue,
    userId,
    userRole,
    userPhone: user?.phone ?? null,
    userCreatedAt: user?.createdAt,
    userCompletedTrips,
    lastTripAt: lastTrip?.completedAt ?? null,
    userUsageCount,
    userUsageToday,
    budgetSpent: budgetAgg._sum.discount ?? 0,
    ...order,
  };
}

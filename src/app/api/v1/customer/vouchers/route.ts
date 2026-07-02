import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { parseConditions } from "@/lib/vouchers/conditions";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "CUSTOMER");
  if ("error" in auth) return auth.error;

  const userId = auth.payload.userId;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        status: "ACTIVE",
        startsAt: { lte: now },
        expiresAt: { gte: now },
        OR: [{ targetRole: null }, { targetRole: "CUSTOMER" }],
      },
      orderBy: { createdAt: "desc" },
    });

    const voucherIds = vouchers.map((v) => v.id);

    // Thống kê người dùng + mức dùng/ngân sách của từng voucher (song song)
    const [user, completedTrips, lastTrip, usages, usagesToday, budgets] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, phone: true } }),
      prisma.trip.count({ where: { status: "COMPLETED", passengers: { some: { customerId: userId } } } }),
      prisma.trip.findFirst({
        where: { status: "COMPLETED", passengers: { some: { customerId: userId } } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
      prisma.voucherUsage.groupBy({ by: ["voucherId"], where: { voucherId: { in: voucherIds }, userId }, _count: { id: true } }),
      prisma.voucherUsage.groupBy({ by: ["voucherId"], where: { voucherId: { in: voucherIds }, userId, usedAt: { gte: startOfDay } }, _count: { id: true } }),
      prisma.voucherUsage.groupBy({ by: ["voucherId"], where: { voucherId: { in: voucherIds } }, _sum: { discount: true } }),
    ]);

    const userUsage = new Map(usages.map((u) => [u.voucherId, u._count.id]));
    const userUsageToday = new Map(usagesToday.map((u) => [u.voucherId, u._count.id]));
    const budgetSpent = new Map(budgets.map((b) => [b.voucherId, b._sum.discount ?? 0]));
    const lastTripAt = lastTrip?.completedAt ?? null;

    const available = vouchers.filter((v) => {
      const c = parseConditions(v.conditions);
      const used = userUsage.get(v.id) ?? 0;
      const usedToday = userUsageToday.get(v.id) ?? 0;
      const spent = budgetSpent.get(v.id) ?? 0;

      // Hết lượt (tổng / theo người / theo ngày) hoặc hết ngân sách
      if (v.usageLimit !== null && v.usedCount >= v.usageLimit) return false;
      if (used >= v.userLimit) return false;
      if (c.userDailyLimit != null && usedToday >= c.userDailyLimit) return false;
      if (c.totalBudget != null && spent >= c.totalBudget) return false;

      // Đối tượng áp dụng
      if (c.audience === "SPECIFIC_USERS") {
        const phone = user?.phone ?? "";
        if (!c.specificUserIds.includes(userId) && !c.specificUserIds.some((s) => s.trim() === phone)) return false;
      } else if (c.audience === "NEW_USER") {
        if (completedTrips > 0) return false;
        if (c.newUserWithinDays != null && user?.createdAt) {
          const ageDays = (now.getTime() - user.createdAt.getTime()) / 86400000;
          if (ageDays > c.newUserWithinDays) return false;
        }
      } else if (c.audience === "EXISTING_USER") {
        if (completedTrips < 1) return false;
      } else if (c.audience === "INACTIVE_USER") {
        if (c.inactiveDays != null) {
          if (!lastTripAt) return false;
          if ((now.getTime() - lastTripAt.getTime()) / 86400000 < c.inactiveDays) return false;
        }
      }
      if (c.firstOrderOnly && completedTrips > 0) return false;
      if (c.minUserTrips != null && completedTrips < c.minUserTrips) return false;

      return true;
    });

    // Ưu tiên cao hiển thị trước
    available.sort((a, b) => parseConditions(b.conditions).priority - parseConditions(a.conditions).priority);

    return ok({ vouchers: available });
  } catch {
    return ok({ vouchers: [] });
  }
}

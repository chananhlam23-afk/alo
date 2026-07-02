import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

const DAYS = 14;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  // Mốc bắt đầu = 00:00 của (hôm nay - 13 ngày) → đủ 14 cột.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS - 1));

  const [
    totalUsers,
    totalDrivers,
    pendingKyc,
    totalTrips,
    activeTrips,
    pendingWithdrawals,
    openReports,
    recentRequests,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.driverProfile.count(),
    prisma.driverProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.trip.count(),
    prisma.trip.count({ where: { status: { in: ["ACTIVE", "ONGOING"] } } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    // Dữ liệu thật cho biểu đồ 14 ngày
    prisma.tripRequest.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, quotedPrice: true, status: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // 14 ô theo ngày
  const buckets = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    return {
      date: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      trips: 0,
      revenue: 0,
      users: 0,
    };
  });

  const idxFor = (date: Date): number => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - since.getTime()) / 86_400_000);
  };

  for (const r of recentRequests) {
    const i = idxFor(r.createdAt);
    if (i < 0 || i >= DAYS) continue;
    buckets[i].trips += 1;
    // Doanh thu ước tính = tổng giá các đơn đã ghép tài xế
    if (r.status === "MATCHED") buckets[i].revenue += r.quotedPrice;
  }
  for (const u of recentUsers) {
    const i = idxFor(u.createdAt);
    if (i >= 0 && i < DAYS) buckets[i].users += 1;
  }

  return ok({
    totalUsers,
    totalDrivers,
    pendingKyc,
    totalTrips,
    activeTrips,
    pendingWithdrawals,
    openReports,
    series: buckets,
  });
}

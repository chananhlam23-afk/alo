import { getActivePricing } from "@/repositories/pricing.repository";
import {
  createCargoRequest,
  findPendingCargoNearRoute,
  updateCargoStatus,
} from "@/repositories/cargo.repository";
import { prisma } from "@/lib/db/prisma";
import { broadcastToCustomer } from "@/lib/supabase/realtime";
import { notify } from "@/lib/notifications/notification.service";
import { findUserById } from "@/repositories/user.repository";

/* ── Pricing ────────────────────────────────────────────────────────────── */

interface CargoTier { upToKg: number; pricePerKg: number }
interface CargoPricingConf {
  basePricePerKg?: number;
  minCharge?: number;
  weightTiers?: CargoTier[];
  perKmFee?: number; // tùy chọn, mặc định 0 (model admin không có phí theo km)
}

/**
 * Tính giá vận chuyển hàng theo ĐÚNG cấu hình admin ghi (cargoPricing):
 * đơn giá theo bậc trọng lượng (weightTiers) → fallback basePricePerKg,
 * sàn tối thiểu minCharge. (Trước đây đọc nhầm baseFee/perKgFee/perKmFee
 * mà không writer nào set → luôn về giá mặc định cứng.)
 */
export async function quoteCargo(
  distanceKm: number,
  weightKg: number,
): Promise<number> {
  const pricing = await getActivePricing();
  const conf = (pricing?.cargoPricing ?? null) as CargoPricingConf | null;

  const basePricePerKg = conf?.basePricePerKg ?? 3_000;
  const minCharge      = conf?.minCharge ?? 15_000;
  const tiers = Array.isArray(conf?.weightTiers)
    ? [...conf!.weightTiers].sort((a, b) => a.upToKg - b.upToKg)
    : [];

  const tier = tiers.find((t) => weightKg <= t.upToKg);
  const pricePerKg = tier?.pricePerKg ?? basePricePerKg;
  const perKmFee = typeof conf?.perKmFee === "number" ? conf.perKmFee : 0;

  const raw = weightKg * pricePerKg + distanceKm * perKmFee;
  return Math.max(minCharge, Math.round(raw));
}

/* ── Create ─────────────────────────────────────────────────────────────── */

export async function createCargo(params: {
  senderId: string;
  receiverName: string;
  receiverPhone: string;
  pickupAddress: string; pickupLat: number; pickupLng: number;
  dropoffAddress: string; dropoffLat: number; dropoffLng: number;
  weightKg: number; description?: string;
  distanceKm: number;
}) {
  const quotedPrice = await quoteCargo(params.distanceKm, params.weightKg);

  const { distanceKm: _dist, ...rest } = params;
  const cargo = await createCargoRequest({
    ...rest,
    quotedPrice,
    expiresAt: new Date(Date.now() + 24 * 3600_000),
  });

  return { cargo, quotedPrice };
}

/* ── Matching ───────────────────────────────────────────────────────────── */

/**
 * Khi một chuyến xe được kích hoạt (ACTIVE), tìm và gán hàng gần tuyến đường.
 * Mỗi chuyến nhận tối đa maxCargo kiện (mặc định 3) nếu tài xế cho phép.
 */
export async function matchCargoToTrip(tripId: string, maxCargo = 3): Promise<void> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      passengers: { include: { request: true } },
      driverProfile: true,
    },
  });

  if (!trip || !trip.driverProfile.allowCargo) return;

  // Lấy tuyến đường từ request đầu tiên
  const firstRequest = trip.passengers[0]?.request;
  if (!firstRequest) return;

  const pendingCargos = await findPendingCargoNearRoute(
    firstRequest.pickupLat,
    firstRequest.pickupLng,
    firstRequest.dropoffLat,
    firstRequest.dropoffLng,
  );

  let assigned = 0;
  for (const cargo of pendingCargos) {
    if (assigned >= maxCargo) break;

    // Kiểm tra cargo capacity
    const totalWeightAssigned = await prisma.cargoRequest.aggregate({
      where: { tripId, status: { in: ["MATCHED", "PICKED_UP"] } },
      _sum: { weightKg: true },
    });
    const usedKg = totalWeightAssigned._sum.weightKg ?? 0;
    const maxKg  = trip.driverProfile.cargoCapacityKg ?? 50;
    if (usedKg + cargo.weightKg > maxKg) continue;

    await updateCargoStatus(cargo.id, "MATCHED", {
      tripId,
      assignedAt: new Date(),
    });

    // Thông báo cho người gửi
    const sender = await findUserById(cargo.senderId);
    if (sender) {
      void broadcastToCustomer(cargo.senderId, "cargo.matched", { cargoId: cargo.id, tripId });
      void notify({
        userId: cargo.senderId,
        phone: sender.phone ?? undefined,
        email: sender.email ?? undefined,
        event: "CARGO_MATCHED",
        templateData: {
          cargoId: cargo.id,
          tripId,
          amount: String(cargo.quotedPrice),
        },
      });
    }

    assigned++;
  }
}

/* ── Completion ─────────────────────────────────────────────────────────── */

export async function markCargoDelivered(cargoId: string): Promise<void> {
  await updateCargoStatus(cargoId, "DELIVERED", { deliveredAt: new Date() });
}

/* ── Streak (anti-leakage) ──────────────────────────────────────────────── */

const STREAK_BONUS_PER_DAY = 5_000; // VND thưởng vào ví mỗi ngày streak liên tục
const MAX_DAILY_BONUS = 50_000;

export async function updateDriverStreak(driverProfileId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Đọc trạng thái hiện tại TRƯỚC để phân biệt "chuyến đầu trong ngày" với
  // "đã tính hôm nay rồi" → chỉ thưởng khi streak thực sự tăng (chống cộng thưởng
  // mỗi chuyến trong cùng một ngày).
  const existing = await prisma.driverStreak.findUnique({ where: { driverProfileId } });

  let newStreak: number;
  if (!existing) {
    newStreak = 1;
  } else {
    const lastDay = existing.lastTripDate ? new Date(existing.lastTripDate) : null;
    if (lastDay) lastDay.setHours(0, 0, 0, 0);
    const diffDays = lastDay ? Math.round((today.getTime() - lastDay.getTime()) / 86_400_000) : 999;
    if (diffDays === 0) return; // đã tính & thưởng hôm nay rồi
    newStreak = diffDays === 1 ? existing.currentStreak + 1 : 1;
  }

  const longest = Math.max(newStreak, existing?.longestStreak ?? 0);
  const bonus   = Math.min(newStreak * STREAK_BONUS_PER_DAY, MAX_DAILY_BONUS);

  await prisma.driverStreak.upsert({
    where: { driverProfileId },
    create: { driverProfileId, currentStreak: newStreak, longestStreak: longest, lastTripDate: today, bonusEarnedTotal: bonus },
    update: {
      currentStreak: newStreak,
      longestStreak: longest,
      lastTripDate: today,
      bonusEarnedTotal: { increment: bonus },
    },
  });

  // Nạp tiền thưởng vào ví tài xế
  if (bonus > 0) {
    const wallet = await prisma.driverWallet.findUnique({ where: { driverProfileId } });
    if (wallet) {
      await prisma.$transaction([
        prisma.driverWallet.update({
          where: { driverProfileId },
          data: { withdrawableBalance: { increment: bonus } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: bonus,
            type: "TRIP_CREDIT",
            description: `Streak ${newStreak} ngày liên tiếp — thưởng giữ chân`,
          },
        }),
      ]);
    }
  }
}

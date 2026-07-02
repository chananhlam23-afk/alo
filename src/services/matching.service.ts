import { prisma } from "@/lib/db/prisma";
import { getActivePricing } from "@/repositories/pricing.repository";
import { getDirections } from "@/lib/goong/directions";

export interface MatchCandidate {
  driverId: string;
  driverProfileId: string;
  name: string;
  avatar: string | null;
  vehicleType: string;
  plate: string;
  seatsAvailable: number;
  departureTime: Date;
  rating: number;
  detourKm: number;
  quotedPrice: number;
  routeId: string;
  // Enhanced fields
  pickupDeviationKm: number;
  dropoffDeviationKm: number;
  coverageScore: number;     // 0–1, higher = better route match
  originAddress: string;
  destAddress: string;
}

// ─── Core geometry helpers ─────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Perpendicular distance from point P to line segment A→B.
 * Returns the distance in km, and the projection parameter t ∈ [0,1]:
 *   t=0 means P is closest to A (start)
 *   t=1 means P is closest to B (end)
 *
 * Uses flat-earth Cartesian approximation — accurate enough for < 2000 km segments.
 */
function pointToSegment(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): { distKm: number; t: number } {
  const dx = bLat - aLat;
  const dy = bLng - aLng;
  const len2 = dx * dx + dy * dy;

  if (len2 < 1e-12) {
    return { distKm: haversine(pLat, pLng, aLat, aLng), t: 0 };
  }

  const t = Math.max(0, Math.min(1,
    ((pLat - aLat) * dx + (pLng - aLng) * dy) / len2,
  ));

  const closestLat = aLat + t * dx;
  const closestLng = aLng + t * dy;

  return { distKm: haversine(pLat, pLng, closestLat, closestLng), t };
}

// ─── Smart matching ────────────────────────────────────────────────────────

/**
 * Tìm tài xế phù hợp theo lộ trình.
 *
 * Logic chính:
 * 1. Lọc theo thời gian: ±24h so với giờ khách muốn đi (hiển thị 3 ngày).
 * 2. Với mỗi tài xế, tính khoảng cách từ điểm ĐÓN và điểm TRẢ đến đường thẳng
 *    từ origin → dest của tài xế (perpendicular distance).
 * 3. Nếu cả hai điểm đều ≤ ngưỡng chấp nhận (ví dụ 50km) VÀ
 *    điểm đón nằm "trước" điểm trả trên lộ trình (t_pickup < t_dropoff) →
 *    tài xế này phù hợp.
 * 4. Không gọi Goong API per-route → nhanh hơn nhiều.
 *    Chỉ gọi Goong cho top-5 ứng viên để hiển thị thời gian chính xác.
 */
export async function findMatchingDrivers(params: {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  departureTime: Date;
  seats: number;
}): Promise<MatchCandidate[]> {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng, departureTime, seats } = params;

  // ── 1. Thời gian: từ ngày hôm trước đến ngày hôm sau (3 ngày) ──────────
  const DAY_MS = 24 * 60 * 60 * 1000;
  const minDep = new Date(departureTime.getTime() - DAY_MS);
  const maxDep = new Date(departureTime.getTime() + DAY_MS);

  // ── 2. Lấy tất cả tuyến ACTIVE trong cửa sổ 3 ngày ───────────────────
  const routes = await prisma.driverRoute.findMany({
    where: {
      status: "ACTIVE",
      departureTime: { gte: minDep, lte: maxDep },
      availableSeats: { gte: seats },
      driverProfile: {
        verificationStatus: "APPROVED",
        // Không bắt isOnline vì tài xế đăng lộ trình trước
      },
    },
    include: {
      driverProfile: { include: { user: true } },
    },
    take: 200,
  });

  if (routes.length === 0) return [];

  // ── 3. Lọc bằng thuật toán route-coverage (không gọi API) ─────────────
  const pricing = await getActivePricing();

  const customerRouteKm = haversine(pickupLat, pickupLng, dropoffLat, dropoffLng);

  const candidates: MatchCandidate[] = [];

  for (const route of routes) {
    const routeKm = haversine(
      route.originLat, route.originLng,
      route.destLat,   route.destLng,
    );

    // Độ lệch của điểm đón/trả khách so với đường thẳng lộ trình tài xế
    const pickupProj  = pointToSegment(
      pickupLat,  pickupLng,
      route.originLat, route.originLng,
      route.destLat,   route.destLng,
    );
    const dropoffProj = pointToSegment(
      dropoffLat, dropoffLng,
      route.originLat, route.originLng,
      route.destLat,   route.destLng,
    );

    // Dùng đúng maxDetourKm mà tài xế đã tự cấu hình khi đăng lộ trình
    const effectiveRadius = route.maxDetourKm;

    // Kiểm tra 4 điều kiện:
    // a) Điểm đón nằm trong ngưỡng lệch của lộ trình tài xế
    if (pickupProj.distKm > effectiveRadius) continue;

    // b) Điểm trả nằm trong ngưỡng lệch của lộ trình tài xế
    if (dropoffProj.distKm > effectiveRadius) continue;

    // c) Điểm đón phải "trước" điểm trả trên lộ trình (cùng chiều)
    //    Cho phép sai số nhỏ 0.05 (khoảng 5% quãng đường)
    if (pickupProj.t > dropoffProj.t + 0.05) continue;

    // d) Điểm trả của khách phải nằm trước điểm đến của tài xế
    //    (tài xế không cần quay đầu để trả khách)
    if (dropoffProj.t > 1.0) continue;

    // ── Tính điểm phù hợp (coverage score) ──────────────────────────────
    // Dựa trên: độ lệch thấp + lộ trình dài hơn lộ trình khách là tốt
    const avgDeviation = (pickupProj.distKm + dropoffProj.distKm) / 2;
    const deviationScore = Math.max(0, 1 - avgDeviation / effectiveRadius);

    // Tỉ lệ lộ trình tài xế "bao phủ" lộ trình khách
    const customerProjectedKm = (dropoffProj.t - pickupProj.t) * routeKm;
    const coverageRatio = Math.min(1, customerProjectedKm / Math.max(customerRouteKm, 1));

    const coverageScore = deviationScore * 0.5 + coverageRatio * 0.3 + (route.driverProfile.rating / 5) * 0.2;

    // ── Ước tính giá theo khoảng cách khách ──────────────────────────────
    const quotedPrice = calculateFare(customerRouteKm, pricing);

    // ── Tính detour ước tính (không gọi API) ─────────────────────────────
    const estimatedDetourKm = pickupProj.distKm + dropoffProj.distKm;

    candidates.push({
      driverId:         route.driverProfile.userId,
      driverProfileId:  route.driverProfileId,
      name:             route.driverProfile.user.fullName ?? "Tài xế",
      avatar:           route.driverProfile.user.avatarUrl,
      vehicleType:      route.driverProfile.vehicleType,
      plate:            route.driverProfile.vehiclePlate,
      seatsAvailable:   route.availableSeats,
      departureTime:    route.departureTime,
      rating:           route.driverProfile.rating,
      detourKm:         Math.round(estimatedDetourKm * 10) / 10,
      quotedPrice,
      routeId:          route.id,
      pickupDeviationKm:  Math.round(pickupProj.distKm * 10) / 10,
      dropoffDeviationKm: Math.round(dropoffProj.distKm * 10) / 10,
      coverageScore:    Math.round(coverageScore * 100) / 100,
      originAddress:    route.originAddress,
      destAddress:      route.destAddress,
    });
  }

  // ── 4. Sort: coverage score cao → detour thấp ─────────────────────────
  candidates.sort((a, b) => {
    // Ưu tiên tuyến cùng ngày khách đặt
    const aDayDiff = Math.abs(a.departureTime.getTime() - departureTime.getTime());
    const bDayDiff = Math.abs(b.departureTime.getTime() - departureTime.getTime());
    const dayBonus = (bDayDiff - aDayDiff) / (12 * 3600 * 1000) * 0.1;

    return (b.coverageScore - a.coverageScore) + dayBonus;
  });

  // ── 5. Trả về top-20 ứng viên (không gọi Goong per-route) ─────────────
  return candidates.slice(0, 20);
}

export async function calculateQuote(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
) {
  const { distanceKm, durationMin } = await getDirections(
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  );

  const pricing = await getActivePricing();
  const quotedPrice = calculateFare(distanceKm, pricing);

  return { distanceKm, durationMin, quotedPrice };
}

function calculateFare(
  distanceKm: number,
  pricing: { baseFare: number; perKmTiers: unknown } | null,
): number {
  if (!pricing) return Math.round(distanceKm * 5000);

  const tiers = pricing.perKmTiers as Array<{ upToKm: number; pricePerKm: number }>;
  let fare = pricing.baseFare;
  let remaining = distanceKm;

  for (const tier of tiers.sort((a, b) => a.upToKm - b.upToKm)) {
    if (remaining <= 0) break;
    const chunk = Math.min(remaining, tier.upToKm);
    fare += chunk * tier.pricePerKm;
    remaining -= chunk;
  }

  if (remaining > 0) {
    const lastTier = tiers[tiers.length - 1];
    fare += remaining * (lastTier?.pricePerKm ?? 5000);
  }

  return Math.round(fare);
}

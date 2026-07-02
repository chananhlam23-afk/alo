import { prisma } from "@/lib/db/prisma";
import { getDirections } from "@/lib/goong/directions";
import { driverNetForFare } from "@/repositories/pricing.repository";

export interface BackhaulOpportunity {
  requestId: string;
  customerId: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  seats: number;
  quotedPrice: number;
  departureTime: Date;
  distanceFromDriverKm: number;
  directionScore: number; // 0–1, càng gần chiều quay đầu càng cao
}

/**
 * Tìm cơ hội ghép chiều quay đầu (backhaul) cho tài xế vừa hoàn thành chuyến.
 *
 * Logic:
 *  1. Lấy điểm hiện tại của tài xế = điểm đến của chuyến vừa xong.
 *  2. Tìm tất cả TripRequest PENDING trong cửa sổ ±3h, có điểm đón
 *     trong vòng maxPickupKm từ vị trí tài xế.
 *  3. Ưu tiên request có hướng dropoff về gần điểm xuất phát của tài xế.
 *  4. Loại bỏ request vượt maxDetourKm so với đường thẳng về nhà.
 */
export async function findBackhaulOpportunities(
  driverProfileId: string,
  completedTripId: string,
  opts: { maxPickupKm?: number; windowHours?: number } = {},
): Promise<BackhaulOpportunity[]> {
  const { maxPickupKm = 15, windowHours = 3 } = opts;

  /* ── 1. Lấy thông tin chuyến vừa xong ─────────────────────────── */
  const trip = await prisma.trip.findUnique({
    where: { id: completedTripId },
    include: {
      passengers: { include: { request: true } },
      driverProfile: { include: { routes: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  if (!trip || trip.driverProfileId !== driverProfileId) return [];

  // Điểm hiện tại tài xế = dropoff của passenger cuối
  const lastPassenger = trip.passengers.at(-1);
  if (!lastPassenger) return [];

  const currentLat = lastPassenger.request.dropoffLat;
  const currentLng = lastPassenger.request.dropoffLng;

  // Điểm xuất phát tài xế (nhà/gốc) từ route gần nhất
  const homeRoute = trip.driverProfile.routes[0];
  const homeLat   = homeRoute?.originLat ?? currentLat;
  const homeLng   = homeRoute?.originLng ?? currentLng;

  /* ── 2. Tìm các yêu cầu PENDING trong cửa sổ thời gian ─────────── */
  const now    = new Date();
  const minDep = now;
  const maxDep = new Date(now.getTime() + windowHours * 3600_000);

  const requests = await prisma.tripRequest.findMany({
    where: {
      status: "PENDING",
      departureTime: { gte: minDep, lte: maxDep },
    },
    include: { customer: true },
    take: 100,
  });

  if (requests.length === 0) return [];

  /* ── 3. Lọc theo khoảng cách pickup + tính direction score ─────── */
  const candidates: BackhaulOpportunity[] = [];

  for (const req of requests) {
    const dPick = haversine(currentLat, currentLng, req.pickupLat, req.pickupLng);
    if (dPick > maxPickupKm) continue;

    // Direction score: dropoff của request gần home thì điểm cao
    const dDropToHome = haversine(req.dropoffLat, req.dropoffLng, homeLat, homeLng);
    const dCurrentToHome = haversine(currentLat, currentLng, homeLat, homeLng);
    // score = 1 khi dropoff == home, 0 khi dropoff ngược hướng
    const directionScore = Math.max(0, 1 - dDropToHome / Math.max(dCurrentToHome, 1));

    // Loại bỏ chuyến đi ngược hướng hoàn toàn (score < 0.1)
    if (directionScore < 0.1) continue;

    candidates.push({
      requestId: req.id,
      customerId: req.customerId,
      customerName: req.customer.fullName ?? "Khách hàng",
      pickupAddress: req.pickupAddress,
      dropoffAddress: req.dropoffAddress,
      pickupLat: req.pickupLat,
      pickupLng: req.pickupLng,
      dropoffLat: req.dropoffLat,
      dropoffLng: req.dropoffLng,
      seats: req.seats,
      quotedPrice: req.quotedPrice,
      departureTime: req.departureTime,
      distanceFromDriverKm: dPick,
      directionScore,
    });
  }

  // Sắp xếp: ưu tiên hướng về nhà → sau đó pickup gần nhất
  candidates.sort((a, b) => {
    const scoreA = a.directionScore * 2 - a.distanceFromDriverKm * 0.05;
    const scoreB = b.directionScore * 2 - b.distanceFromDriverKm * 0.05;
    return scoreB - scoreA;
  });

  return candidates.slice(0, 10);
}

/**
 * Gọi khi tài xế chấp nhận 1 cơ hội backhaul:
 * tạo TripMatch với driverRoute gần nhất.
 */
export async function acceptBackhaul(
  driverProfileId: string,
  requestId: string,
): Promise<void> {
  const [profile, request] = await Promise.all([
    prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: { routes: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.tripRequest.findUnique({ where: { id: requestId } }),
  ]);

  if (!profile || !request) throw new Error("Không tìm thấy tài xế hoặc yêu cầu");
  if (request.status !== "PENDING") throw new Error("Yêu cầu không còn khả dụng");

  const route = profile.routes[0];
  if (!route) throw new Error("Tài xế chưa có tuyến đường đăng ký");

  let detourKm = 0;
  try {
    const dir = await getDirections(
      request.pickupLat, request.pickupLng,
      request.dropoffLat, request.dropoffLng,
    );
    detourKm = dir.distanceKm;
  } catch { /* fallback 0 */ }

  const fareShare = request.quotedPrice;
  const driverNet = await driverNetForFare(fareShare);

  await prisma.tripMatch.create({
    data: {
      request: { connect: { id: requestId } },
      driverRoute: { connect: { id: route.id } },
      driverProfile: { connect: { id: driverProfileId } },
      detourKm,
      fareShare,
      driverNet,
      status: "OFFERED",
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(d: number) { return (d * Math.PI) / 180; }

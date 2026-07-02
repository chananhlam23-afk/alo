import { prisma } from "@/lib/db/prisma";
import {
  findMatchById,
  updateMatchStatus,
  updateRequestStatus,
} from "@/repositories/trip-request.repository";
import {
  createTrip,
  updateTrip,
  addPassenger,
  updatePassenger,
  findTripById,
  findPassengersByTrip,
} from "@/repositories/trip.repository";
import {
  createManyStops,
  findStopById,
  markStopDone,
  markStopSkipped,
  deleteStopsByTrip,
} from "@/repositories/trip-stop.repository";
import { ensureWallet, creditPending } from "@/repositories/wallet.repository";
import { updateDriverProfile } from "@/repositories/driver.repository";
import { broadcastToTrip, broadcastToCustomer, broadcastToDriver } from "@/lib/supabase/realtime";
import { notify, notifyMany } from "@/lib/notifications/notification.service";
import { heuristicOptimize, tspOptimize } from "@/lib/routing/optimizer";
import type { StopPoint } from "@/lib/routing/optimizer";
import { getActivePricing } from "@/repositories/pricing.repository";
import { updateDriverStreak, matchCargoToTrip } from "@/services/cargo.service";

const USE_TSP = process.env.USE_ROUTE_OPTIMIZER === "true";

// ─── Accept match → add passenger to trip ────────────────────────────────────

export async function acceptMatch(matchId: string, driverProfileId: string) {
  const match = await findMatchById(matchId);
  if (!match) throw new Error("Không tìm thấy ghép chuyến");
  if (match.driverProfileId !== driverProfileId) throw new Error("Không có quyền");
  if (match.status !== "OFFERED") throw new Error("Ghép chuyến không còn khả dụng");
  if (match.expiresAt < new Date()) throw new Error("Ghép chuyến đã hết hạn");

  const request = match.request;
  const route = match.driverRoute;
  if (!route) throw new Error("Ghép chuyến không có lộ trình");

  const tripId = await prisma.$transaction(async (tx) => {
    // Find or create trip for this route
    let trip = await tx.trip.findFirst({
      where: {
        driverProfileId,
        driverRouteId: route.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      include: { passengers: true, stops: { orderBy: { order: "asc" } } },
    });

    if (!trip) {
      trip = await tx.trip.create({
        data: {
          driverProfile: { connect: { id: driverProfileId } },
          driverRouteId: route.id,
          seatsTotal: route.availableSeats,
          seatsFilled: 0,
        },
        include: { passengers: true, stops: { orderBy: { order: "asc" } } },
      });
    }

    if (trip.seatsFilled + request.seats > trip.seatsTotal) {
      throw new Error("Không đủ chỗ trống");
    }

    await tx.tripPassenger.create({
      data: {
        trip: { connect: { id: trip.id } },
        request: { connect: { id: request.id } },
        customerId: request.customerId,
        seats: request.seats,
        fareShare: match.fareShare,
        legStatus: "WAITING",
      },
    });

    await tx.trip.update({
      where: { id: trip.id },
      data: { seatsFilled: { increment: request.seats }, status: "ACTIVE" },
    });

    await tx.tripMatch.update({
      where: { id: matchId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await tx.tripRequest.update({
      where: { id: request.id },
      data: { status: "MATCHED" },
    });

    // Return the trip ID; stops will be rebuilt AFTER the transaction commits
    return trip.id;
  });

  // Build optimized stops after the transaction has committed so all
  // passengers are visible to the main prisma client
  await buildStopsForTrip(tripId, driverProfileId).catch(() => {
    // non-fatal — trip is usable even with unoptimized stops
  });

  const updatedTrip = await findTripById(tripId);
  if (!updatedTrip) throw new Error("Không tìm thấy chuyến sau khi tạo");

  void sendTripAcceptedNotifications(match, updatedTrip);

  return updatedTrip;
}

// ─── Rebuild optimized stops for a trip ──────────────────────────────────────

export async function buildStopsForTrip(tripId: string, driverProfileId: string) {
  const trip = await findTripById(tripId);
  if (!trip) throw new Error("Không tìm thấy chuyến");

  await deleteStopsByTrip(tripId);

  const rawStops: StopPoint[] = trip.passengers.flatMap((p) => {
    const req = p.request;
    if (!req) return [];
    return [
      {
        id: `pickup-${p.id}`,
        tripPassengerId: p.id,
        type: "PICKUP" as const,
        lat: req.pickupLat,
        lng: req.pickupLng,
        address: req.pickupAddress,
        seats: p.seats,
      },
      {
        id: `dropoff-${p.id}`,
        tripPassengerId: p.id,
        type: "DROPOFF" as const,
        lat: req.dropoffLat,
        lng: req.dropoffLng,
        address: req.dropoffAddress,
        seats: p.seats,
      },
    ];
  });

  const driverRoute = await prisma.driverRoute.findFirst({
    where: { driverProfileId },
    orderBy: { createdAt: "desc" },
  });

  const driverLat = driverRoute?.originLat ?? 0;
  const driverLng = driverRoute?.originLng ?? 0;

  const optimized =
    USE_TSP && rawStops.length <= 12
      ? await tspOptimize(rawStops, driverLat, driverLng)
      : await heuristicOptimize(rawStops, driverLat, driverLng);

  const stopsData = optimized.map((s) => ({
    tripId,
    passengerId: s.tripPassengerId,
    order: s.order,
    type: s.type,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
  }));

  await createManyStops(stopsData);

  let pickupIdx = 1;
  for (const s of optimized) {
    if (s.type === "PICKUP") {
      await prisma.tripPassenger.updateMany({
        where: { id: s.tripPassengerId },
        data: { pickupOrder: s.pickupOrder ?? pickupIdx++ },
      });
    }
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: { optimizedAt: new Date() },
  });

  return optimized;
}

// ─── Trip lifecycle ───────────────────────────────────────────────────────────

export async function startTrip(tripId: string, driverProfileId: string) {
  const trip = await findTripById(tripId);
  if (!trip) throw new Error("Không tìm thấy chuyến");
  if (trip.driverProfileId !== driverProfileId) throw new Error("Không có quyền");
  if (trip.status !== "ACTIVE") throw new Error("Chuyến chưa sẵn sàng");

  const updated = await updateTrip(tripId, { status: "ONGOING", startedAt: new Date() });

  await broadcastToTrip(tripId, "trip.status", { status: "ONGOING" });

  const driverName = trip.driverProfile.user.fullName ?? trip.driverProfile.user.phone ?? "Tài xế";
  const plate      = trip.driverProfile.vehiclePlate;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "https://thuanduong.vn";
  const trackingUrl = `${appUrl}/customer/trips/${tripId}`;

  const passengers = await findPassengersByTrip(tripId);

  await Promise.allSettled(
    passengers.map(async (p) => {
      // Realtime broadcast
      broadcastToCustomer(p.customerId, "trip.started", { tripId }).catch(() => {});

      // Fetch passenger request data for personalised email
      const passengerWithRequest = trip.passengers.find((tp) => tp.id === p.id);
      const req = passengerWithRequest?.request;

      void notify({
        userId: p.customerId,
        event: "TRIP_STARTED",
        templateData: {
          passengerName:  req?.passengerName ?? "Quý khách",
          driverName,
          plate,
          pickupAddress:  req?.pickupAddress  ?? "",
          dropoffAddress: req?.dropoffAddress ?? "",
          pickupOrder:    String(p.pickupOrder ?? 1),
          trackingUrl,
        },
      });
    }),
  );

  return updated;
}

export async function completeStop(
  tripId: string,
  stopId: string,
  driverProfileId: string,
) {
  const trip = await findTripById(tripId);
  if (!trip) throw new Error("Không tìm thấy chuyến");
  if (trip.driverProfileId !== driverProfileId) throw new Error("Không có quyền");

  const stop = await findStopById(stopId);
  if (!stop || stop.tripId !== tripId) throw new Error("Không tìm thấy mốc");
  if (stop.status !== "PENDING") throw new Error("Mốc đã hoàn thành");
  if (stop.order !== trip.currentStopIndex + 1) throw new Error("Phải hoàn tất các mốc theo thứ tự");

  await markStopDone(stopId);

  if (stop.type === "PICKUP") {
    await updatePassenger(stop.passengerId, { legStatus: "PICKED_UP" });
  } else {
    await updatePassenger(stop.passengerId, { legStatus: "DROPPED" });
  }

  const nextIndex = trip.currentStopIndex + 1;
  await updateTrip(tripId, { currentStopIndex: nextIndex });

  const nextStop = trip.stops.find((s) => s.order === nextIndex + 1) ?? null;

  await broadcastToTrip(tripId, "trip.stop_completed", {
    stopId,
    type: stop.type,
    passengerId: stop.passengerId,
  });

  await broadcastToTrip(tripId, "trip.current_stop", {
    currentStopIndex: nextIndex,
    currentStop: nextStop,
  });

  return { currentStopIndex: nextIndex, nextStop };
}

export async function markNoShow(tripId: string, stopId: string, driverProfileId: string) {
  const trip = await findTripById(tripId);
  if (!trip || trip.driverProfileId !== driverProfileId) throw new Error("Không có quyền");

  const stop = await findStopById(stopId);
  if (!stop || stop.tripId !== tripId || stop.type !== "PICKUP") throw new Error("Mốc không hợp lệ");
  if (stop.order !== trip.currentStopIndex + 1) throw new Error("Phải xử lý các mốc theo thứ tự");

  await markStopSkipped(stopId);

  const dropoffStop = trip.stops.find(
    (s) => s.passengerId === stop.passengerId && s.type === "DROPOFF",
  );
  if (dropoffStop) await markStopSkipped(dropoffStop.id);

  await updatePassenger(stop.passengerId, { legStatus: "NO_SHOW" });

  const nextIndex = trip.currentStopIndex + 1;
  await updateTrip(tripId, { currentStopIndex: nextIndex });

  return { currentStopIndex: nextIndex };
}

export async function completeTrip(tripId: string, driverProfileId: string) {
  const trip = await findTripById(tripId);
  if (!trip) throw new Error("Không tìm thấy chuyến");
  if (trip.driverProfileId !== driverProfileId) throw new Error("Không có quyền");
  if (trip.status !== "ONGOING") throw new Error("Chuyến chưa bắt đầu");

  const updated = await updateTrip(tripId, { status: "COMPLETED", completedAt: new Date() });

  await updateDriverProfile(driverProfileId, { totalTrips: { increment: 1 } });
  void updateDriverStreak(driverProfileId);

  const pricing = await getActivePricing();
  const commission = pricing?.commissionPct ?? 0.15;
  const wallet = await ensureWallet(driverProfileId);

  const passengers = await findPassengersByTrip(tripId);
  const totalEarned = passengers
    .filter((p) => p.legStatus === "DROPPED" || p.legStatus === "PICKED_UP")
    .reduce((sum, p) => sum + Math.round(p.fareShare * (1 - commission)), 0);

  if (totalEarned > 0) {
    await creditPending(wallet.id, totalEarned, tripId);
  }

  await broadcastToTrip(tripId, "trip.status", { status: "COMPLETED" });
  for (const p of passengers) {
    await broadcastToCustomer(p.customerId, "trip.completed", { tripId });
  }

  return updated;
}

// ─── Realtime location ────────────────────────────────────────────────────────

export async function updateDriverLocation(
  tripId: string,
  driverProfileId: string,
  lat: number,
  lng: number,
  heading?: number,
) {
  // Chống IDOR: chỉ tài xế của chuyến mới được phát vị trí lên kênh chuyến đó.
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { driverProfileId: true } });
  if (!trip || trip.driverProfileId !== driverProfileId) throw new Error("Không có quyền");
  await broadcastToTrip(tripId, "driver.location", { lat, lng, heading });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sendTripAcceptedNotifications(
  match: Awaited<ReturnType<typeof findMatchById>>,
  trip: NonNullable<Awaited<ReturnType<typeof findTripById>>>,
) {
  if (!match) return;
  const totalPassengers = trip.passengers.length;
  const driverName = trip.driverProfile.user.fullName ?? "Tài xế";
  const plate = trip.driverProfile.vehiclePlate;

  for (const p of trip.passengers) {
    const departureTime = p.request?.departureTime?.toISOString() ?? "";
    const customerUser = await prisma.user.findUnique({
      where: { id: p.customerId },
      select: { phone: true, email: true },
    }).catch(() => null);

    await notify({
      userId: p.customerId,
      phone:  customerUser?.phone ?? undefined,
      email:  customerUser?.email ?? undefined,
      event: "TRIP_ACCEPTED",
      templateData: {
        driverName,
        plate,
        departureTime,
        pickupOrder:     String(p.pickupOrder ?? 1),
        totalPassengers: String(totalPassengers),
      },
    });
  }
}

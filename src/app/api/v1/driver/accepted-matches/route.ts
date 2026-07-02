import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");

  const matches = await prisma.tripMatch.findMany({
    where: { driverProfileId: driver.id, status: "ACCEPTED" },
    include: {
      request: {
        select: {
          id: true,
          passengerName: true,
          passengerPhone: true,
          pickupAddress: true,
          pickupLat: true,
          pickupLng: true,
          dropoffAddress: true,
          dropoffLat: true,
          dropoffLng: true,
          departureTime: true,
          seats: true,
          distanceKm: true,
          durationMin: true,
          status: true,
        },
      },
      driverRoute: {
        select: {
          id: true,
          originAddress: true,
          destAddress: true,
          originLat: true,
          originLng: true,
          destLat: true,
          destLng: true,
          departureTime: true,
          availableSeats: true,
          maxDetourKm: true,
        },
      },
    },
    orderBy: { offeredAt: "asc" },
  });

  // Group matches by driverRouteId; fallback: group by departure hour window (±2h)
  const groups = new Map<string, typeof matches>();

  for (const m of matches) {
    const key = m.driverRouteId
      ? `route:${m.driverRouteId}`
      : `time:${Math.floor(new Date(m.request.departureTime).getTime() / (2 * 3600 * 1000))}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  // Build trip groups with optimised stop order
  const tripGroups = Array.from(groups.entries()).map(([key, groupMatches]) => {
    const route = groupMatches[0].driverRoute;

    // Sort stops along driver route using flat-earth projection parameter t
    const withT = groupMatches.map((m) => {
      const pLat = m.request.pickupLat;
      const pLng = m.request.pickupLng;
      const dLat = m.request.dropoffLat;
      const dLng = m.request.dropoffLng;

      let tPickup = 0.5;
      let tDropoff = 0.8;

      if (route) {
        const dx = route.destLat - route.originLat;
        const dy = route.destLng - route.originLng;
        const len2 = dx * dx + dy * dy;
        if (len2 > 1e-12) {
          tPickup  = Math.max(0, Math.min(1, ((pLat - route.originLat) * dx + (pLng - route.originLng) * dy) / len2));
          tDropoff = Math.max(0, Math.min(1, ((dLat - route.originLat) * dx + (dLng - route.originLng) * dy) / len2));
        }
      }

      return { match: m, tPickup, tDropoff };
    });

    // Build ordered stop list: pickups ASC by t, then dropoffs ASC by t
    const pickupsSorted  = [...withT].sort((a, b) => a.tPickup  - b.tPickup);
    const dropoffsSorted = [...withT].sort((a, b) => a.tDropoff - b.tDropoff);

    const stops = [
      ...pickupsSorted.map((x, i) => ({
        order: i + 1,
        type: "PICKUP" as const,
        matchId: x.match.id,
        passengerName: x.match.request.passengerName,
        passengerPhone: x.match.request.passengerPhone,
        address: x.match.request.pickupAddress,
        lat: x.match.request.pickupLat,
        lng: x.match.request.pickupLng,
        t: x.tPickup,
      })),
      ...dropoffsSorted.map((x, i) => ({
        order: pickupsSorted.length + i + 1,
        type: "DROPOFF" as const,
        matchId: x.match.id,
        passengerName: x.match.request.passengerName,
        passengerPhone: x.match.request.passengerPhone,
        address: x.match.request.dropoffAddress,
        lat: x.match.request.dropoffLat,
        lng: x.match.request.dropoffLng,
        t: x.tDropoff,
      })),
    ];

    const totalEarnings   = groupMatches.reduce((s, m) => s + m.driverNet,  0);
    const totalFare       = groupMatches.reduce((s, m) => s + m.fareShare,  0);
    const totalSeats      = groupMatches.reduce((s, m) => s + m.request.seats, 0);
    const maxDistanceKm   = Math.max(...groupMatches.map((m) => m.request.distanceKm));
    const earliestDep     = groupMatches.reduce((min, m) =>
      new Date(m.request.departureTime) < new Date(min) ? m.request.departureTime : min,
      groupMatches[0].request.departureTime,
    );

    return {
      groupKey: key,
      routeId:  route?.id ?? null,
      routeOrigin: route?.originAddress ?? null,
      routeDest:   route?.destAddress   ?? null,
      departureTime: route?.departureTime?.toISOString() ?? earliestDep,
      totalEarnings,
      totalFare,
      totalSeats,
      maxDistanceKm,
      passengerCount: groupMatches.length,
      stops,
      matches: groupMatches.map((m) => ({
        id: m.id,
        fareShare: m.fareShare,
        driverNet: m.driverNet,
        request: m.request,
      })),
    };
  });

  // Sort trip groups by departure time
  tripGroups.sort((a, b) =>
    new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime(),
  );

  return ok({ tripGroups, totalMatches: matches.length });
}

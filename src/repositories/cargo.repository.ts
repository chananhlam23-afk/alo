import { prisma } from "@/lib/db/prisma";
import type { CargoStatus } from "@prisma/client";

export function createCargoRequest(data: {
  senderId: string;
  receiverName: string; receiverPhone: string;
  pickupAddress: string; pickupLat: number; pickupLng: number;
  dropoffAddress: string; dropoffLat: number; dropoffLng: number;
  weightKg: number; description?: string;
  quotedPrice: number; expiresAt: Date;
}) {
  return prisma.cargoRequest.create({ data });
}

export function findCargoById(id: string) {
  return prisma.cargoRequest.findUnique({ where: { id }, include: { sender: true, trip: true } });
}

export function findCargoBySender(senderId: string, status?: CargoStatus) {
  return prisma.cargoRequest.findMany({
    where: { senderId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export function findPendingCargoNearRoute(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  radiusKm = 20,
) {
  // Dùng bounding-box đơn giản thay ST_DWithin vì không có PostGIS trong Prisma raw
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((originLat * Math.PI) / 180));
  const destLatDelta = radiusKm / 111;
  const destLngDelta = radiusKm / (111 * Math.cos((destLat * Math.PI) / 180));

  return prisma.cargoRequest.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gt: new Date() },
      // Điểm đón gần điểm đón của chuyến...
      pickupLat:  { gte: originLat - latDelta, lte: originLat + latDelta },
      pickupLng:  { gte: originLng - lngDelta, lte: originLng + lngDelta },
      // ...VÀ điểm giao cùng hướng với điểm đến (không nhận hàng ngược chiều).
      dropoffLat: { gte: destLat - destLatDelta, lte: destLat + destLatDelta },
      dropoffLng: { gte: destLng - destLngDelta, lte: destLng + destLngDelta },
    },
    include: { sender: true },
    take: 30,
  });
}

export function updateCargoStatus(
  id: string,
  status: CargoStatus,
  extra?: { tripId?: string; assignedAt?: Date; deliveredAt?: Date },
) {
  return prisma.cargoRequest.update({ where: { id }, data: { status, ...extra } });
}

export function cancelCargo(id: string, senderId: string) {
  return prisma.cargoRequest.updateMany({
    where: { id, senderId, status: { in: ["PENDING", "MATCHED"] } },
    data: { status: "CANCELLED" },
  });
}

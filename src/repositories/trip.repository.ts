import { prisma } from "@/lib/db/prisma";
import type { Prisma, TripStatus } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

// Chỉ lộ các trường an toàn của tài xế cho khách (không passwordHash/email...).
const DRIVER_PUBLIC_USER = { fullName: true, phone: true, avatarUrl: true } as const;

export function findTripById(id: string) {
  return prisma.trip.findUnique({
    where: { id },
    include: {
      passengers: { include: { request: true } },
      stops: { orderBy: { order: "asc" } },
      driverProfile: { include: { user: { select: DRIVER_PUBLIC_USER } } },
    },
  });
}

export function findActiveTripByDriver(driverProfileId: string) {
  return prisma.trip.findFirst({
    where: { driverProfileId, status: { in: ["ACTIVE", "ONGOING"] } },
    include: {
      passengers: { include: { request: true } },
      stops: { orderBy: { order: "asc" } },
    },
  });
}

export function findTripsByDriver(driverProfileId: string, status?: TripStatus) {
  return prisma.trip.findMany({
    where: { driverProfileId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export function findTripsByCustomer(customerId: string, params: { page: number; limit: number; status?: TripStatus }) {
  const skip = (params.page - 1) * params.limit;
  return prisma.$transaction([
    prisma.trip.findMany({
      where: { passengers: { some: { customerId } }, ...(params.status ? { status: params.status } : {}) },
      include: { driverProfile: { include: { user: { select: DRIVER_PUBLIC_USER } } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: params.limit,
    }),
    prisma.trip.count({
      where: { passengers: { some: { customerId } }, ...(params.status ? { status: params.status } : {}) },
    }),
  ]);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createTrip(data: Prisma.TripCreateInput) {
  return prisma.trip.create({ data });
}

export function updateTrip(id: string, data: Prisma.TripUpdateInput) {
  return prisma.trip.update({ where: { id }, data });
}

export function addPassenger(data: Prisma.TripPassengerCreateInput) {
  return prisma.tripPassenger.create({ data });
}

export function updatePassenger(id: string, data: Prisma.TripPassengerUpdateInput) {
  return prisma.tripPassenger.update({ where: { id }, data });
}

export function findPassengerByRequest(requestId: string) {
  return prisma.tripPassenger.findUnique({ where: { requestId } });
}

export function findPassengersByTrip(tripId: string) {
  return prisma.tripPassenger.findMany({
    where: { tripId },
    orderBy: { pickupOrder: "asc" },
  });
}

// ─── Admin list ───────────────────────────────────────────────────────────────

export function listTrips(params: {
  page: number;
  limit: number;
  status?: TripStatus;
  from?: Date;
  to?: Date;
}) {
  const skip = (params.page - 1) * params.limit;
  const where: Prisma.TripWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = params.from;
    if (params.to) where.createdAt.lte = params.to;
  }

  return prisma.$transaction([
    prisma.trip.findMany({
      where,
      include: {
        driverProfile: { include: { user: true } },
        passengers: {
          include: {
            request: {
              select: {
                id: true, passengerName: true, passengerPhone: true,
                pickupAddress: true, dropoffAddress: true,
                departureTime: true, seats: true, quotedPrice: true,
              },
            },
          },
          orderBy: { pickupOrder: "asc" },
        },
      },
      skip,
      take: params.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.trip.count({ where }),
  ]);
}

import { prisma } from "@/lib/db/prisma";
import type { Prisma, TripRequestStatus } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

export function findRequestById(id: string) {
  return prisma.tripRequest.findUnique({
    where: { id },
    include: { matches: true, tripPassenger: { include: { trip: true } } },
  });
}

export async function findRequestsByCustomer(
  customerId: string,
  status?: TripRequestStatus,
  page = 1,
  limit = 20,
) {
  const where: Prisma.TripRequestWhereInput = { customerId, ...(status ? { status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.tripRequest.findMany({
      where,
      include: {
        matches: {
          where: { status: "ACCEPTED" },
          include: {
            // Chỉ lấy field cần hiển thị — tránh trả về cả User (gồm passwordHash) ra client.
            driverProfile: {
              select: {
                vehiclePlate: true,
                vehicleType: true,
                rating: true,
                user: { select: { fullName: true, phone: true } },
              },
            },
          },
        },
        // Kèm trạng thái Trip để phân biệt chuyến đã HOÀN THÀNH (TripRequest.status
        // không có COMPLETED — chuyến xong vẫn ở MATCHED).
        tripPassenger: { select: { tripId: true, legStatus: true, trip: { select: { status: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tripRequest.count({ where }),
  ]);
  return { items, total };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createTripRequest(data: Prisma.TripRequestCreateInput) {
  return prisma.tripRequest.create({ data });
}

export function updateRequestStatus(id: string, status: TripRequestStatus) {
  return prisma.tripRequest.update({ where: { id }, data: { status } });
}

// ─── Match ────────────────────────────────────────────────────────────────────

export function createMatch(data: Prisma.TripMatchCreateInput) {
  return prisma.tripMatch.create({ data });
}

export function findMatchById(id: string) {
  return prisma.tripMatch.findUnique({
    where: { id },
    include: {
      request: true,
      driverRoute: true,
      driverProfile: { include: { user: true } },
    },
  });
}

export function findOfferedMatchesByDriver(driverProfileId: string) {
  return prisma.tripMatch.findMany({
    where: { driverProfileId, status: "OFFERED", expiresAt: { gt: new Date() } },
    include: { request: true },
    orderBy: { offeredAt: "desc" },
  });
}

export function updateMatchStatus(
  id: string,
  status: "ACCEPTED" | "REJECTED" | "EXPIRED",
) {
  return prisma.tripMatch.update({
    where: { id },
    data: { status, respondedAt: new Date() },
  });
}

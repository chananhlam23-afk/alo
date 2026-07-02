import { prisma } from "@/lib/db/prisma";
import type { Prisma, VerificationStatus, DocumentType } from "@prisma/client";

// ─── Profile ──────────────────────────────────────────────────────────────────

export function findDriverByUserId(userId: string) {
  return prisma.driverProfile.findUnique({
    where: { userId },
    include: { documents: true, wallet: true },
  });
}

export function findDriverById(id: string) {
  return prisma.driverProfile.findUnique({
    where: { id },
    include: { documents: true, user: true },
  });
}

export function createDriverProfile(data: Prisma.DriverProfileCreateInput) {
  return prisma.driverProfile.create({ data });
}

export function updateDriverProfile(id: string, data: Prisma.DriverProfileUpdateInput) {
  return prisma.driverProfile.update({ where: { id }, data });
}

// ─── KYC Docs ─────────────────────────────────────────────────────────────────

export function addKycDocument(data: {
  driverProfileId: string;
  type: string;
  url: string;
}) {
  return prisma.kycDocument.create({
    data: {
      driverProfile: { connect: { id: data.driverProfileId } },
      type: data.type as DocumentType,
      url: data.url,
    },
  });
}

/** Thay toàn bộ giấy tờ của hồ sơ bằng bộ mới (atomic) — dùng khi nộp lại hồ sơ. */
export function replaceKycDocuments(
  driverProfileId: string,
  docs: Array<{ type: string; url: string }>,
) {
  return prisma.$transaction([
    prisma.kycDocument.deleteMany({ where: { driverProfileId } }),
    prisma.kycDocument.createMany({
      data: docs.map((d) => ({
        driverProfileId,
        type: d.type as DocumentType,
        url: d.url,
      })),
    }),
  ]);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export function createRoute(data: Prisma.DriverRouteCreateInput) {
  return prisma.driverRoute.create({ data });
}

export function findRouteById(id: string) {
  return prisma.driverRoute.findUnique({ where: { id }, include: { driverProfile: true } });
}

export function findRoutesByDriver(driverProfileId: string, status?: string) {
  return prisma.driverRoute.findMany({
    where: {
      driverProfileId,
      ...(status ? { status: status as Prisma.EnumRouteStatusFilter } : {}),
    },
    orderBy: { departureTime: "asc" },
  });
}

export function updateRoute(id: string, data: Prisma.DriverRouteUpdateInput) {
  return prisma.driverRoute.update({ where: { id }, data });
}

// ─── Admin list ───────────────────────────────────────────────────────────────

export async function listDrivers(params: {
  page: number;
  limit: number;
  status?: VerificationStatus;
  search?: string;
}) {
  const skip = (params.page - 1) * params.limit;
  const where: Prisma.DriverProfileWhereInput = {};
  if (params.status) where.verificationStatus = params.status;
  if (params.search) {
    where.OR = [
      { user: { fullName: { contains: params.search, mode: "insensitive" } } },
      { user: { phone: { contains: params.search } } },
      { vehiclePlate: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total, grandTotal, pending, approved, rejected, online] =
    await prisma.$transaction([
      prisma.driverProfile.findMany({
        where,
        include: { user: true, documents: true },
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.driverProfile.count({ where }),
      prisma.driverProfile.count(),
      prisma.driverProfile.count({ where: { verificationStatus: "PENDING" } }),
      prisma.driverProfile.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.driverProfile.count({ where: { verificationStatus: "REJECTED" } }),
      prisma.driverProfile.count({ where: { isOnline: true } }),
    ]);

  const stats = { total: grandTotal, pending, approved, rejected, online };

  return { items, total, stats };
}

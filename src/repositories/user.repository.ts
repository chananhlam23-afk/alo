import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

// Mọi trường của User TRỪ passwordHash — không bao giờ trả hash mật khẩu ra API.
const USER_PUBLIC_SELECT = {
  id: true, phone: true, email: true, emailVerified: true,
  fullName: true, avatarUrl: true, role: true, isBlocked: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.UserSelect;

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { ...USER_PUBLIC_SELECT, driverProfile: true },
  });
}

export function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data, select: USER_PUBLIC_SELECT });
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.refreshToken.create({ data });
}

export function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export function deleteRefreshToken(id: string) {
  return prisma.refreshToken.delete({ where: { id } });
}

export function deleteAllUserRefreshTokens(userId: string) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

export function createOtp(data: {
  phone: string;
  codeHash: string;
  expiresAt: Date;
}) {
  return prisma.otpRecord.create({ data });
}

export function findUnusedOtp(id: string) {
  return prisma.otpRecord.findFirst({
    where: { id, used: false, expiresAt: { gt: new Date() } },
  });
}

export function markOtpUsed(id: string) {
  return prisma.otpRecord.update({ where: { id }, data: { used: true } });
}

export function incrementOtpAttempts(id: string) {
  return prisma.otpRecord.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
}

export function countRecentOtps(phone: string, since: Date) {
  return prisma.otpRecord.count({
    where: { phone, createdAt: { gte: since } },
  });
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export function upsertDevice(userId: string, platform: string, fcmToken: string) {
  return prisma.device.upsert({
    where: { userId_platform: { userId, platform } },
    create: { userId, platform, fcmToken },
    update: { fcmToken },
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function listUsers(params: {
  page: number;
  limit: number;
  status?: string;       // "blocked" | "active"
  role?: string;         // CUSTOMER | DRIVER | ADMIN
  search?: string;       // phone / email / fullName
}) {
  const skip = (params.page - 1) * params.limit;
  const where: Prisma.UserWhereInput = {};
  if (params.status === "blocked") where.isBlocked = true;
  if (params.status === "active") where.isBlocked = false;
  if (params.role && ["CUSTOMER", "DRIVER", "ADMIN"].includes(params.role)) {
    where.role = params.role as Prisma.UserWhereInput["role"];
  }
  if (params.search) {
    where.OR = [
      { phone:    { contains: params.search, mode: "insensitive" } },
      { email:    { contains: params.search, mode: "insensitive" } },
      { fullName: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total, customers, drivers, admins, blocked, grandTotal] = await prisma.$transaction([
    prisma.user.findMany({
      where, skip, take: params.limit, orderBy: { createdAt: "desc" },
      select: {
        id: true, phone: true, email: true, fullName: true, avatarUrl: true,
        role: true, isBlocked: true, createdAt: true,
        driverProfile: {
          select: { verificationStatus: true, rating: true, totalTrips: true, vehiclePlate: true, isOnline: true },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "DRIVER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count(),
  ]);

  const stats = { total: grandTotal, customers, drivers, admins, blocked };

  return { items, total, stats };
}

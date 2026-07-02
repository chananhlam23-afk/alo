import { prisma } from "@/lib/db/prisma";
import type { WalletTxType, Prisma } from "@prisma/client";

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function findWalletByDriver(driverProfileId: string) {
  return prisma.driverWallet.findUnique({
    where: { driverProfileId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export function ensureWallet(driverProfileId: string) {
  return prisma.driverWallet.upsert({
    where: { driverProfileId },
    create: { driverProfileId },
    update: {},
  });
}

export function creditPending(walletId: string, amount: number, tripId: string) {
  return prisma.$transaction([
    prisma.driverWallet.update({
      where: { id: walletId },
      data: { pendingBalance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId,
        amount,
        type: "TRIP_CREDIT",
        description: `Thu nhập chuyến ${tripId}`,
        tripId,
        availableAt: new Date(Date.now() + holdDaysMs()),
      },
    }),
  ]);
}

export async function releaseMaturedTransactions() {
  const now = new Date();
  const pendingTx = await prisma.walletTransaction.findMany({
    where: { type: "TRIP_CREDIT", availableAt: { lte: now }, releasedAt: null },
    include: { wallet: true },
  });

  for (const tx of pendingTx) {
    await prisma.$transaction([
      prisma.driverWallet.update({
        where: { id: tx.walletId },
        data: {
          pendingBalance: { decrement: tx.amount },
          withdrawableBalance: { increment: tx.amount },
        },
      }),
      // Giữ nguyên type TRIP_CREDIT (chỉ đánh dấu releasedAt) để lịch sử thu nhập
      // của tài xế không bị mất — releasedAt đã đủ phân biệt pending vs đã rút được.
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: { releasedAt: now },
      }),
    ]);
  }

  return pendingTx.length;
}

function holdDaysMs(): number {
  return (Number(process.env.WALLET_HOLD_DAYS ?? 3)) * 24 * 60 * 60 * 1000;
}

// ─── Withdrawal ───────────────────────────────────────────────────────────────

export function createWithdrawal(data: {
  driverProfileId: string;
  amount: number;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}) {
  return prisma.withdrawalRequest.create({ data });
}

/**
 * Trừ số dư + tạo giao dịch + tạo yêu cầu rút — tất cả trong MỘT transaction,
 * với điều kiện số dư đủ (updateMany + gte) để chống double-spend khi gọi đồng thời.
 * Trả về yêu cầu rút, hoặc null nếu số dư không đủ.
 */
export function createWithdrawalAtomic(params: {
  walletId: string;
  driverProfileId: string;
  amount: number;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.driverWallet.updateMany({
      where: { id: params.walletId, withdrawableBalance: { gte: params.amount } },
      data: { withdrawableBalance: { decrement: params.amount } },
    });
    if (res.count !== 1) return null; // số dư không đủ hoặc bị thay đổi đồng thời

    await tx.walletTransaction.create({
      data: {
        walletId: params.walletId,
        amount: -params.amount,
        type: "WITHDRAWAL",
        description: "Yêu cầu rút tiền",
      },
    });
    return tx.withdrawalRequest.create({
      data: {
        driverProfileId: params.driverProfileId,
        amount: params.amount,
        bankName: params.bankName,
        bankAccountNo: params.bankAccountNo,
        bankAccountName: params.bankAccountName,
      },
    });
  });
}

export function findWithdrawalById(id: string) {
  return prisma.withdrawalRequest.findUnique({ where: { id }, include: { driverProfile: { include: { user: true } } } });
}

export function listWithdrawals(params: {
  driverProfileId?: string;
  status?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const skip = (params.page - 1) * params.limit;
  const where: Prisma.WithdrawalRequestWhereInput = {
    ...(params.driverProfileId ? { driverProfileId: params.driverProfileId } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.search ? {
      OR: [
        { bankName:        { contains: params.search, mode: "insensitive" } },
        { bankAccountName: { contains: params.search, mode: "insensitive" } },
        { bankAccountNo:   { contains: params.search } },
        { driverProfile: { user: { OR: [
          { phone:    { contains: params.search } },
          { fullName: { contains: params.search, mode: "insensitive" } },
        ] } } },
      ],
    } : {}),
  };
  return prisma.$transaction([
    prisma.withdrawalRequest.findMany({
      where,
      include: { driverProfile: { include: { user: true } } },
      skip,
      take: params.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);
}

/** Thống kê rút tiền cho admin: số lượng theo trạng thái + tổng tiền đang chờ duyệt. */
export async function withdrawalStats() {
  const [pending, approved, processing, rejected, done, pendingAgg] = await prisma.$transaction([
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.count({ where: { status: "APPROVED" } }),
    prisma.withdrawalRequest.count({ where: { status: "PROCESSING" } }),
    prisma.withdrawalRequest.count({ where: { status: "REJECTED" } }),
    prisma.withdrawalRequest.count({ where: { status: "DONE" } }),
    prisma.withdrawalRequest.aggregate({ _sum: { amount: true }, where: { status: "PENDING" } }),
  ]);
  return { pending, approved, processing, rejected, done, pendingAmount: pendingAgg._sum.amount ?? 0 };
}

export function updateWithdrawal(
  id: string,
  data: {
    status: "APPROVED" | "REJECTED" | "PROCESSING" | "DONE";
    adminNote?: string;
    processedAt?: Date;
  },
) {
  return prisma.withdrawalRequest.update({ where: { id }, data });
}

export function deductWithdrawable(walletId: string, amount: number, note: string) {
  return prisma.$transaction([
    prisma.driverWallet.update({
      where: { id: walletId },
      data: { withdrawableBalance: { decrement: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId,
        amount: -amount,
        type: "WITHDRAWAL",
        description: note,
      },
    }),
  ]);
}

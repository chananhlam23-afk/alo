import { prisma } from "@/lib/db/prisma";

/**
 * Ghi nhận một lượt dùng voucher gắn với yêu cầu chuyến, đồng thời tăng usedCount
 * có điều kiện (không vượt tổng lượt). Tất cả trong một transaction.
 * requestId là @unique → nếu yêu cầu này đã ghi lượt rồi thì ném lỗi (chống ghi trùng).
 */
export function recordVoucherUsage(params: {
  voucherId: string;
  userId: string;
  requestId: string;
  discount: number;
  usageLimit: number | null;
}) {
  return prisma.$transaction([
    prisma.voucherUsage.create({
      data: {
        voucherId: params.voucherId,
        userId: params.userId,
        requestId: params.requestId,
        discount: params.discount,
      },
    }),
    prisma.voucher.updateMany({
      where: {
        id: params.voucherId,
        ...(params.usageLimit !== null ? { usedCount: { lt: params.usageLimit } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
}

/**
 * Hoàn lại lượt dùng voucher đã ghi cho một yêu cầu chuyến (khi hủy / hết hạn):
 * xóa bản ghi VoucherUsage và giảm usedCount (không âm). Idempotent — không có
 * bản ghi thì bỏ qua.
 */
export async function refundVoucherForRequest(requestId: string): Promise<void> {
  const usage = await prisma.voucherUsage.findUnique({ where: { requestId } });
  if (!usage) return;
  await prisma.$transaction([
    prisma.voucherUsage.delete({ where: { id: usage.id } }),
    prisma.voucher.updateMany({
      where: { id: usage.voucherId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    }),
  ]);
}

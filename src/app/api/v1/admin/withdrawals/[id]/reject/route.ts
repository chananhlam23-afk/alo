import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { RejectWithdrawalSchema } from "@/validators/admin.validator";
import {
  findWithdrawalById,
  ensureWallet,
} from "@/repositories/wallet.repository";
import { prisma } from "@/lib/db/prisma";
import { notify } from "@/lib/notifications/notification.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = RejectWithdrawalSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const wr = await findWithdrawalById(params.id);
  if (!wr) return Errors.notFound();
  if (wr.status !== "PENDING") return Errors.conflict("Yêu cầu không ở trạng thái chờ");

  const wallet = await ensureWallet(wr.driverProfileId);

  // Lật trạng thái có điều kiện TRƯỚC (updateMany re-check DB) — chỉ hoàn tiền khi
  // thực sự chuyển được PENDING→REJECTED, chống hoàn tiền 2 lần khi retry/đồng thời.
  const done = await prisma.$transaction(async (tx) => {
    const flip = await tx.withdrawalRequest.updateMany({
      where: { id: params.id, status: "PENDING" },
      data: { status: "REJECTED", adminNote: parsed.data.note, processedAt: new Date() },
    });
    if (flip.count !== 1) return false;
    await tx.driverWallet.update({
      where: { id: wallet.id },
      data: { withdrawableBalance: { increment: wr.amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: wr.amount,
        type: "ADJUSTMENT",
        description: `Hoàn tiền rút: ${parsed.data.note}`,
      },
    });
    return true;
  });
  if (!done) return Errors.conflict("Yêu cầu đã được xử lý");

  const updated = await findWithdrawalById(params.id);

  void notify({
    userId: wr.driverProfile.userId,
    phone: wr.driverProfile.user.phone ?? undefined,
    event: "WITHDRAWAL_REJECTED",
    templateData: { reason: parsed.data.note },
  });

  return ok({ withdrawal: updated });
}

import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { ApproveWithdrawalSchema } from "@/validators/admin.validator";
import { findWithdrawalById, updateWithdrawal } from "@/repositories/wallet.repository";
import { notify } from "@/lib/notifications/notification.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = ApproveWithdrawalSchema.safeParse(body ?? {});
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const wr = await findWithdrawalById(params.id);
  if (!wr) return Errors.notFound();
  if (wr.status !== "PENDING") return Errors.conflict("Yêu cầu không ở trạng thái chờ");

  const updated = await updateWithdrawal(params.id, {
    status: "APPROVED",
    adminNote: parsed.data.note,
    processedAt: new Date(),
  });

  void notify({
    userId: wr.driverProfile.userId,
    phone: wr.driverProfile.user.phone ?? undefined,
    event: "WITHDRAWAL_APPROVED",
    templateData: { amount: String(wr.amount) },
  });

  return ok({ withdrawal: updated });
}

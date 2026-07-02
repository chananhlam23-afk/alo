import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { ManualRefundSchema } from "@/validators/admin.validator";
import { findPaymentsByTrip, markRefunded } from "@/repositories/payment.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = ManualRefundSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const payments = await findPaymentsByTrip(params.id);
  const paid = payments.find((p) => p.status === "PAID");
  if (!paid) return Errors.notFound("Không tìm thấy thanh toán đã hoàn tất");
  if (parsed.data.amount > paid.amount) {
    return Errors.validation("Số tiền hoàn không được vượt quá số tiền đã thanh toán");
  }

  const refunded = await markRefunded(paid.id, parsed.data.amount);
  return ok({ payment: refunded, reason: parsed.data.reason });
}

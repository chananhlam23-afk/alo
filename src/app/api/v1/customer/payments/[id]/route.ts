import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findPaymentById } from "@/repositories/payment.repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const payment = await findPaymentById(params.id);
  if (!payment) return Errors.notFound();
  if (payment.customerId !== auth.payload.userId) return Errors.forbidden();

  return ok({ payment });
}

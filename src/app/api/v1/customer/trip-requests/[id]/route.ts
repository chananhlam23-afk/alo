import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import {
  findRequestById,
  updateRequestStatus,
} from "@/repositories/trip-request.repository";
import { refundVoucherForRequest } from "@/repositories/voucher.repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const request = await findRequestById(params.id);
  if (!request) return Errors.notFound("Yêu cầu không tồn tại");
  if (request.customerId !== auth.payload.userId) return Errors.forbidden();

  return ok({ request });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const request = await findRequestById(params.id);
  if (!request) return Errors.notFound();
  if (request.customerId !== auth.payload.userId) return Errors.forbidden();
  if (!["PENDING"].includes(request.status)) {
    return Errors.conflict("Không thể hủy yêu cầu ở trạng thái này");
  }

  await updateRequestStatus(params.id, "CANCELLED");
  // Hoàn lại lượt voucher đã dùng cho yêu cầu này (best-effort).
  await refundVoucherForRequest(params.id).catch(() => {});
  return ok({ cancelled: true });
}

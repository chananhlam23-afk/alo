import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findWithdrawalById } from "@/repositories/wallet.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  const wr = await findWithdrawalById(params.id);
  if (!wr) return Errors.notFound();
  if (wr.driverProfileId !== driver.id) return Errors.forbidden();

  return ok({ withdrawalRequest: wr });
}

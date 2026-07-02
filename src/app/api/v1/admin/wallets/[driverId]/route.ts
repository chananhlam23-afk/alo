import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findWalletByDriver } from "@/repositories/wallet.repository";

export async function GET(req: NextRequest, { params }: { params: { driverId: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const wallet = await findWalletByDriver(params.driverId);
  if (!wallet) return Errors.notFound("Ví không tồn tại");

  return ok({ wallet });
}

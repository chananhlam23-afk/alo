import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { findWalletByDriver, ensureWallet } from "@/repositories/wallet.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const wallet = await ensureWallet(driver.id);
  const full = await findWalletByDriver(driver.id);

  const pendingReleases = (full?.transactions ?? [])
    .filter((t) => t.type === "TRIP_CREDIT" && !t.releasedAt && t.availableAt)
    .map((t) => ({ amount: t.amount, availableAt: t.availableAt }));

  return ok({
    withdrawableBalance: wallet.withdrawableBalance,
    pendingBalance: wallet.pendingBalance,
    transactions: full?.transactions ?? [],
    pendingReleases,
  });
}

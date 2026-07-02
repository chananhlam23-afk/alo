import { NextRequest } from "next/server";
import { z } from "zod";
import { created, ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { WithdrawalSchema } from "@/validators/driver.validator";
import { findDriverByUserId } from "@/repositories/driver.repository";
import {
  listWithdrawals,
  ensureWallet,
  createWithdrawalAtomic,
} from "@/repositories/wallet.repository";

const WithdrawalsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "DONE"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const parsed = WithdrawalsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const status = parsed.data.status;
  const [items, total] = await listWithdrawals({
    driverProfileId: driver.id,
    status,
    page: 1,
    limit: 50,
  });

  return ok({ items, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const body = await req.json().catch(() => null);
  const parsed = WithdrawalSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const wallet = await ensureWallet(driver.id);
  const withdrawal = await createWithdrawalAtomic({
    walletId: wallet.id,
    driverProfileId: driver.id,
    ...parsed.data,
  });
  if (!withdrawal) return Errors.conflict("Số dư không đủ");

  return created({ withdrawalRequest: withdrawal });
}

import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { EarningsQuerySchema } from "@/validators/driver.validator";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = EarningsQuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const wallet = await prisma.driverWallet.findUnique({
    where: { driverProfileId: driver.id },
  });

  if (!wallet) return ok({ items: [], total: 0 });

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      type: "TRIP_CREDIT",
      createdAt: {
        gte: new Date(parsed.data.from),
        lte: new Date(parsed.data.to),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok({ items: transactions, total: transactions.length });
}

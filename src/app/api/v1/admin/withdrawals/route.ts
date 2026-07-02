import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { listWithdrawals, withdrawalStats } from "@/repositories/wallet.repository";
import { ListQuerySchema } from "@/validators/admin.validator";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ListQuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const [[items, total], stats] = await Promise.all([
    listWithdrawals({
      status: parsed.data.status,
      search: parsed.data.search,
      page: parsed.data.page,
      limit: parsed.data.limit,
    }),
    withdrawalStats(),
  ]);

  return ok({ items, total, page: parsed.data.page, stats });
}

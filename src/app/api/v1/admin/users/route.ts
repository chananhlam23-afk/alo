import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { listUsers } from "@/repositories/user.repository";
import { ListQuerySchema } from "@/validators/admin.validator";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ListQuerySchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { items, total, stats } = await listUsers({
    page: parsed.data.page,
    limit: parsed.data.limit,
    status: parsed.data.status,
    role: parsed.data.role,
    search: parsed.data.search,
  });

  return ok({ items, total, page: parsed.data.page, stats });
}
